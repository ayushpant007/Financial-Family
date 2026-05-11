import { db, usersTable } from "./index";
import crypto from "crypto";
import { eq } from "drizzle-orm";

const SESSION_SECRET = process.env.SESSION_SECRET || "fallback-secret";

function hashPassword(password: string): string {
  return crypto.createHmac("sha256", SESSION_SECRET).update(password).digest("hex");
}

async function resetAdmin() {
  console.log("Resetting admin password with current SESSION_SECRET...");
  
  const newHash = hashPassword("admin123");
  
  await db.update(usersTable)
    .set({ passwordHash: newHash })
    .where(eq(usersTable.username, "admin"));
    
  console.log("Admin password reset to 'admin123' using the current secret.");
  process.exit(0);
}

resetAdmin().catch(console.error);
