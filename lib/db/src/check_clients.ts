import pg from "pg";
import { config } from "dotenv";
import path from "path";

config({ path: path.resolve(process.cwd(), "../../.env") });

const url = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

async function check() {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  const res = await client.query("SELECT id, name FROM clients");
  console.log("Clients:", res.rows);
  await client.end();
}

check();
