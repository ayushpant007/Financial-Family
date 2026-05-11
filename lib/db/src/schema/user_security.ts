import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const userSecurityTable = pgTable("user_security", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .unique()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  mpinHash: text("mpin_hash").notNull(),
  failedAttempts: integer("failed_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until"),
  lastChangedAt: timestamp("last_changed_at").notNull().defaultNow(),
  deviceId: text("device_id"), // Optional device binding
});

export type UserSecurity = typeof userSecurityTable.$inferSelect;
