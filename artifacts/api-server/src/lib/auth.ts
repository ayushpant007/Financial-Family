import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import argon2 from "argon2";
import { db, sessionsTable } from "@workspace/db";
import { eq, lt } from "drizzle-orm";

const SESSION_SECRET = process.env.SESSION_SECRET || "fallback-secret";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
const SESSION_RENEW_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

export function hashPassword(password: string): string {
  return crypto.createHmac("sha256", SESSION_SECRET).update(password).digest("hex");
}

export async function hashMpin(mpin: string): string {
  return argon2.hash(mpin);
}

export async function verifyMpin(hash: string, mpin: string): Promise<boolean> {
  return argon2.verify(hash, mpin);
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

export async function getSession(token: string) {
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

export async function deleteSession(token: string) {
  await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
}

export async function cleanExpiredSessions() {
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
