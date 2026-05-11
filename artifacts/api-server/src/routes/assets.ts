import { Router } from "express";
import { db, assetsTable, clientsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CreateClientAssetBody, UpdateClientAssetBody } from "@workspace/api-zod";
import { requireAdmin, requireAuth } from "../lib/auth";

const router = Router();

function yearsElapsed(startDateStr: string, endDateStr?: string): number {
  const start = new Date(startDateStr);
  const end = endDateStr ? new Date(endDateStr) : new Date();
  const cap = endDateStr ? new Date(endDateStr) : null;
  const effective = cap && new Date() > cap ? cap : new Date();
  const ms = effective.getTime() - start.getTime();
  return Math.max(0, ms / (1000 * 60 * 60 * 24 * 365.25));
}

function calculateIndianRDValue(M: number, r_percent: number, months: number): number {
  if (months <= 0) return 0;
  const i_q = r_percent / 400; 
  const i_eff = Math.pow(1 + i_q, 1/3) - 1; 
  const total = M * (Math.pow(1 + i_eff, months) - 1) / i_eff * (1 + i_eff);
  return total;
}

function monthsElapsed(startDateStr: string, maxMonths?: number): number {
  const start = new Date(startDateStr);
  const now = new Date();
  const months =
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  const capped = maxMonths !== undefined ? Math.min(months, maxMonths) : months;
  return Math.max(0, capped);
}

function calculateAnnuity(P: number, r: number, t: number): number {
  if (r <= 0) return P * t;
  // Annuity Due (deposit at beginning of year) - Matching standard PPF calculators
  return P * (Math.pow(1 + r, t) - 1) / r * (1 + r);
}

function computeAssetValue(assetType: string, data: Record<string, unknown>): number {
  switch (assetType) {
    case "mutual_fund":
    case "stock": {
      const units = Number(data.units ?? 0);
      const price = Number(data.price ?? 0);
      const amount = Number(data.amount ?? 0);
      return amount > 0 ? amount : units * price;
    }
    case "fixed_deposit": {
      const P = Number(data.investmentAmount ?? 0);
      const R = Number(data.interestRate ?? 0) / 100;
      const start = String(data.startDate ?? "");
      const maturity = String(data.maturityDate ?? "");
      if (!start) return P;
      const T = yearsElapsed(start, maturity || undefined);
      
      const payoutType = String(data.payoutType ?? "Cumulative");
      let n_freq = 1;
      if (payoutType === "Monthly") n_freq = 12;
      else if (payoutType === "Quarterly") n_freq = 4;
      
      return P * Math.pow(1 + R / n_freq, n_freq * T);
    }
    case "recurring_deposit": {
      const M = Number(data.monthlyInvestment ?? 0);
      const rate = Number(data.interestRate ?? 0);
      const start = String(data.startDate ?? "");
      const maturity = String(data.maturityDate ?? "");
 
      let tenureMonths = 0;
      if (start && maturity) {
        const d1 = new Date(start);
        const d2 = new Date(maturity);
        tenureMonths = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
      } else {
        tenureMonths = Number(data.tenure ?? 0);
      }
 
      const n_months_passed = start ? monthsElapsed(start, tenureMonths || undefined) : tenureMonths;
      const n_installments = Math.min(n_months_passed + 1, tenureMonths);
      
      const accruedOnPassed = calculateIndianRDValue(M, rate, n_months_passed);
      const currentInstallment = (n_installments > n_months_passed) ? M : 0;
      return accruedOnPassed + currentInstallment;
    }
    case "provident_fund": {
      const principal = parseFloat(String(data.totalContribution ?? "0")) || 0;
      const rate = parseFloat(String(data.interestRate ?? "0")) || 0;
      const startDateStr = String(data.startDate ?? data.startYear ?? "");
      const maturityDateStr = String(data.maturityDate ?? "");
      
      let startYear = new Date().getFullYear();
      if (startDateStr) {
        const d = new Date(startDateStr);
        if (!isNaN(d.getTime())) {
          startYear = d.getFullYear();
        } else {
          const num = parseInt(startDateStr);
          if (!isNaN(num)) startYear = num;
        }
      }
      
      const R = rate / 100;
      const accountType = String(data.accountType ?? "PPF");

      let projectionYears = 15;
      if (data.tenureYears) {
        projectionYears = parseInt(String(data.tenureYears)) || 15;
      } else if (startDateStr && maturityDateStr) {
        const d1 = new Date(startDateStr);
        const d2 = new Date(maturityDateStr);
        const diff = d2.getFullYear() - d1.getFullYear();
        if (diff > 0) projectionYears = diff;
      }

      const T_raw = Math.max(0, new Date().getFullYear() - startYear + 1);
      const T = Math.min(T_raw, projectionYears);

      if (accountType === "EPF" && data.basicSalary) {
        let balance = parseFloat(String(data.currentBalance)) || 0;
        let basic = parseFloat(String(data.basicSalary)) || 0;
        let da = parseFloat(String(data.dearnessAllowance)) || 0;
        let monthlyBasic = basic + da;
        const contribPct = (parseFloat(String(data.employeeContributionPercent)) || 12) / 100;
        const growth = (parseFloat(String(data.salaryGrowth)) || 0) / 100;
        const mRate = R / 12;

        for (let t = 1; t <= T; t++) {
          for (let m = 1; m <= 12; m++) {
            const empContrib = monthlyBasic * contribPct;
            const employerContrib = monthlyBasic * contribPct;
            const monthlyTotal = empContrib + employerContrib;
            balance = (balance + monthlyTotal) * (1 + mRate);
          }
          monthlyBasic *= (1 + growth);
        }
        return isNaN(balance) ? 0 : balance;
      } else {
        const val = calculateAnnuity(principal, R, T);
        console.log(`[PF] P:${principal}, rate:${rate}, startYear:${startYear}, T:${T}, Result:${val}`);
        return isNaN(val) ? 0 : val;
      }
    }
    case "cash_bank":
      return Number(data.currentBalance ?? 0);
    default:
      return 0;
  }
}

router.get("/clients/:clientId/assets", requireAuth, async (req, res) => {
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

  const assets = await db
    .select()
    .from(assetsTable)
    .where(eq(assetsTable.clientId, clientId))
    .orderBy(assetsTable.createdAt);

  res.json(assets.map(a => ({
    id: a.id,
    clientId: a.clientId,
    familyMemberId: a.familyMemberId,
    assetType: a.assetType,
    data: a.data,
    value: parseFloat(a.value),
    createdAt: a.createdAt.toISOString(),
  })));
});

router.post("/clients/:clientId/assets", requireAuth, async (req, res) => {
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

  const parsed = CreateClientAssetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: parsed.error.issues });
    return;
  }

  const { assetType, data } = parsed.data;
  console.log(`Incoming ${assetType} data:`, data);
  const value = computeAssetValue(assetType, data as Record<string, unknown>);
  
  if (isNaN(value) || !isFinite(value)) {
    console.error("Computed asset value is invalid:", { assetType, data, value });
    res.status(400).json({ error: "Calculated value is invalid. Please check your inputs (contribution, rate, date)." });
    return;
  }

  console.log(`Inserting ${assetType} for client ${clientId} with value ${value}`);

  const [asset] = await db.insert(assetsTable).values({
    clientId,
    familyMemberId: parsed.data.familyMemberId ?? null,
    assetType: assetType as any,
    data: data as any,
    value: value.toFixed(2),
  }).returning();

  res.status(201).json({
    id: asset.id,
    clientId: asset.clientId,
    familyMemberId: asset.familyMemberId,
    assetType: asset.assetType,
    data: asset.data,
    value: parseFloat(asset.value),
    createdAt: asset.createdAt.toISOString(),
  });
});

router.put("/clients/:clientId/assets/:assetId", requireAuth, async (req, res) => {
  const clientId = parseInt(req.params.clientId as string);
  const assetId = parseInt(req.params.assetId as string);
  if (isNaN(clientId) || isNaN(assetId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const session = (req as any).session;
  if (session.role === "client" && session.clientId !== clientId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const parsed = UpdateClientAssetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const [existing] = await db.select().from(assetsTable).where(and(eq(assetsTable.id, assetId), eq(assetsTable.clientId, clientId))).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Asset not found" });
    return;
  }

  const newData = { ...(existing.data as object), ...(parsed.data.data as object) };
  const value = computeAssetValue(existing.assetType, newData as Record<string, unknown>);

  if (isNaN(value)) {
    console.error("Computed asset value is NaN on update:", { type: existing.assetType, newData });
    res.status(400).json({ error: "Calculated value is invalid (NaN). Please check your inputs." });
    return;
  }

  const [updated] = await db.update(assetsTable).set({
    data: newData as any,
    value: value.toFixed(2),
    familyMemberId: parsed.data.familyMemberId !== undefined ? parsed.data.familyMemberId : existing.familyMemberId,
  }).where(eq(assetsTable.id, assetId)).returning();

  res.json({
    id: updated.id,
    clientId: updated.clientId,
    familyMemberId: updated.familyMemberId,
    assetType: updated.assetType,
    data: updated.data,
    value: parseFloat(updated.value),
    createdAt: updated.createdAt.toISOString(),
  });
});

router.delete("/clients/:clientId/assets/:assetId", requireAuth, async (req, res) => {
  const clientId = parseInt(req.params.clientId as string);
  const assetId = parseInt(req.params.assetId as string);
  if (isNaN(clientId) || isNaN(assetId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const session = (req as any).session;
  if (session.role === "client" && session.clientId !== clientId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const [existing] = await db.select({ id: assetsTable.id }).from(assetsTable).where(and(eq(assetsTable.id, assetId), eq(assetsTable.clientId, clientId))).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Asset not found" });
    return;
  }

  await db.delete(assetsTable).where(eq(assetsTable.id, assetId));
  res.json({ success: true, message: "Asset deleted" });
});

export default router;
