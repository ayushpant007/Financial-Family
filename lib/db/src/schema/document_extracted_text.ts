import { pgTable, serial, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { documentsTable } from "./documents";
import { clientsTable } from "./clients";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const documentExtractedTextTable = pgTable("document_extracted_text", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull().references(() => documentsTable.id, { onDelete: "cascade" }),
  clientId: integer("client_id").notNull().references(() => clientsTable.id, { onDelete: "cascade" }),
  extractedText: text("extracted_text").notNull(), // This column will be encrypted via pgsodium/vault in Supabase
  fileType: text("file_type").notNull(),
  uploadTimestamp: timestamp("upload_timestamp").notNull().defaultNow(),
  maskedFieldsLog: jsonb("masked_fields_log").notNull().default({}), // e.g., {"aadhaar": true, "pan": true}
});

export const insertExtractedTextSchema = createInsertSchema(documentExtractedTextTable).omit({ id: true, uploadTimestamp: true });
export type InsertExtractedText = z.infer<typeof insertExtractedTextSchema>;
export type DocumentExtractedText = typeof documentExtractedTextTable.$inferSelect;
