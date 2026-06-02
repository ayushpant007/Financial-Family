import { Router, type Request, type Response } from "express";
import { db, usersTable, clientsTable, familyMembersTable, assetsTable, liabilitiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateClientBody, UpdateClientBody } from "@workspace/api-zod";
import { requireAdmin, requireAuth, hashPassword, createSession } from "../lib/auth";
import * as XLSX from "xlsx";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

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

// Helper functions for asset valuations and projections in reports
function monthsElapsed(startDateStr: string, maxMonths?: number): number {
  const start = new Date(startDateStr);
  const now = new Date();
  const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  const capped = maxMonths !== undefined ? Math.min(months, maxMonths) : months;
  return Math.max(0, capped);
}

function yearsElapsed(startDateStr: string, endDateStr?: string): number {
  const start = new Date(startDateStr);
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

function calculateAnnuity(P: number, r: number, t: number): number {
  if (r <= 0) return P * t;
  return P * (Math.pow(1 + r, t) - 1) / r * (1 + r);
}

function calculatePFCurrentValue(data: any) {
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

    let invested = 0;
    for (let t = 1; t <= T; t++) {
      for (let m = 1; m <= 12; m++) {
        const empContrib = monthlyBasic * contribPct;
        const employerContrib = monthlyBasic * contribPct;
        invested += empContrib + employerContrib;
        balance = (balance + empContrib + employerContrib) * (1 + mRate);
      }
      monthlyBasic *= (1 + growth);
    }
    return { totalInvested: invested, currentValue: balance };
  } else {
    const val = calculateAnnuity(principal, R, T);
    return { totalInvested: principal * T, currentValue: val };
  }
}

const getAssetCurrentAndInvested = (asset: any) => {
  const data = asset.data as any;
  let invested = 0;
  let current = 0;

  if (asset.assetType === "mutual_fund") {
    const method = data.investmentMethod;
    if (!method || method === "Lump sum") {
      invested = parseFloat(data.amount || "0");
      current = parseFloat(asset.value) || invested;
    } else if (method === "SIP") {
      const P = parseFloat(data.monthlyInvestment || "0") || 0;
      const start = data.startDate;
      const tenureYears = parseFloat(data.tenureYears || "1") || 1;
      const n_passed = start ? monthsElapsed(start, tenureYears * 12) : 0;
      invested = P * n_passed;
      const r = Math.pow(1 + (parseFloat(data.interestRate) || 0) / 100, 1 / 12) - 1;
      current = r > 0 ? P * (Math.pow(1 + r, n_passed) - 1) / r * (1 + r) : invested;
    } else if (method === "SWP") {
      invested = parseFloat(data.investmentAmount || "0") || 0;
      const W = parseFloat(data.monthlyWithdrawal || "0") || 0;
      const start = data.startDate;
      const tenureYears = parseFloat(data.tenureYears || "1") || 1;
      const n_passed = start ? monthsElapsed(start, tenureYears * 12) : 0;
      const r = Math.pow(1 + (parseFloat(data.interestRate) || 0) / 100, 1 / 12) - 1;
      current = r > 0 ? Math.max(0, invested * Math.pow(1 + r, n_passed) - W * (Math.pow(1 + r, n_passed) - 1) / r) : Math.max(0, invested - W * n_passed);
    } else if (method === "STP") {
      invested = parseFloat(data.investmentAmount || "0") || 0;
      const T_val = parseFloat(data.monthlyTransfer || "0") || 0;
      const start = data.startDate;
      const tenureYears = parseFloat(data.tenureYears || "1") || 1;
      const n_passed = start ? monthsElapsed(start, tenureYears * 12) : 0;
      const rS = Math.pow(1 + (parseFloat(data.interestRate) || 0) / 100, 1 / 12) - 1;
      const rT = Math.pow(1 + (parseFloat(data.targetInterestRate) || 0) / 100, 1 / 12) - 1;
      const sourceVal = rS > 0 ? Math.max(0, invested * Math.pow(1 + rS, n_passed) - T_val * (Math.pow(1 + rS, n_passed) - 1) / rS) : Math.max(0, invested - T_val * n_passed);
      const targetVal = rT > 0 ? T_val * (Math.pow(1 + rT, n_passed) - 1) / rT * (1 + rT) : T_val * n_passed;
      current = sourceVal + targetVal;
    }
  } else if (asset.assetType === "stock") {
    invested = parseFloat(data.amount || "0");
    current = parseFloat(asset.value) || invested;
  } else if (asset.assetType === "fixed_deposit") {
    invested = parseFloat(data.investmentAmount || "0");
    const P = invested;
    const R = (parseFloat(data.interestRate || "0")) / 100;
    const T = yearsElapsed(data.startDate || "", data.maturityDate || undefined);
    const payoutType = data.payoutType ?? "Cumulative";
    let n_freq = 1;
    if (payoutType === "Monthly") n_freq = 12;
    else if (payoutType === "Quarterly") n_freq = 4;
    current = P * Math.pow(1 + R / n_freq, n_freq * T);
  } else if (asset.assetType === "recurring_deposit") {
    const monthly = parseFloat(data.monthlyInvestment || "0");
    let tenureMonths = 0;
    if (data.startDate && data.maturityDate) {
      const d1 = new Date(data.startDate);
      const d2 = new Date(data.maturityDate);
      tenureMonths = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
    } else {
      tenureMonths = parseFloat(data.tenure || "0");
    }
    const n_months_passed = data.startDate ? monthsElapsed(data.startDate, tenureMonths || undefined) : tenureMonths;
    const n_installments = Math.min(n_months_passed + 1, tenureMonths);
    invested = monthly * n_installments;
    
    const i_q = (parseFloat(data.interestRate || "0")) / 400;
    const i_eff = Math.pow(1 + i_q, 1/3) - 1;
    const accruedOnPassed = n_months_passed > 0 ? monthly * (Math.pow(1 + i_eff, n_months_passed) - 1) / i_eff * (1 + i_eff) : 0;
    const currentInstallment = (n_installments > n_months_passed) ? monthly : 0;
    current = accruedOnPassed + currentInstallment;
  } else if (asset.assetType === "provident_fund") {
    const pf = calculatePFCurrentValue(data);
    invested = pf.totalInvested;
    current = pf.currentValue;
  } else if (asset.assetType === "cash_bank") {
    invested = parseFloat(data.amount || data.currentBalance || "0");
    current = parseFloat(asset.value) || invested;
  } else {
    invested = parseFloat(asset.value) || 0;
    current = parseFloat(asset.value) || 0;
  }

  return { invested, current };
}

function parseAmfiDate(dateStr: string): Date {
  const [dd, mm, yyyy] = dateStr.split("-");
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
}

function deduplicateByMonth(history: { date: string; nav: number }[]) {
  const seen = new Set<string>();
  const result: { date: string; nav: number; isoMonth: string }[] = [];
  for (const row of history) {
    const d = parseAmfiDate(row.date);
    if (isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push({ ...row, isoMonth: key });
    }
  }
  return result;
}

function generateFutureProjection(
  currentNAV: number,
  units: number,
  annualReturnPct: number,
  futureMonths: number,
  afterDate: Date
): { month: number; dateStr: string; nav: number; portfolioValue: number }[] {
  const r = Math.pow(1 + annualReturnPct / 100, 1 / 12) - 1;
  const rows = [];
  for (let i = 1; i <= futureMonths; i++) {
    const d = new Date(afterDate.getFullYear(), afterDate.getMonth() + i, 1);
    const projNav = currentNAV * Math.pow(1 + r, i);
    rows.push({
      month: i,
      dateStr: d.toLocaleDateString("en-IN", { month: "short", year: "numeric" }),
      nav: projNav,
      portfolioValue: projNav * units,
    });
  }
  return rows;
}

async function fetchMFHistory(schemeCode: string): Promise<{ date: string; nav: number }[]> {
  try {
    const res = await fetch(`https://api.mfapi.in/mf/${schemeCode}`);
    if (!res.ok) return [];
    const json: any = await res.json();
    if (json.status !== "SUCCESS" || !json.data?.length) return [];
    return json.data.map((d: any) => ({
      date: d.date,
      nav: parseFloat(d.nav) || 0,
    }));
  } catch (err) {
    console.error(`Failed to fetch NAV history for ${schemeCode}:`, err);
    return [];
  }
}

const ASSET_LABELS: Record<string, string> = {
  mutual_fund: "Mutual Fund",
  stock: "Stock",
  fixed_deposit: "Fixed Deposit",
  recurring_deposit: "Recurring Deposit",
  provident_fund: "Provident Fund",
  cash_bank: "Cash & Bank",
};

const LOAN_LABELS: Record<string, string> = {
  home_loan: "Home Loan",
  car_loan: "Car Loan",
  personal_loan: "Personal Loan",
  education_loan: "Education Loan",
  business_loan: "Business Loan",
  other: "Other",
};

router.get("/clients/:clientId/report", requireAuth, async (req: Request, res: Response) => {
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

  try {
    // 1. Fetch client info
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

    // 2. Fetch family members
    const familyMembers = await db
      .select()
      .from(familyMembersTable)
      .where(eq(familyMembersTable.clientId, clientId))
      .orderBy(familyMembersTable.createdAt);

    // 3. Fetch assets
    const assets = await db
      .select()
      .from(assetsTable)
      .where(eq(assetsTable.clientId, clientId))
      .orderBy(assetsTable.createdAt);

    // 4. Fetch liabilities
    const liabilities = await db
      .select()
      .from(liabilitiesTable)
      .where(eq(liabilitiesTable.clientId, clientId))
      .orderBy(liabilitiesTable.createdAt);

    // Compute metrics
    let clientAssetsVal = 0;
    let clientLiabsVal = 0;
    let familyAssetsVal = 0;
    let familyLiabsVal = 0;

    const assetBreakdown: Record<string, number> = {
      mutual_fund: 0,
      stock: 0,
      fixed_deposit: 0,
      recurring_deposit: 0,
      provident_fund: 0,
      cash_bank: 0,
    };

    for (const asset of assets) {
      const vals = getAssetCurrentAndInvested(asset);
      const isClient = asset.familyMemberId === null;
      if (isClient) {
        clientAssetsVal += vals.current;
      }
      familyAssetsVal += vals.current;
      
      const type = asset.assetType;
      if (type in assetBreakdown) {
        assetBreakdown[type] += vals.current;
      }
    }

    for (const liab of liabilities) {
      const isClient = liab.familyMemberId === null;
      const amount = parseFloat(liab.outstandingAmount) || 0;
      if (isClient) {
        clientLiabsVal += amount;
      }
      familyLiabsVal += amount;
    }

    const clientNetWorth = clientAssetsVal - clientLiabsVal;
    const familyNetWorth = familyAssetsVal - familyLiabsVal;

    // Load mutual-funds-data.json for code mapping
    let mutualFundOptions: { name: string; code: string }[] = [];
    try {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      let fundsDataPath = path.resolve(__dirname, "../../../wealth-mgmt/src/lib/mutual-funds-data.json");
      if (!fs.existsSync(fundsDataPath)) {
        fundsDataPath = path.resolve(__dirname, "../../wealth-mgmt/src/lib/mutual-funds-data.json");
      }
      if (!fs.existsSync(fundsDataPath)) {
        fundsDataPath = path.resolve(process.cwd(), "../wealth-mgmt/src/lib/mutual-funds-data.json");
      }
      if (!fs.existsSync(fundsDataPath)) {
        fundsDataPath = "c:/Users/com/Downloads/Financial-Family/Financial-Family/artifacts/wealth-mgmt/src/lib/mutual-funds-data.json";
      }

      if (fs.existsSync(fundsDataPath)) {
        mutualFundOptions = JSON.parse(fs.readFileSync(fundsDataPath, "utf-8"));
      } else {
        console.warn("mutual-funds-data.json not found in fallback paths.");
      }
    } catch (err) {
      console.error("Error reading mutual-funds-data.json:", err);
    }

    const getFundCode = (name: string): string | null => {
      const match = mutualFundOptions.find(
        (f) => f.name.toLowerCase() === name.trim().toLowerCase()
      );
      return match?.code ?? null;
    };

    // Construct Sheet 1: Summary
    const sheet1Data: any[][] = [
      ["CLIENT PORTFOLIO SUMMARY REPORT"],
      [],
      ["Client Profile Information"],
      ["Name", client.name],
      ["Username", client.username],
      ["Email", client.email || "N/A"],
      ["Phone", client.phone || "N/A"],
      ["Report Date", new Date().toLocaleDateString("en-IN")],
      [],
      ["Financial Summary Indicators"],
      ["Metric", "Client Only Value (INR)", "Family Total Value (INR)"],
      ["Total Assets", clientAssetsVal, familyAssetsVal],
      ["Total Liabilities", clientLiabsVal, familyLiabsVal],
      ["Net Worth (Assets - Liabilities)", clientNetWorth, familyNetWorth],
      [],
      ["Asset Class Allocation Breakdown (Family Wide)"],
      ["Asset Class", "Current Value (INR)", "Allocation (%)"]
    ];

    const totalFamilyAssets = familyAssetsVal || 1;
    for (const [type, val] of Object.entries(assetBreakdown)) {
      const label = ASSET_LABELS[type] || type;
      const pct = (val / totalFamilyAssets) * 100;
      sheet1Data.push([label, val, parseFloat(pct.toFixed(2))]);
    }

    // Construct Sheet 2: Family Tree
    const sheet2Data: any[][] = [
      ["FAMILY TREE & RELATIONSHIPS"],
      [],
      ["Name", "Relation", "Date of Birth", "Phone", "Total Assets (INR)", "Total Liabilities (INR)", "Net Worth (INR)"],
      [client.name, "Primary Client", "N/A", client.phone || "N/A", clientAssetsVal, clientLiabsVal, clientNetWorth]
    ];

    for (const member of familyMembers) {
      let memberAssets = 0;
      let memberLiabs = 0;
      
      for (const asset of assets) {
        if (asset.familyMemberId === member.id) {
          const vals = getAssetCurrentAndInvested(asset);
          memberAssets += vals.current;
        }
      }
      
      for (const liab of liabilities) {
        if (liab.familyMemberId === member.id) {
          memberLiabs += parseFloat(liab.outstandingAmount) || 0;
        }
      }
      
      sheet2Data.push([
        member.name,
        member.relation,
        member.dob || "N/A",
        member.phone || "N/A",
        memberAssets,
        memberLiabs,
        memberAssets - memberLiabs
      ]);
    }

    // Construct Sheet 3: Assets & Liabilities (Client Only)
    const sheet3Data: any[][] = [
      ["CLIENT HOLDINGS (PRIMARY CLIENT ONLY)"],
      [],
      ["I. CLIENT ASSETS"],
      ["Asset Class", "Asset Name / Institution", "Invested Value (INR)", "Current Value (INR)", "Parameters"],
    ];

    const clientAssets = assets.filter(a => a.familyMemberId === null);
    if (clientAssets.length === 0) {
      sheet3Data.push(["No client assets found.", "", "", "", ""]);
    } else {
      for (const asset of clientAssets) {
        const label = ASSET_LABELS[asset.assetType] || asset.assetType;
        const vals = getAssetCurrentAndInvested(asset);
        const name = (asset.data as any).assetName || (asset.data as any).institutionName || "N/A";
        const params = Object.entries(asset.data as Record<string, any>)
          .filter(([k]) => k !== "assetName" && k !== "institutionName")
          .map(([k, v]) => `${k}: ${v}`)
          .join(", ");
        sheet3Data.push([label, name, vals.invested, vals.current, params]);
      }
    }

    sheet3Data.push([], ["II. CLIENT LIABILITIES"]);
    sheet3Data.push(["Loan Type", "Lender / Institution", "Total Loan Amount (INR)", "Outstanding Balance (INR)", "Interest Rate (%)", "EMI (INR)", "Start Date", "End Date", "Notes"]);

    const clientLiabilities = liabilities.filter(l => l.familyMemberId === null);
    if (clientLiabilities.length === 0) {
      sheet3Data.push(["No client liabilities found.", "", "", "", "", "", "", "", ""]);
    } else {
      for (const liab of clientLiabilities) {
        const label = LOAN_LABELS[liab.loanType] || liab.loanType;
        sheet3Data.push([
          label,
          liab.lenderName,
          parseFloat(liab.totalLoanAmount) || 0,
          parseFloat(liab.outstandingAmount) || 0,
          parseFloat(liab.interestRate) || 0,
          parseFloat(liab.emi) || 0,
          liab.startDate || "N/A",
          liab.endDate || "N/A",
          liab.notes || ""
        ]);
      }
    }

    // Construct Sheet 4: NAV Projections
    const sheet4Data: any[][] = [
      ["MUTUAL FUND NAV HISTORY & GROWTH PROJECTIONS"],
      [],
    ];

    const mfAssets = assets.filter(a => a.assetType === "mutual_fund");
    if (mfAssets.length === 0) {
      sheet4Data.push(["No mutual fund assets found."]);
    } else {
      for (const asset of mfAssets) {
        const data = asset.data as any;
        const name = data.assetName || "N/A";
        const method = data.investmentMethod || "Lump sum";
        const units = parseFloat(data.units) || 0;
        const invested = parseFloat(data.amount || data.investmentAmount || "0") || 0;
        const interestRate = parseFloat(data.interestRate) || 12;
        const tenureYears = parseFloat(data.tenureYears) || 5;

        sheet4Data.push([`FUND: ${name} (${method})`]);
        sheet4Data.push([`Units: ${units}`, `Invested Amount: INR ${invested}`, `Expected Return: ${interestRate}% p.a.`, `Projection Period: ${tenureYears} Years`]);
        
        const schemeCode = getFundCode(name);
        
        if (method === "Lump sum" || !data.investmentMethod) {
          if (schemeCode) {
            const fullHistory = await fetchMFHistory(schemeCode);
            const monthlyHistory = deduplicateByMonth(fullHistory).reverse(); // oldest to newest
            
            sheet4Data.push(["Historical NAV (Monthly)"]);
            sheet4Data.push(["Month/Date", "NAV (INR)", "Portfolio Value (INR)", "Status"]);
            
            const latestNAV = monthlyHistory.length > 0 ? monthlyHistory[monthlyHistory.length - 1].nav : (parseFloat(asset.value) / units || 0);
            const latestDate = monthlyHistory.length > 0 ? parseAmfiDate(monthlyHistory[monthlyHistory.length - 1].date) : new Date();

            for (const row of monthlyHistory) {
              sheet4Data.push([row.date, row.nav, row.nav * units, "Historical"]);
            }

            const futureMonths = tenureYears * 12;
            const futureRows = generateFutureProjection(latestNAV, units, interestRate, futureMonths, latestDate);
            
            sheet4Data.push(["Future Projections"]);
            sheet4Data.push(["Month/Date", "Projected NAV (INR)", "Projected Portfolio Value (INR)", "Status"]);
            for (const row of futureRows) {
              sheet4Data.push([row.dateStr, row.nav, row.portfolioValue, "Projected"]);
            }
          } else {
            sheet4Data.push(["Scheme code could not be resolved. Skipping live NAV and projections."]);
          }
        } else if (method === "SIP") {
          const P = parseFloat(data.monthlyInvestment) || 0;
          const start = data.startDate || new Date().toISOString().split("T")[0];
          const r = Math.pow(1 + interestRate / 100, 1 / 12) - 1;
          const totalMonths = tenureYears * 12;
          const startD = new Date(start);
          
          sheet4Data.push(["SIP Future Balance Projections"]);
          sheet4Data.push(["Month", "Date", "Projected Total Invested (INR)", "Projected Future Value (INR)", "Status"]);
          
          for (let i = 1; i <= totalMonths; i++) {
            const d = new Date(startD);
            d.setMonth(startD.getMonth() + i);
            const val = r > 0 ? P * (Math.pow(1 + r, i) - 1) / r * (1 + r) : P * i;
            sheet4Data.push([i, d.toLocaleDateString("en-IN", { month: "short", year: "numeric" }), P * i, val, "Projected"]);
          }
        } else if (method === "SWP") {
          const P = parseFloat(data.investmentAmount) || 0;
          const W = parseFloat(data.monthlyWithdrawal) || 0;
          const start = data.startDate || new Date().toISOString().split("T")[0];
          const r = Math.pow(1 + interestRate / 100, 1 / 12) - 1;
          const totalMonths = tenureYears * 12;
          const startD = new Date(start);

          sheet4Data.push(["SWP Future Balance Projections"]);
          sheet4Data.push(["Month", "Date", "Projected Remaining Balance (INR)", "Status"]);

          const balanceAt = (n: number) => {
            const fv = P * Math.pow(1 + r, n) - W * (Math.pow(1 + r, n) - 1) / r;
            return Math.max(0, fv);
          };

          for (let i = 1; i <= totalMonths; i++) {
            const d = new Date(startD);
            d.setMonth(startD.getMonth() + i);
            sheet4Data.push([i, d.toLocaleDateString("en-IN", { month: "short", year: "numeric" }), balanceAt(i), "Projected"]);
          }
        } else if (method === "STP") {
          const P = parseFloat(data.investmentAmount) || 0;
          const T_val = parseFloat(data.monthlyTransfer) || 0;
          const start = data.startDate || new Date().toISOString().split("T")[0];
          const rateSource = interestRate;
          const rateTarget = parseFloat(data.targetInterestRate) || 12;
          const totalMonths = tenureYears * 12;
          const startD = new Date(start);

          const rS = Math.pow(1 + rateSource / 100, 1 / 12) - 1;
          const rT = Math.pow(1 + rateTarget / 100, 1 / 12) - 1;

          const sourceAt = (n: number) => Math.max(0, P * Math.pow(1 + rS, n) - T_val * (Math.pow(1 + rS, n) - 1) / rS);
          const targetAt = (n: number) => rT > 0 ? T_val * (Math.pow(1 + rT, n) - 1) / rT * (1 + rT) : T_val * n;

          sheet4Data.push(["STP Future Balance Projections"]);
          sheet4Data.push(["Month", "Date", "Projected Source Balance (INR)", "Projected Target Balance (INR)", "Projected Total Balance (INR)", "Status"]);

          for (let i = 1; i <= totalMonths; i++) {
            const d = new Date(startD);
            d.setMonth(startD.getMonth() + i);
            const sVal = sourceAt(i);
            const tVal = targetAt(i);
            sheet4Data.push([
              i,
              d.toLocaleDateString("en-IN", { month: "short", year: "numeric" }),
              sVal,
              tVal,
              sVal + tVal,
              "Projected"
            ]);
          }
        }
        
        sheet4Data.push([], []);
      }
    }

    // Build workbook
    const wb = XLSX.utils.book_new();
    
    const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);
    const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);
    const ws3 = XLSX.utils.aoa_to_sheet(sheet3Data);
    const ws4 = XLSX.utils.aoa_to_sheet(sheet4Data);

    XLSX.utils.book_append_sheet(wb, ws1, "Summary");
    XLSX.utils.book_append_sheet(wb, ws2, "Family Tree");
    XLSX.utils.book_append_sheet(wb, ws3, "Assets & Liabilities");
    XLSX.utils.book_append_sheet(wb, ws4, "MF NAV & Projections");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Disposition", `attachment; filename="Concise_Report_${client.name.replace(/\s+/g, "_")}.xlsx"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buf);
  } catch (err: any) {
    console.error("Report generation error:", err);
    res.status(500).json({ error: "Failed to generate Excel report", details: err.message });
  }
});

export default router;
