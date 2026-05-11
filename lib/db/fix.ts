import { db } from './src/index.js';
import { sessionsTable } from './src/schema/sessions.js';

async function run() {
  try {
    const res = await db.select().from(sessionsTable).limit(1);
    console.log('Query OK:', res);
  } catch(e: any) {
    console.error('DB ERROR:', e);
  }
  process.exit(0);
}

run();
