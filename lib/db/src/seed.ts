import { db, usersTable } from "./index";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("Seeding database...");

  const existing = await db.select({ id: usersTable.id }).from(usersTable).limit(1);
  if (existing.length > 0) {
    console.log("Database already seeded, skipping.");
    process.exit(0);
  }

  const adminHash = await bcrypt.hash("admin123", 10);
  await db.insert(usersTable).values({
    username: "admin",
    passwordHash: adminHash,
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
