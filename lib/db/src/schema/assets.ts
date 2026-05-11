import { pgTable, serial, integer, text, numeric, jsonb, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";
import { familyMembersTable } from "./family_members";

export const assetTypeEnum = pgEnum("asset_type", [
  "mutual_fund",
  "stock",
  "fixed_deposit",
  "recurring_deposit",
  "provident_fund",
  "cash_bank",
]);

export const assetsTable = pgTable("assets", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clientsTable.id, { onDelete: "cascade" }),
  familyMemberId: integer("family_member_id").references(() => familyMembersTable.id, { onDelete: "cascade" }),
  assetType: assetTypeEnum("asset_type").notNull(),
  data: jsonb("data").notNull().default({}),
  value: numeric("value", { precision: 15, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAssetSchema = createInsertSchema(assetsTable).omit({ id: true, createdAt: true });
export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type Asset = typeof assetsTable.$inferSelect;
