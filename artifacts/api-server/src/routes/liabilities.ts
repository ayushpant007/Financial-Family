import { Router, type Request, type Response } from "express";
import { db, liabilitiesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CreateClientLiabilityBody, UpdateClientLiabilityBody } from "@workspace/api-zod";
import { requireAdmin, requireAuth } from "../lib/auth";

const router = Router();

router.get("/clients/:clientId/liabilities", requireAuth, async (req: Request, res: Response) => {
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

  const liabilities = await db
    .select()
    .from(liabilitiesTable)
    .where(eq(liabilitiesTable.clientId, clientId))
    .orderBy(liabilitiesTable.createdAt);

  res.json(liabilities.map(l => ({
    id: l.id,
    clientId: l.clientId,
    familyMemberId: l.familyMemberId,
    loanType: l.loanType,
    lenderName: l.lenderName,
    totalLoanAmount: parseFloat(l.totalLoanAmount),
    outstandingAmount: parseFloat(l.outstandingAmount),
    interestRate: parseFloat(l.interestRate),
    emi: parseFloat(l.emi),
    startDate: l.startDate,
    endDate: l.endDate,
    notes: l.notes,
    createdAt: l.createdAt.toISOString(),
  })));
});

router.post("/clients/:clientId/liabilities", requireAuth, async (req: Request, res: Response) => {
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

  const parsed = CreateClientLiabilityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: parsed.error.issues });
    return;
  }

  const { loanType, lenderName, totalLoanAmount, outstandingAmount, interestRate, emi, startDate, endDate, notes, familyMemberId } = parsed.data as any;

  const [liability] = await db.insert(liabilitiesTable).values({
    clientId,
    familyMemberId: familyMemberId ?? null,
    loanType: loanType as any,
    lenderName,
    totalLoanAmount: totalLoanAmount.toString(),
    outstandingAmount: outstandingAmount.toString(),
    interestRate: interestRate.toString(),
    emi: emi.toString(),
    startDate: startDate ?? null,
    endDate: endDate ?? null,
    notes: notes ?? null,
  }).returning();

  res.status(201).json({
    id: liability.id,
    clientId: liability.clientId,
    familyMemberId: liability.familyMemberId,
    loanType: liability.loanType,
    lenderName: liability.lenderName,
    totalLoanAmount: parseFloat(liability.totalLoanAmount),
    outstandingAmount: parseFloat(liability.outstandingAmount),
    interestRate: parseFloat(liability.interestRate),
    emi: parseFloat(liability.emi),
    startDate: liability.startDate,
    endDate: liability.endDate,
    notes: liability.notes,
    createdAt: liability.createdAt.toISOString(),
  });
});

router.put("/clients/:clientId/liabilities/:liabilityId", requireAuth, async (req: Request, res: Response) => {
  const clientId = parseInt(req.params.clientId as string);
  const liabilityId = parseInt(req.params.liabilityId as string);
  if (isNaN(clientId) || isNaN(liabilityId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const session = (req as any).session;
  if (session.role === "client" && session.clientId !== clientId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const parsed = UpdateClientLiabilityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const [existing] = await db.select({ id: liabilitiesTable.id }).from(liabilitiesTable).where(and(eq(liabilitiesTable.id, liabilityId), eq(liabilitiesTable.clientId, clientId))).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Liability not found" });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.loanType !== undefined) updates.loanType = parsed.data.loanType;
  if (parsed.data.lenderName !== undefined) updates.lenderName = parsed.data.lenderName;
  if (parsed.data.totalLoanAmount !== undefined) updates.totalLoanAmount = parsed.data.totalLoanAmount.toString();
  if (parsed.data.outstandingAmount !== undefined) updates.outstandingAmount = parsed.data.outstandingAmount.toString();
  if (parsed.data.interestRate !== undefined) updates.interestRate = parsed.data.interestRate.toString();
  if (parsed.data.emi !== undefined) updates.emi = parsed.data.emi.toString();
  if (parsed.data.startDate !== undefined) updates.startDate = parsed.data.startDate;
  if (parsed.data.endDate !== undefined) updates.endDate = parsed.data.endDate;
  if ((parsed.data as any).notes !== undefined) updates.notes = (parsed.data as any).notes;
  if ((parsed.data as any).familyMemberId !== undefined) updates.familyMemberId = (parsed.data as any).familyMemberId;

  const [updated] = await db.update(liabilitiesTable).set(updates as any).where(eq(liabilitiesTable.id, liabilityId)).returning();

  res.json({
    id: updated.id,
    clientId: updated.clientId,
    familyMemberId: updated.familyMemberId,
    loanType: updated.loanType,
    lenderName: updated.lenderName,
    totalLoanAmount: parseFloat(updated.totalLoanAmount),
    outstandingAmount: parseFloat(updated.outstandingAmount),
    interestRate: parseFloat(updated.interestRate),
    emi: parseFloat(updated.emi),
    startDate: updated.startDate,
    endDate: updated.endDate,
    notes: updated.notes,
    createdAt: updated.createdAt.toISOString(),
  });
});

router.delete("/clients/:clientId/liabilities/:liabilityId", requireAuth, async (req: Request, res: Response) => {
  const clientId = parseInt(req.params.clientId as string);
  const liabilityId = parseInt(req.params.liabilityId as string);
  if (isNaN(clientId) || isNaN(liabilityId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const session = (req as any).session;
  if (session.role === "client" && session.clientId !== clientId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const [existing] = await db.select({ id: liabilitiesTable.id }).from(liabilitiesTable).where(and(eq(liabilitiesTable.id, liabilityId), eq(liabilitiesTable.clientId, clientId))).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Liability not found" });
    return;
  }

  await db.delete(liabilitiesTable).where(eq(liabilitiesTable.id, liabilityId));
  res.json({ success: true, message: "Liability deleted" });
});

export default router;
