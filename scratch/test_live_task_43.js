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
  console.log('=== TASK 4.3 LIVE HTTP QUERY VERIFICATION ===\n');

  // CASE A: CM + Goals/90 BETWEEN 0.2 AND 0.5
  console.log('--- Test Case A: Position CM, Goals/90 BETWEEN [0.2, 0.5] ---');
  const queryA = {
    query: {
      kind: 'GROUP',
      operator: 'AND',
      conditions: [
        { kind: 'CONDITION', field: 'position', operator: 'EQ', value: 'CM' },
        { kind: 'CONDITION', field: 'goals_per90', operator: 'BETWEEN', value: [0.2, 0.5] },
      ],
    },
    pagination: { limit: 50, offset: 0 },
  };
  const resA = await sendQuery(queryA);
  console.log(`Status: ${resA.status}, Total: ${resA.body.pagination?.total}`);
  console.log(`Players returned: ${resA.body.items?.length}`);
  if (resA.body.items?.length > 0) {
    console.log(`Sample player: ${resA.body.items[0].fullName} (${resA.body.items[0].primaryPosition})`);
  }

  // CASE B: PL + La Liga, CM, Top 10 Goals/90
  console.log('\n--- Test Case B: PL + La Liga, CM, Top 10 Goals/90 ---');
  const queryB = {
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
        {
          kind: 'COHORT_COMPARISON',
          metric: 'goals_per90',
          comparison: { type: 'RANK', operator: 'LTE', value: 10 },
          cohort: { context: true },
        },
      ],
    },
    pagination: { limit: 50, offset: 0 },
  };
  const resB = await sendQuery(queryB);
  console.log(`Status: ${resB.status}, Total: ${resB.body.pagination?.total}`);
  console.log('Players returned in order:');
  resB.body.items?.forEach((p, i) => console.log(`  ${i + 1}. ${p.fullName} (id: ${p.id})`));

  // CASE C: Arsenal + Real Madrid, CM, Top 10 Goals/90
  console.log('\n--- Test Case C: Arsenal + Real Madrid, CM, Top 10 Goals/90 ---');
  const queryC = {
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
  };
  const resC = await sendQuery(queryC);
  console.log(`Status: ${resC.status}, Total: ${resC.body.pagination?.total}`);
  resC.body.items?.forEach((p, i) => console.log(`  ${i + 1}. ${p.fullName} (id: ${p.id})`));

  // CASE D: PL + La Liga, Arsenal + Real Madrid, CM, Goals/90 >= 0.10, Top 10 Goals/90
  console.log('\n--- Test Case D: PL + La Liga, Arsenal + Real Madrid, CM, Goals/90 >= 0.10, Top 10 Goals/90 ---');
  const queryD = {
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
  };
  const resD = await sendQuery(queryD);
  console.log(`Status: ${resD.status}, Total: ${resD.body.pagination?.total}`);
  resD.body.items?.forEach((p, i) => console.log(`  ${i + 1}. ${p.fullName} (id: ${p.id})`));

  // CASE E: Multiple Ranges + Top N
  console.log('\n--- Test Case E: CM + Goals/90 >= 0.05 AND Assists/90 >= 0.05 AND Top 15 Assists/90 ---');
  const queryE = {
    query: {
      kind: 'GROUP',
      operator: 'AND',
      conditions: [
        { kind: 'CONDITION', field: 'position', operator: 'EQ', value: 'CM' },
        { kind: 'CONDITION', field: 'goals_per90', operator: 'GTE', value: 0.05 },
        { kind: 'CONDITION', field: 'assists_per90', operator: 'GTE', value: 0.05 },
        {
          kind: 'COHORT_COMPARISON',
          metric: 'assists_per90',
          comparison: { type: 'RANK', operator: 'LTE', value: 15 },
          cohort: { context: true },
        },
      ],
    },
    pagination: { limit: 50, offset: 0 },
  };
  const resE = await sendQuery(queryE);
  console.log(`Status: ${resE.status}, Total: ${resE.body.pagination?.total}`);
  console.log(`Returned count: ${resE.body.items?.length}`);
  if (resE.body.items?.length > 0) {
    console.log(`Top player: ${resE.body.items[0].fullName} (${resE.body.items[0].primaryPosition})`);
  }
}

run().catch(console.error);
