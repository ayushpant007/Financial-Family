
import pg from "pg";
import { config } from "dotenv";
import path from "path";

config({ path: path.resolve(process.cwd(), "../../.env") });

const url = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

async function check() {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  
  console.log("--- Clients with User IDs ---");
  const res = await client.query(`
    SELECT c.id, c.name, u.username, u.role, u.id as user_id 
    FROM clients c 
    INNER JOIN users u ON c.user_id = u.id
  `);
  console.log(res.rows);
  
  console.log("--- All Users ---");
  const usersRes = await client.query("SELECT id, username, role FROM users");
  console.log(usersRes.rows);
  
  await client.end();
}

check().catch(console.error);
