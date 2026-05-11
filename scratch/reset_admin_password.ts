import crypto from "crypto";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { eq } from "drizzle-orm";
import { config } from "dotenv";
import path from "path";

// Load .env from current directory
config({ path: path.resolve(process.cwd(), ".env") });

const SESSION_SECRET = process.env.SESSION_SECRET || "fallback-secret";
const connectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Error: SUPABASE_DATABASE_URL or DATABASE_URL must be set in .env");
  process.exit(1);
}

// Minimal schema for users table
const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

function hashPassword(password: string): string {
  return crypto.createHmac("sha256", SESSION_SECRET).update(password).digest("hex");
}

async function run() {
  console.log("Connecting to database...");
  const pool = new pg.Pool({
    connectionString,
    ssl: connectionString.includes("supabase") ? { rejectUnauthorized: false } : undefined,
  });
  const db = drizzle(pool);

  console.log("Using SESSION_SECRET:", SESSION_SECRET);
  const newHash = hashPassword("admin123");
  console.log("New password hash for 'admin123':", newHash);

  console.log("Updating admin user...");
  const result = await db.update(usersTable)
    .set({ passwordHash: newHash })
    .where(eq(usersTable.username, "admin"))
    .returning();

  if (result.length > 0) {
    console.log("Successfully updated admin password to 'admin123'");
  } else {
    console.log("Admin user not found. Creating admin user...");
    await db.insert(usersTable).values({
      username: "admin",
      passwordHash: newHash,
      role: "admin",
      name: "Administrator",
    });
    console.log("Successfully created admin user with password 'admin123'");
  }

  await pool.end();
  process.exit(0);
}

run().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
