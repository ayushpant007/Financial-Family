
import pg from "pg";
import { config } from "dotenv";
import path from "path";

config({ path: path.resolve(process.cwd(), "../../.env") });

const url = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

async function list() {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
  console.log("Tables:", res.rows.map(r => r.table_name));
  await client.end();
}

list().catch(console.error);
