
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

async function restore() {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  
  console.log("Starting Restoration...");

  // 1. Ensure Users Exist
  const usersToRestore = [
    { username: "nitin", name: "Nitin Gogia", password: "nitin", role: "client" },
    { username: "ayush", name: "Ayush", password: "ayush", role: "client" },
    { username: "bhavay", name: "Bhavay", password: "bhavay", role: "client" },
  ];

  for (const u of usersToRestore) {
    const existing = await client.query("SELECT id FROM users WHERE username = $1", [u.username]);
    let userId;
    if (existing.rows.length === 0) {
      const res = await client.query(
        "INSERT INTO users (username, name, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id",
        [u.username, u.name, hash(u.password), u.role]
      );
      userId = res.rows[0].id;
      console.log(`Created user: ${u.username}`);
    } else {
      userId = existing.rows[0].id;
      await client.query("UPDATE users SET name = $1, password_hash = $2 WHERE id = $3", [u.name, hash(u.password), userId]);
      console.log(`Updated user: ${u.username}`);
    }

    // 2. Ensure Clients Exist
    const clientExisting = await client.query("SELECT id FROM clients WHERE user_id = $1", [userId]);
    if (clientExisting.rows.length === 0) {
      await client.query(
        "INSERT INTO clients (user_id, name) VALUES ($1, $2)",
        [userId, u.name]
      );
      console.log(`Created client for: ${u.username}`);
    } else {
      await client.query("UPDATE clients SET name = $1 WHERE user_id = $2", [u.name, userId]);
      console.log(`Updated client name for: ${u.username}`);
    }
  }

  console.log("Restoration Complete.");
  await client.end();
}

restore().catch(console.error);
