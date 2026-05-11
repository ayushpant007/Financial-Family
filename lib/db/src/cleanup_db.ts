import pg from "pg";
import { config } from "dotenv";
import path from "path";

config({ path: path.resolve(process.cwd(), "../../.env") });

const url = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

async function cleanup() {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  
  console.log("Dropping conflicting tables...");
  await client.query("DROP TABLE IF EXISTS family_assets CASCADE");
  await client.query("DROP TABLE IF EXISTS family_liabilities CASCADE");
  await client.query("DROP TABLE IF EXISTS family_members CASCADE");
  
  console.log("Done.");
  await client.end();
}

cleanup();
