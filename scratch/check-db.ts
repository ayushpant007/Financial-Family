
import pg from "pg";
import { config } from "dotenv";
import path from "path";

config({ path: path.resolve(process.cwd(), ".env") });

const url = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
console.log("Using URL:", url?.substring(0, 30) + "...");

async function check() {
  if (!url) {
    console.error("No database URL found!");
    return;
  }
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  const res = await client.query("SELECT id, name FROM clients");
  console.log("Clients:", res.rows);
  
  // Also check users
  const usersRes = await client.query("SELECT id, username FROM users");
  console.log("Users:", usersRes.rows);
  
  await client.end();
}

check().catch(console.error);
