import crypto from "crypto";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const SESSION_SECRET = process.env.SESSION_SECRET || "fallback-secret";

function hashPassword(password: string): string {
  return crypto.createHmac("sha256", SESSION_SECRET).update(password).digest("hex");
}

async function seed() {
  console.log("Seeding database...");

  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.username, "admin"))
    .limit(1);

  if (!existing) {  
    await db.insert(usersTable).values({
      username: "admin",
      passwordHash: hashPassword("admin123"),
      role: "admin",
      name: "Administrator",
    });
    console.log("Admin user created: username=admin password=admin123");
  } else {
    console.log("Admin user already exists, skipping.");
  }

  await db.$client.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
