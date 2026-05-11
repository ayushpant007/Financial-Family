import { db, usersTable } from "./index.js";
import crypto from "crypto";
import { eq } from "drizzle-orm";

const SESSION_SECRET = process.env.SESSION_SECRET || "fallback-secret";

function hashPassword(password: string) {
  return crypto.createHmac("sha256", SESSION_SECRET).update(password).digest("hex");
}

async function fixPassword() {
  const newHash = hashPassword("admin123");
  await db.update(usersTable)
    .set({ passwordHash: newHash })
    .where(eq(usersTable.username, "admin"));
  console.log("Admin password forced to 'admin123' with current SESSION_SECRET");
  process.exit(0);
}

fixPassword().catch(console.error);
