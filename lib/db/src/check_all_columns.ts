import pg from "pg";
import { config } from "dotenv";
import path from "path";

config({ path: path.resolve(process.cwd(), "../../.env") });

const url = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

async function check() {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  
  const assetsRes = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'assets'");
  console.log("Columns of assets:", assetsRes.rows);
  
  const liabilitiesRes = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'liabilities'");
  console.log("Columns of liabilities:", liabilitiesRes.rows);
  
  await client.end();
}

check();
