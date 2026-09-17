const http = require('http');

const PL = '9cef6c96-c74e-432d-b0f2-7867ee7f3e07';
const LA_LIGA = 'ad6261b7-7170-4824-aeed-edeb1e03a05f';

function sendQuery(body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path: '/api/players',
        method: 'QUERY',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: data });
          }
        });
      },
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function testPagination() {
  console.log('=== TOP N PAGINATION VERIFICATION (Case 5: Total 12 players) ===\n');

  const baseQuery = {
    kind: 'GROUP',
    operator: 'AND',
    conditions: [
      {
        kind: 'GROUP',
        operator: 'OR',
        conditions: [
          { kind: 'CONDITION', field: 'competition', operator: 'EQ', value: PL },
          { kind: 'CONDITION', field: 'competition', operator: 'EQ', value: LA_LIGA },
        ],
      },
      { kind: 'CONDITION', field: 'position', operator: 'EQ', value: 'CM' },
      { kind: 'CONDITION', field: 'goals_per90', operator: 'BETWEEN', value: [0.10, 0.50] },
      { kind: 'CONDITION', field: 'assists_per90', operator: 'BETWEEN', value: [0.05, 0.50] },
      {
        kind: 'COHORT_COMPARISON',
        metric: 'goals_per90',
        comparison: { type: 'RANK', operator: 'LTE', value: 10 },
        cohort: { context: true },
      },
    ],
  };

  // Page 1 (limit 5, offset 0)
  const p1 = await sendQuery({ query: baseQuery, pagination: { limit: 5, offset: 0 } });
  console.log(`Page 1: status ${p1.status}, total ${p1.body.pagination?.total}, items: ${p1.body.items?.length}`);
  const p1Ids = p1.body.items.map(p => p.id);
  p1.body.items.forEach((p, i) => console.log(`  ${i + 1}. ${p.fullName}`));

  // Page 2 (limit 5, offset 5)
  const p2 = await sendQuery({ query: baseQuery, pagination: { limit: 5, offset: 5 } });
  console.log(`\nPage 2: status ${p2.status}, total ${p2.body.pagination?.total}, items: ${p2.body.items?.length}`);
  const p2Ids = p2.body.items.map(p => p.id);
  p2.body.items.forEach((p, i) => console.log(`  ${i + 6}. ${p.fullName}`));

  // Page 3 (limit 5, offset 10)
  const p3 = await sendQuery({ query: baseQuery, pagination: { limit: 5, offset: 10 } });
  console.log(`\nPage 3: status ${p3.status}, total ${p3.body.pagination?.total}, items: ${p3.body.items?.length}`);
  const p3Ids = p3.body.items.map(p => p.id);
  p3.body.items.forEach((p, i) => console.log(`  ${i + 11}. ${p.fullName}`));

  // Check overlap
  const allIds = [...p1Ids, ...p2Ids, ...p3Ids];
  const uniqueIds = new Set(allIds);
  console.log(`\nTotal collected IDs: ${allIds.length}, Unique IDs: ${uniqueIds.size}`);
  console.log(`Pagination integrity: ${allIds.length === uniqueIds.size && uniqueIds.size === 12 ? 'PASS (NO DUPLICATES/GAPS)' : 'FAIL'}`);
}

testPagination().catch(console.error);
