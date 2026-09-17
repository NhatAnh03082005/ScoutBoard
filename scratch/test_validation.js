const http = require('http');

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

async function test() {
  console.log('--- Testing From > To validation rejection ---');
  const res1 = await sendQuery({
    query: {
      kind: 'CONDITION',
      field: 'goals_per90',
      operator: 'BETWEEN',
      value: [0.5, 0.2], // min > max!
    },
  });
  console.log('From > To status:', res1.status, res1.body.message);

  console.log('\n--- Testing non-numeric value rejection ---');
  const res2 = await sendQuery({
    query: {
      kind: 'CONDITION',
      field: 'goals_per90',
      operator: 'GTE',
      value: 'abc', // string on numeric metric
    },
  });
  console.log('Non-numeric status:', res2.status, res2.body.message);

  console.log('\n--- Testing invalid Top N rank value rejection ---');
  const res3 = await sendQuery({
    query: {
      kind: 'COHORT_COMPARISON',
      metric: 'goals_per90',
      comparison: { type: 'RANK', operator: 'LTE', value: -5 }, // negative rank
      cohort: { context: true },
    },
  });
  console.log('Negative rank status:', res3.status, res3.body.message);
}

test().catch(console.error);
