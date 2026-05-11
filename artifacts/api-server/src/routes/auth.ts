import { Router } from "express";
import { db, usersTable, userSecurityTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { LoginBody } from "@workspace/api-zod";
import { hashPassword, hashMpin, verifyMpin, createSession, deleteSession, requireAuth } from "../lib/auth";

const router = Router();

router.post("/auth/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { username, password } = parsed.data;
  const normalizedUsername = username.toLowerCase();

  const [user] = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      role: usersTable.role,
      name: usersTable.name,
      createdAt: usersTable.createdAt,
      passwordHash: usersTable.passwordHash,
    })
    .from(usersTable)
    .where(eq(usersTable.username, normalizedUsername))
    .limit(1);

  if (!user || user.passwordHash !== hashPassword(password)) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  let clientId: number | null = null;
  if (user.role === "client") {
    const { clientsTable } = await import("@workspace/db");
    const [client] = await db
      .select({ id: clientsTable.id })
      .from(clientsTable)
      .where(eq(clientsTable.userId, user.id))
      .limit(1);
    clientId = client?.id ?? null;
  }

  const token = await createSession(user.id, user.role, clientId, user.name, user.username);

  res.cookie("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  res.json({
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      clientId,
    },
    message: "Login successful",
  });
});

router.post("/auth/logout", async (req, res) => {
  const token = req.cookies?.session;
  if (token) await deleteSession(token);
  res.clearCookie("session");
  res.json({ success: true, message: "Logged out" });
});

router.get("/auth/me", requireAuth, async (req, res) => {
  const session = (req as any).session;
  
  // Fetch user security info to check if MPIN is set
  const [security] = await db.select({ mpinHash: userSecurityTable.mpinHash })
    .from(userSecurityTable)
    .where(eq(userSecurityTable.userId, session.userId))
    .limit(1);

  res.json({
    id: session.userId,
    username: session.username,
    role: session.role,
    name: session.name,
    clientId: session.clientId,
    hasMpin: !!security?.mpinHash,
  });
});

router.post("/auth/mpin", requireAuth, async (req, res) => {
  const { mpin } = req.body;
  if (!mpin || typeof mpin !== "string" || mpin.length !== 6) {
    res.status(400).json({ error: "Invalid MPIN. Must be exactly 6 digits." });
    return;
  }

  const userId = (req as any).userId;
  const mpinHash = await hashMpin(mpin);

  // Upsert user security
  const [existing] = await db.select()
    .from(userSecurityTable)
    .where(eq(userSecurityTable.userId, userId))
    .limit(1);

  if (existing) {
    await db.update(userSecurityTable)
      .set({ 
        mpinHash, 
        lastChangedAt: new Date(),
        failedAttempts: 0,
        lockedUntil: null 
      })
      .where(eq(userSecurityTable.userId, userId));
  } else {
    await db.insert(userSecurityTable).values({
      userId,
      mpinHash,
    });
  }

  res.json({ success: true, message: "MPIN set successfully" });
});

router.post("/auth/verify-mpin", requireAuth, async (req, res) => {
  const { mpin } = req.body;
  const userId = (req as any).userId;

  const [security] = await db.select()
    .from(userSecurityTable)
    .where(eq(userSecurityTable.userId, userId))
    .limit(1);

  if (!security?.mpinHash) {
    res.status(400).json({ error: "MPIN not set" });
    return;
  }

  // Check if locked
  if (security.lockedUntil && security.lockedUntil > new Date()) {
    const minutesLeft = Math.ceil((security.lockedUntil.getTime() - Date.now()) / 60000);
    res.status(403).json({ 
      error: `Too many failed attempts. Try again in ${minutesLeft} minutes.` 
    });
    return;
  }

  const isValid = await verifyMpin(security.mpinHash, mpin);

  if (!isValid) {
    const attempts = security.failedAttempts + 1;
    let lockedUntil: Date | null = null;
    
    if (attempts >= 5) {
      lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
    } else if (attempts >= 3) {
      lockedUntil = new Date(Date.now() + 5 * 60 * 1000); // 5 mins
    }

    await db.update(userSecurityTable)
      .set({ 
        failedAttempts: attempts,
        lockedUntil 
      })
      .where(eq(userSecurityTable.userId, userId));

    const remaining = 5 - attempts;
    res.status(401).json({ 
      error: `Invalid MPIN. ${remaining > 0 ? `${remaining} attempts remaining.` : 'Account locked for 15 minutes.'}` 
    });
    return;
  }

  // Success: reset attempts
  await db.update(userSecurityTable)
    .set({ failedAttempts: 0, lockedUntil: null })
    .where(eq(userSecurityTable.userId, userId));

  res.json({ success: true });
});

export default router;
