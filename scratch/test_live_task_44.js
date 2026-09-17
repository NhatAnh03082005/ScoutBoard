const http = require('http');

const PL = '9cef6c96-c74e-432d-b0f2-7867ee7f3e07';
const LA_LIGA = 'ad6261b7-7170-4824-aeed-edeb1e03a05f';
const ARSENAL = 'b66fe9e9-c125-4442-9955-c16340d9d4d9';
const REAL_MADRID = 'a6e6dd22-032f-474b-8105-ca7d34361831';

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

async function run() {
  console.log('=== TASK 4.4 LIVE HTTP QUERY VERIFICATION (CASES 1 - 7) ===\n');

  // CASE 1: PL, CM, Goals/90 BETWEEN 0.2 AND 0.5
  console.log('--- CASE 1: PL, CM, Goals/90 BETWEEN [0.2, 0.5] ---');
  const res1 = await sendQuery({
    query: {
      kind: 'GROUP',
      operator: 'AND',
      conditions: [
        { kind: 'CONDITION', field: 'competition', operator: 'EQ', value: PL },
        { kind: 'CONDITION', field: 'position', operator: 'EQ', value: 'CM' },
        { kind: 'CONDITION', field: 'goals_per90', operator: 'BETWEEN', value: [0.2, 0.5] },
      ],
    },
    pagination: { limit: 50, offset: 0 },
  });
  console.log(`Status: ${res1.status}, Total: ${res1.body.pagination?.total}, Items: ${res1.body.items?.length}`);
  res1.body.items?.slice(0, 5).forEach((p, i) => console.log(`  ${i + 1}. ${p.fullName} (${p.primaryPosition})`));

  // CASE 2: PL + La Liga, CM, Goals/90 BETWEEN 0.2 AND 0.5
  console.log('\n--- CASE 2: PL + La Liga, CM, Goals/90 BETWEEN [0.2, 0.5] ---');
  const res2 = await sendQuery({
    query: {
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
        { kind: 'CONDITION', field: 'goals_per90', operator: 'BETWEEN', value: [0.2, 0.5] },
      ],
    },
    pagination: { limit: 50, offset: 0 },
  });
  console.log(`Status: ${res2.status}, Total: ${res2.body.pagination?.total}, Items: ${res2.body.items?.length}`);
  res2.body.items?.slice(0, 5).forEach((p, i) => console.log(`  ${i + 1}. ${p.fullName} (${p.primaryPosition})`));

  // CASE 3: Arsenal + Real Madrid, CM, Top 10 Goals/90
  console.log('\n--- CASE 3: Arsenal + Real Madrid, CM, Top 10 Goals/90 ---');
  const res3 = await sendQuery({
    query: {
      kind: 'GROUP',
      operator: 'AND',
      conditions: [
        {
          kind: 'GROUP',
          operator: 'OR',
          conditions: [
            { kind: 'CONDITION', field: 'club', operator: 'EQ', value: ARSENAL },
            { kind: 'CONDITION', field: 'club', operator: 'EQ', value: REAL_MADRID },
          ],
        },
        { kind: 'CONDITION', field: 'position', operator: 'EQ', value: 'CM' },
        {
          kind: 'COHORT_COMPARISON',
          metric: 'goals_per90',
          comparison: { type: 'RANK', operator: 'LTE', value: 10 },
          cohort: { context: true },
        },
      ],
    },
    pagination: { limit: 50, offset: 0 },
  });
  console.log(`Status: ${res3.status}, Total: ${res3.body.pagination?.total}, Items: ${res3.body.items?.length}`);
  res3.body.items?.forEach((p, i) => console.log(`  ${i + 1}. ${p.fullName} (id: ${p.id})`));

  // CASE 4: PL + La Liga, Arsenal + Real Madrid, CM, Goals/90 >= 0.10, Top 10 Goals/90
  console.log('\n--- CASE 4: PL + La Liga, Arsenal + Real Madrid, CM, Goals/90 >= 0.10, Top 10 Goals/90 ---');
  const res4 = await sendQuery({
    query: {
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
        {
          kind: 'GROUP',
          operator: 'OR',
          conditions: [
            { kind: 'CONDITION', field: 'club', operator: 'EQ', value: ARSENAL },
            { kind: 'CONDITION', field: 'club', operator: 'EQ', value: REAL_MADRID },
          ],
        },
        { kind: 'CONDITION', field: 'position', operator: 'EQ', value: 'CM' },
        { kind: 'CONDITION', field: 'goals_per90', operator: 'GTE', value: 0.10 },
        {
          kind: 'COHORT_COMPARISON',
          metric: 'goals_per90',
          comparison: { type: 'RANK', operator: 'LTE', value: 10 },
          cohort: { context: true },
        },
      ],
    },
    pagination: { limit: 50, offset: 0 },
  });
  console.log(`Status: ${res4.status}, Total: ${res4.body.pagination?.total}, Items: ${res4.body.items?.length}`);
  res4.body.items?.forEach((p, i) => console.log(`  ${i + 1}. ${p.fullName} (id: ${p.id})`));

  // CASE 5: PL + La Liga, CM, Goals/90 [0.1, 0.5] AND Assists/90 [0.05, 0.5], Top 10 Goals/90
  console.log('\n--- CASE 5: PL + La Liga, CM, Goals/90 [0.1, 0.5] AND Assists/90 [0.05, 0.5], Top 10 Goals/90 ---');
  const res5 = await sendQuery({
    query: {
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
    },
    pagination: { limit: 50, offset: 0 },
  });
  console.log(`Status: ${res5.status}, Total: ${res5.body.pagination?.total}, Items: ${res5.body.items?.length}`);
  res5.body.items?.forEach((p, i) => console.log(`  ${i + 1}. ${p.fullName} (id: ${p.id})`));

  // CASE 6: GK, clean_sheets >= 1, Top 5 clean_sheets
  console.log('\n--- CASE 6: GK, clean_sheets >= 1, Top 5 clean_sheets ---');
  const res6 = await sendQuery({
    query: {
      kind: 'GROUP',
      operator: 'AND',
      conditions: [
        { kind: 'CONDITION', field: 'position', operator: 'EQ', value: 'GK' },
        { kind: 'CONDITION', field: 'clean_sheets', operator: 'GTE', value: 1 },
        {
          kind: 'COHORT_COMPARISON',
          metric: 'clean_sheets',
          comparison: { type: 'RANK', operator: 'LTE', value: 5 },
          cohort: { context: true },
        },
      ],
    },
    pagination: { limit: 50, offset: 0 },
  });
  console.log(`Status: ${res6.status}, Total: ${res6.body.pagination?.total}, Items: ${res6.body.items?.length}`);
  res6.body.items?.forEach((p, i) => console.log(`  ${i + 1}. ${p.fullName} (id: ${p.id})`));

  // CASE 7: Change Position Semantics: Query produced after switching CM -> GK
  console.log('\n--- CASE 7: Switch Position CM -> GK: Outgoing query contains only GK metrics ---');
  const query7 = {
    kind: 'GROUP',
    operator: 'AND',
    conditions: [
      { kind: 'CONDITION', field: 'position', operator: 'EQ', value: 'GK' },
      { kind: 'CONDITION', field: 'clean_sheets', operator: 'GTE', value: 1 },
      {
        kind: 'COHORT_COMPARISON',
        metric: 'clean_sheets',
        comparison: { type: 'RANK', operator: 'LTE', value: 5 },
        cohort: { context: true },
      },
    ],
  };
  const jsonStr = JSON.stringify(query7);
  const containsStaleCmMetric = jsonStr.includes('goals_per90') || jsonStr.includes('assists_per90');
  console.log('Query contains stale CM metric (goals_per90/assists_per90)?', containsStaleCmMetric ? 'YES (BUG)' : 'NO (CLEAN)');
  const res7 = await sendQuery({ query: query7, pagination: { limit: 10, offset: 0 } });
  console.log(`Status: ${res7.status}, Total: ${res7.body.pagination?.total}, Items: ${res7.body.items?.length}`);
}

run().catch(console.error);
