import { db, usersTable } from "./index";
import argon2 from "argon2";

async function seed() {
  console.log("Seeding database...");

  // Use upsert to update passwords if users already exist
  const adminPassword = await argon2.hash("admin123");
  await db.insert(usersTable).values({
    username: "admin",
    passwordHash: adminPassword,
    role: "admin",
    name: "Administrator",
  }).onConflictDoUpdate({
    target: usersTable.username,
    set: { passwordHash: adminPassword }
  });

  const ayushPassword = await argon2.hash("ayush");
  await db.insert(usersTable).values({
    username: "ayush",
    passwordHash: ayushPassword,
    role: "admin",
    name: "Ayush Admin",
  }).onConflictDoUpdate({
    target: usersTable.username,
    set: { passwordHash: ayushPassword }
  });

  console.log("Seed data updated successfully.");
  console.log("Users: admin / admin123, ayush / ayush");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
