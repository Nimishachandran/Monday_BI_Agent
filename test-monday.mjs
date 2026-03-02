// test-monday.mjs
import { config } from 'dotenv';
config({ path: '.env.local' });

const MONDAY_API_KEY = process.env.MONDAY_API_KEY;
const DEALS_BOARD_ID = process.env.MONDAY_DEALS_BOARD_ID;
const WO_BOARD_ID = process.env.MONDAY_WORKORDERS_BOARD_ID;

async function testBoard(boardId, label) {
  console.log(`\n🔌 Testing ${label} board (ID: ${boardId})...`);
  const query = `
    query {
      boards(ids: [${boardId}]) {
        id name items_count
        columns { id title type }
        items_page(limit: 3) {
          items {
            id name
            column_values { id text }
          }
        }
      }
    }
  `;
  const res = await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': MONDAY_API_KEY,
      'API-Version': '2024-01',
    },
    body: JSON.stringify({ query }),
  });

  const data = await res.json();
  if (data.errors) { console.log('❌ Errors:', JSON.stringify(data.errors)); return; }

  const board = data.data?.boards?.[0];
  if (!board) { console.log('❌ Board not found'); return; }

  console.log(`✅ Board: "${board.name}" | Items: ${board.items_count}`);
  console.log(`\n📋 Columns:`);
  board.columns.forEach(c => console.log(`   ${c.title} → id: "${c.id}" (${c.type})`));

  console.log(`\n📦 Sample items (first 3):`);
  board.items_page.items.forEach(item => {
    console.log(`\n  Item: "${item.name}"`);
    item.column_values
      .filter(cv => cv.text && cv.text !== '')
      .forEach(cv => console.log(`    ${cv.id}: "${cv.text}"`));
  });
}

console.log('🔍 Env vars:');
console.log('MONDAY_API_KEY:', MONDAY_API_KEY ? `✅ (${MONDAY_API_KEY.slice(0,10)}...)` : '❌ MISSING');
console.log('DEALS_BOARD_ID:', DEALS_BOARD_ID ?? '❌ MISSING');
console.log('WO_BOARD_ID:', WO_BOARD_ID ?? '❌ MISSING');

await testBoard(DEALS_BOARD_ID, 'DEALS');
await testBoard(WO_BOARD_ID, 'WORK ORDERS');
