import { db, usersTable } from "./index";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const SESSION_SECRET = "fallback-secret";

function hashPassword(password: string): string {
  return crypto.createHmac("sha256", SESSION_SECRET).update(password).digest("hex");
}

async function main() {
  const username = "nitingogia";
  const password = "nitin";
  
  const hash = hashPassword(password);
  await db.update(usersTable)
    .set({ passwordHash: hash })
    .where(eq(usersTable.username, username));
    
  console.log(`Reset password for ${username} to ${password}`);
  process.exit(0);
}

main().catch(console.error);
