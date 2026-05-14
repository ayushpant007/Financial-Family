import { Router, type Request, type Response } from "express";
import { db, clientsTable, assetsTable, liabilitiesTable, usersTable } from "@workspace/db";
import { eq, sum, count } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth";

const router = Router();

router.get("/clients/:clientId/summary", requireAuth, async (req: Request, res: Response) => {
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

  const [client] = await db.select({ id: clientsTable.id, name: clientsTable.name })
    .from(clientsTable).where(eq(clientsTable.id, clientId)).limit(1);

  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  const assets = await db.select().from(assetsTable).where(eq(assetsTable.clientId, clientId));
  const liabilities = await db.select().from(liabilitiesTable).where(eq(liabilitiesTable.clientId, clientId));

  const totalAssets = assets.reduce((sum, a) => sum + parseFloat(a.value), 0);
  const totalLiabilities = liabilities.reduce((sum, l) => sum + parseFloat(l.outstandingAmount), 0);
  const netWorth = totalAssets - totalLiabilities;

  const breakdownMap: Record<string, { total: number; count: number }> = {};
  for (const asset of assets) {
    if (!breakdownMap[asset.assetType]) {
      breakdownMap[asset.assetType] = { total: 0, count: 0 };
    }
    breakdownMap[asset.assetType].total += parseFloat(asset.value);
    breakdownMap[asset.assetType].count += 1;
  }

  const assetBreakdown = Object.entries(breakdownMap).map(([assetType, data]) => ({
    assetType,
    total: data.total,
    count: data.count,
  }));

  res.json({
    clientId: client.id,
    clientName: client.name,
    totalAssets,
    totalLiabilities,
    netWorth,
    assetBreakdown,
  });
});

router.get("/dashboard/overview", requireAdmin, async (req: Request, res: Response) => {
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

  const allAssets = await db.select().from(assetsTable);
  const allLiabilities = await db.select().from(liabilitiesTable);

  const totalAUM = allAssets.reduce((sum, a) => sum + parseFloat(a.value), 0);
  const totalLiabilities = allLiabilities.reduce((sum, l) => sum + parseFloat(l.outstandingAmount), 0);
  const totalNetWorth = totalAUM - totalLiabilities;

  const breakdownMap: Record<string, { total: number; count: number }> = {};
  for (const asset of allAssets) {
    if (!breakdownMap[asset.assetType]) {
      breakdownMap[asset.assetType] = { total: 0, count: 0 };
    }
    breakdownMap[asset.assetType].total += parseFloat(asset.value);
    breakdownMap[asset.assetType].count += 1;
  }

  const assetBreakdown = Object.entries(breakdownMap).map(([assetType, data]) => ({
    assetType,
    total: data.total,
    count: data.count,
  }));

  const recentClients = clients.slice(-5).reverse().map(c => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
  }));

  res.json({
    totalClients: clients.length,
    totalAUM,
    totalLiabilities,
    totalNetWorth,
    assetBreakdown,
    recentClients,
  });
});

export default router;
