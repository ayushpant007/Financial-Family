import pg from "pg";
import { config } from "dotenv";
import path from "path";

config({ path: path.resolve(process.cwd(), "../../.env") });

const url = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

async function inspect() {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  
  console.log("--- Family Members ---");
  const members = await client.query("SELECT * FROM family_members");
  console.log(members.rows);
  
  console.log("--- Assets (First 5) ---");
  const assets = await client.query("SELECT id, client_id, family_member_id, asset_type, value FROM assets LIMIT 5");
  console.log(assets.rows);
  
  console.log("--- Liabilities (First 5) ---");
  const liabilities = await client.query("SELECT id, client_id, family_member_id, loan_type, outstanding_amount FROM liabilities LIMIT 5");
  console.log(liabilities.rows);

  await client.end();
}

inspect();
