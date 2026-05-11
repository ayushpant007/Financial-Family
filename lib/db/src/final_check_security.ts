import pg from "pg";
import { config } from "dotenv";
import path from "path";

config({ path: path.resolve(process.cwd(), "../../.env") });

const url = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

async function check() {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_security'");
  console.log("Table exists:", res.rows.length > 0 ? "YES" : "NO");
  if (res.rows.length > 0) {
      const columns = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_security'");
      console.log("Columns:", columns.rows);
  }
  await client.end();
}

check();
