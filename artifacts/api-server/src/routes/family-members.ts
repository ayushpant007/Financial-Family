import { Router } from "express";
import { db, familyMembersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CreateFamilyMemberBody, UpdateFamilyMemberBody } from "@workspace/api-zod";
import { requireAdmin, requireAuth } from "../lib/auth";

const router = Router();

router.get("/clients/:clientId/family-members", requireAuth, async (req, res) => {
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

  const members = await db
    .select()
    .from(familyMembersTable)
    .where(eq(familyMembersTable.clientId, clientId))
    .orderBy(familyMembersTable.createdAt);

  res.json(members.map(m => ({
    ...m,
    createdAt: m.createdAt.toISOString()
  })));
});

router.post("/clients/:clientId/family-members", requireAuth, async (req, res) => {
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

  const parsed = CreateFamilyMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: parsed.error.issues });
    return;
  }

  const [member] = await db.insert(familyMembersTable).values({
    clientId,
    name: parsed.data.name,
    dob: parsed.data.dob ?? null,
    phone: parsed.data.phone ?? null,
    relation: parsed.data.relation,
  }).returning();

  res.status(201).json({
    ...member,
    createdAt: member.createdAt.toISOString()
  });
});

router.put("/clients/:clientId/family-members/:familyMemberId", requireAuth, async (req, res) => {
  const clientId = parseInt(req.params.clientId as string);
  const familyMemberId = parseInt(req.params.familyMemberId as string);
  if (isNaN(clientId) || isNaN(familyMemberId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const session = (req as any).session;
  if (session.role === "client" && session.clientId !== clientId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const parsed = UpdateFamilyMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const [updated] = await db
    .update(familyMembersTable)
    .set({
      name: parsed.data.name,
      dob: parsed.data.dob,
      phone: parsed.data.phone,
      relation: parsed.data.relation,
    })
    .where(and(eq(familyMembersTable.id, familyMemberId), eq(familyMembersTable.clientId, clientId)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Family member not found" });
    return;
  }

  res.json({
    ...updated,
    createdAt: updated.createdAt.toISOString()
  });
});

router.delete("/clients/:clientId/family-members/:familyMemberId", requireAuth, async (req, res) => {
  const clientId = parseInt(req.params.clientId as string);
  const familyMemberId = parseInt(req.params.familyMemberId as string);
  if (isNaN(clientId) || isNaN(familyMemberId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const session = (req as any).session;
  if (session.role === "client" && session.clientId !== clientId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const [deleted] = await db
    .delete(familyMembersTable)
    .where(and(eq(familyMembersTable.id, familyMemberId), eq(familyMembersTable.clientId, clientId)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Family member not found" });
    return;
  }

  res.json({ success: true, message: "Family member deleted" });
});

export default router;
