import { db, usersTable } from "./index";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const SESSION_SECRET = "fallback-secret";

function hashPassword(password: string): string {
  return crypto.createHmac("sha256", SESSION_SECRET).update(password).digest("hex");
}

async function main() {
  const users = [
    { username: "Ayush", password: "ayush" },
    { username: "Bhavay", password: "bhavay" },
    { username: "admin", password: "admin123" },
  ];

  for (const u of users) {
    const hash = hashPassword(u.password);
    await db.update(usersTable)
      .set({ passwordHash: hash })
      .where(eq(usersTable.username, u.username));
    console.log(`Updated password for ${u.username}`);
  }

  process.exit(0);
}

main().catch(console.error);
