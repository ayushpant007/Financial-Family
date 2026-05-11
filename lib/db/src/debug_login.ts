import crypto from "crypto";
import pg from "pg";
import { config } from "dotenv";
import path from "path";

// Mimic api-server's env loading (which uses --env-file usually, but we'll use dotenv)
config({ path: path.resolve(process.cwd(), "../../.env") });

const url = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
const secret = process.env.SESSION_SECRET || "fallback-secret";

console.log("Using URL:", url?.substring(0, 20) + "...");
console.log("Using SECRET:", secret);

function hashPassword(password: string): string {
  return crypto.createHmac("sha256", secret).update(password).digest("hex");
}

async function testLogin(username: string, password: string) {
  const client = new pg.Client({ 
    connectionString: url,
    ssl: url?.includes("supabase") ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();
  
  console.log(`Testing login for: ${username} / ${password}`);
  
  const res = await client.query("SELECT * FROM users WHERE username = $1", [username]);
  
  if (res.rows.length === 0) {
    console.log("User not found in database.");
  } else {
    const user = res.rows[0];
    const calculatedHash = hashPassword(password);
    console.log("User found:");
    console.log("  Stored hash:", user.password_hash);
    console.log("  Calc   hash:", calculatedHash);
    
    if (user.password_hash === calculatedHash) {
      console.log("SUCCESS: Hashes match!");
    } else {
      console.log("FAILURE: Hashes do NOT match.");
    }
  }

  await client.end();
}

const args = process.argv.slice(2);
const user = args[0] || "ayush";
const pass = args[1] || "ayush";

testLogin(user, pass).catch(console.error);
