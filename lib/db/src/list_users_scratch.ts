import pg from "pg";
import { config } from "dotenv";
import path from "path";

// Load .env from root
config({ path: path.resolve(process.cwd(), "../../.env") });

const url = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

async function listUsers() {
  const client = new pg.Client({ 
    connectionString: url,
    ssl: url.includes("supabase") ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();
  
  const res = await client.query("SELECT username, role, name FROM users");
  console.log("Users in database:");
  console.table(res.rows);

  await client.end();
}

listUsers().catch(console.error);
