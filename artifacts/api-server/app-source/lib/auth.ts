import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db, sessionsTable } from "@workspace/db";
import { eq, lt } from "drizzle-orm";

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
const SESSION_RENEW_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;
const BCRYPT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // bcrypt hash
  if (hash.startsWith("$2")) {
    return bcrypt.compare(password, hash);
  }
  // argon2 hash — treat as invalid, user must reset password
  if (hash.startsWith("$argon2")) {
    return false;
  }
  // legacy HMAC-SHA256 fallback
  const SESSION_SECRET = process.env.SESSION_SECRET || "fallback-secret";
  const hmac = crypto.createHmac("sha256", SESSION_SECRET).update(password).digest("hex");
  return hmac === hash;
}

export async function hashMpin(mpin: string): Promise<string> {
  return bcrypt.hash(mpin, BCRYPT_ROUNDS);
}

export async function verifyMpin(hash: string, mpin: string): Promise<boolean> {
  if (hash.startsWith("$2")) {
    return bcrypt.compare(mpin, hash);
  }
  // argon2 MPIN — no longer verifiable, needs reset
  if (hash.startsWith("$argon2")) {
    return false;
  }
  return false;
}

export async function createSession(
  userId: number,
  role: string,
  clientId: number | null,
  name: string,
  username: string,
): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.insert(sessionsTable).values({
    token,
    userId,
    role,
    clientId,
    name,
    username,
    expiresAt,
  });

  return token;
}

export async function getSession(token: string): Promise<any> {
  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.token, token))
    .limit(1);

  if (!session) return null;

  if (session.expiresAt < new Date()) {
    await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
    return null;
  }

  const timeLeft = session.expiresAt.getTime() - Date.now();
  if (timeLeft < SESSION_RENEW_THRESHOLD_MS) {
    const newExpiresAt = new Date(Date.now() + SESSION_DURATION_MS);
    await db
      .update(sessionsTable)
      .set({ expiresAt: newExpiresAt })
      .where(eq(sessionsTable.token, token));
    session.expiresAt = newExpiresAt;
  }

  return session;
}

export async function deleteSession(token: string): Promise<void> {
  await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
}

export async function cleanExpiredSessions(): Promise<void> {
  await db.delete(sessionsTable).where(lt(sessionsTable.expiresAt, new Date()));
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.session;
  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const session = await getSession(token);
  if (!session) {
    res.status(401).json({ error: "Invalid or expired session" });
    return;
  }
  (req as any).session = session;
  (req as any).userId = session.userId;
  next();
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.session;
  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const session = await getSession(token);
  if (!session) {
    res.status(401).json({ error: "Invalid or expired session" });
    return;
  }
  if (session.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  (req as any).session = session;
  (req as any).userId = session.userId;
  next();
}
