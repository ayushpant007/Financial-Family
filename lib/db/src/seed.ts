import { db, usersTable } from "./index";
import crypto from "crypto";

const SESSION_SECRET = process.env.SESSION_SECRET || "fallback-secret";

function hashPassword(password: string): string {
  return crypto.createHmac("sha256", SESSION_SECRET).update(password).digest("hex");
}

async function seed() {
  console.log("Seeding database...");

  const existing = await db.select().from(usersTable).limit(1);
  if (existing.length > 0) {
    console.log("Database already seeded, skipping.");
    process.exit(0);
  }

  await db.insert(usersTable).values({
    username: "admin",
    passwordHash: hashPassword("admin123"),
    role: "admin",
    name: "Administrator",
  });

  console.log("Admin user created: admin / admin123");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
