import { db, usersTable } from "../lib/db/src/index";

async function checkUsers() {
  const users = await db.select().from(usersTable);
  console.log("Users in DB:", users.map(u => ({ id: u.id, username: u.username, role: u.role })));
  process.exit(0);
}

checkUsers().catch(console.error);
