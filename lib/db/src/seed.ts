import { db, usersTable } from "./index";
import argon2 from "argon2";

async function seed() {
  console.log("Seeding database...");

  const existing = await db.select().from(usersTable).limit(1);
  if (existing.length > 0) {
    console.log("Database already seeded, skipping.");
    process.exit(0);
  }

  // Create admin user
  await db.insert(usersTable).values({
    username: "admin",
    passwordHash: await argon2.hash("admin123"),
    role: "admin",
    name: "Administrator",
  });

  // Create ayush user (as requested by user)
  await db.insert(usersTable).values({
    username: "ayush",
    passwordHash: await argon2.hash("ayush"),
    role: "admin",
    name: "Ayush Admin",
  });

  console.log("Seed data created successfully.");
  console.log("Users: admin / admin123, ayush / ayush");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
