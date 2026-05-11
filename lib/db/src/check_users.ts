import { db } from "./index";
import { usersTable } from "./schema";

async function main() {
  const allUsers = await db.select().from(usersTable);
  console.log("Current Users in DB:");
  allUsers.forEach(u => {
    console.log(`ID: ${u.id}, Username: ${u.username}, PasswordHash: ${u.passwordHash}, Role: ${u.role}`);
  });
  process.exit(0);
}

main().catch(console.error);
