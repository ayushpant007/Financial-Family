import { db, liabilitiesTable } from './src/index.js';
import { eq } from 'drizzle-orm';

async function run() {
  const res = await db.select().from(liabilitiesTable);
  console.log('Current Liabilities:');
  console.log(JSON.stringify(res, null, 2));

  for (const l of res) {
    if (l.lenderName === 'HDFC' && !l.notes) {
      console.log('Updating HDFC to Credit Cards & BNPL');
      await db.update(liabilitiesTable).set({ notes: 'Credit Cards & BNPL' }).where(eq(liabilitiesTable.id, l.id));
    }
    if (l.lenderName === 'Kotak' && !l.notes) {
      console.log('Updating Kotak to EMIs');
      await db.update(liabilitiesTable).set({ notes: 'EMIs' }).where(eq(liabilitiesTable.id, l.id));
    }
  }
  process.exit(0);
}

run();
