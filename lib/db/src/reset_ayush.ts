import crypto from "crypto";
import pg from "pg";
import { config } from "dotenv";
import path from "path";

// Load .env from root
config({ path: path.resolve(process.cwd(), "../../.env") });

const url = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
const secret = process.env.SESSION_SECRET || "fallback-secret";

function hash(password: string): string {
  return crypto.createHmac("sha256", secret).update(password).digest("hex");
}

async function resetAyush() {
  const client = new pg.Client({ 
    connectionString: url,
    ssl: url.includes("supabase") ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();
  
  const newHash = hash("ayush");
  console.log(`Resetting password for ayush to 'ayush' using current SESSION_SECRET`);
  
  await client.query("UPDATE users SET password_hash = $1 WHERE username = $2", [newHash, "ayush"]);
  console.log("Password updated successfully.");

  await client.end();
}

resetAyush().catch(console.error);
