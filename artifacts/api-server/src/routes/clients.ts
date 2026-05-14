import { Router, type Request, type Response } from "express";
import { db, usersTable, clientsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateClientBody, UpdateClientBody } from "@workspace/api-zod";
import { requireAdmin, requireAuth, hashPassword, createSession } from "../lib/auth";

const router = Router();

router.get("/clients", requireAdmin, async (req: Request, res: Response) => {
  const clients = await db
    .select({
      id: clientsTable.id,
      name: clientsTable.name,
      email: clientsTable.email,
      phone: clientsTable.phone,
      username: usersTable.username,
      createdAt: clientsTable.createdAt,
    })
    .from(clientsTable)
    .innerJoin(usersTable, eq(clientsTable.userId, usersTable.id))
    .orderBy(clientsTable.createdAt);

  res.json(clients.map(c => ({ ...c, createdAt: c.createdAt.toISOString() })));
});

router.post("/clients", requireAdmin, async (req: Request, res: Response) => {
  const parsed = CreateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: parsed.error.issues });
    return;
  }
  const { name, email, phone, username, password } = parsed.data;

  const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.username, username)).limit(1);
  if (existing.length > 0) {
    res.status(400).json({ error: "Username already taken" });
    return;
  }

  const [user] = await db.insert(usersTable).values({
    username,
    passwordHash: await hashPassword(password),
    role: "client",
    name,
  }).returning();

  const [client] = await db.insert(clientsTable).values({
    userId: user.id,
    name,
    email: email ?? null,
    phone: phone ?? null,
  }).returning();

  res.status(201).json({
    id: client.id,
    name: client.name,
    email: client.email,
    phone: client.phone,
    username: user.username,
    createdAt: client.createdAt.toISOString(),
  });
});

router.get("/clients/:clientId", requireAuth, async (req: Request, res: Response) => {
  const clientId = parseInt(req.params.clientId as string);
  if (isNaN(clientId)) {
    res.status(400).json({ error: "Invalid client ID" });
    return;
  }

  const session = (req as any).session;
  if (session.role === "client" && session.clientId !== clientId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const [client] = await db
    .select({
      id: clientsTable.id,
      name: clientsTable.name,
      email: clientsTable.email,
      phone: clientsTable.phone,
      username: usersTable.username,
      createdAt: clientsTable.createdAt,
    })
    .from(clientsTable)
    .innerJoin(usersTable, eq(clientsTable.userId, usersTable.id))
    .where(eq(clientsTable.id, clientId))
    .limit(1);

  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  res.json({ ...client, createdAt: client.createdAt.toISOString() });
});

router.put("/clients/:clientId", requireAdmin, async (req: Request, res: Response) => {
  const clientId = parseInt(req.params.clientId as string);
  if (isNaN(clientId)) {
    res.status(400).json({ error: "Invalid client ID" });
    return;
  }

  const parsed = UpdateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.email !== undefined) updates.email = parsed.data.email;
  if (parsed.data.phone !== undefined) updates.phone = parsed.data.phone;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  const [updated] = await db
    .update(clientsTable)
    .set(updates)
    .where(eq(clientsTable.id, clientId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  const [user] = await db.select({ username: usersTable.username }).from(usersTable).where(eq(usersTable.id, updated.userId)).limit(1);

  res.json({
    id: updated.id,
    name: updated.name,
    email: updated.email,
    phone: updated.phone,
    username: user?.username ?? "",
    createdAt: updated.createdAt.toISOString(),
  });
});

router.delete("/clients/:clientId", requireAdmin, async (req: Request, res: Response) => {
  const clientId = parseInt(req.params.clientId as string);
  if (isNaN(clientId)) {
    res.status(400).json({ error: "Invalid client ID" });
    return;
  }

  const [client] = await db.select({ userId: clientsTable.userId }).from(clientsTable).where(eq(clientsTable.id, clientId)).limit(1);
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  await db.delete(clientsTable).where(eq(clientsTable.id, clientId));
  await db.delete(usersTable).where(eq(usersTable.id, client.userId));

  res.json({ success: true, message: "Client deleted" });
});

export default router;
