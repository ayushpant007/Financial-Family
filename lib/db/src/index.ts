import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import path from "path";
import { config } from "dotenv";
import * as schema from "./schema";

const envPath = path.resolve(process.cwd(), ".env");
config({ path: envPath });
// If not loaded, try parent directory (for monorepo structure)
if (!process.env.SUPABASE_DATABASE_URL && !process.env.DATABASE_URL) {
  config({ path: path.resolve(process.cwd(), "../../.env") });
}

const { Pool } = pg;

const connectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "SUPABASE_DATABASE_URL or DATABASE_URL must be set.",
  );
}

const isProduction = process.env.NODE_ENV === "production";

export const pool = new Pool({
  connectionString,
  ssl: (isProduction || process.env.SUPABASE_DATABASE_URL) 
    ? { rejectUnauthorized: false } 
    : undefined,
});
export const db = drizzle(pool, { schema });

export * from "./schema";
