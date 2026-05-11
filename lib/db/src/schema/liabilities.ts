import { pgTable, serial, integer, text, numeric, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";
import { familyMembersTable } from "./family_members";

export const loanTypeEnum = pgEnum("loan_type", [
  "home_loan",
  "car_loan",
  "personal_loan",
  "education_loan",
  "business_loan",
  "other",
]);

export const liabilitiesTable = pgTable("liabilities", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clientsTable.id, { onDelete: "cascade" }),
  familyMemberId: integer("family_member_id").references(() => familyMembersTable.id, { onDelete: "cascade" }),
  loanType: loanTypeEnum("loan_type").notNull(),
  lenderName: text("lender_name").notNull(),
  totalLoanAmount: numeric("total_loan_amount", { precision: 15, scale: 2 }).notNull(),
  outstandingAmount: numeric("outstanding_amount", { precision: 15, scale: 2 }).notNull(),
  interestRate: numeric("interest_rate", { precision: 6, scale: 3 }).notNull(),
  emi: numeric("emi", { precision: 12, scale: 2 }).notNull(),
  startDate: text("start_date"),
  endDate: text("end_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertLiabilitySchema = createInsertSchema(liabilitiesTable).omit({ id: true, createdAt: true });
export type InsertLiability = z.infer<typeof insertLiabilitySchema>;
export type Liability = typeof liabilitiesTable.$inferSelect;
