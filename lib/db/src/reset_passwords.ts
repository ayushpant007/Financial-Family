import pg from "pg";
import { config } from "dotenv";
import path from "path";
import crypto from "crypto";

config({ path: path.resolve(process.cwd(), "../../.env") });

const url = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
const secret = process.env.SESSION_SECRET || "fallback-secret";

function hash(password: string): string {
  return crypto.createHmac("sha256", secret).update(password).digest("hex");
}

async function reset() {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  
  console.log("Resetting passwords with secret:", secret === "fallback-secret" ? "FALLBACK" : "LOADED");
  
  const users = [
    { username: "admin", password: "admin123" },
    { username: "Ayush", password: "admin" }, // Ayush usually uses 'admin' as password in previous turns
    { username: "Bhavay", password: "admin" }
  ];
  
  for (const u of users) {
    const h = hash(u.password);
    await client.query("UPDATE users SET password_hash = $1 WHERE username = $2", [h, u.username]);
    console.log(`Updated ${u.username}`);
  }
  
  await client.end();
}

reset();
