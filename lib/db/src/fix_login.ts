import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";
import argon2 from "argon2";
import { config } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "../../../.env") });

const url = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

async function hash(password: string): Promise<string> {
  return await argon2.hash(password);
}

async function fix() {
  const client = new pg.Client({ connectionString: url });
  await client.connect();

  // Get all users
  const { rows } = await client.query("SELECT id, username, role FROM users ORDER BY id");
  console.log("\nCurrent users:");
  rows.forEach(r => console.log(` - ID ${r.id}: ${r.username} (${r.role})`));

  // Reset passwords to known values
  const passwords: Record<string, string> = {
    admin: "admin123",
    nitin: "nitin",
    ayush: "ayush",
    bhavay: "bhavay",
  };

  for (const row of rows) {
    const username = row.username.toLowerCase();
    const password = passwords[username] ?? "admin123"; // default fallback
    const h = await hash(password);
    await client.query("UPDATE users SET password_hash = $1 WHERE id = $2", [h, row.id]);
    console.log(`✓ Reset password for '${row.username}' → '${password}'`);
  }

  console.log("\n✅ All passwords reset successfully.");
  console.log("   Login with: ayush / ayush (or your specific password)");
  await client.end();
}

fix().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
