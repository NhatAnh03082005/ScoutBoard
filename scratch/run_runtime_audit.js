const http = require('http');

function sendRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        ...(payload ? {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        } : {})
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function runAudit() {
  const tests = [
    {
      id: 1,
      name: 'Single condition (goals >= 10)',
      method: 'QUERY',
      path: '/api/players',
      body: {
        query: {
          kind: 'GROUP',
          operator: 'AND',
          conditions: [
            { kind: 'CONDITION', field: 'goals', operator: 'GTE', value: 10 }
          ]
        },
        pagination: { limit: 2 }
      },
      expectedStatus: 200
    },
    {
      id: 2,
      name: 'AND condition (position == "CM" AND assists >= 3)',
      method: 'QUERY',
      path: '/api/players',
      body: {
        query: {
          kind: 'GROUP',
          operator: 'AND',
          conditions: [
            { kind: 'CONDITION', field: 'position', operator: 'EQ', value: 'CM' },
            { kind: 'CONDITION', field: 'assists', operator: 'GTE', value: 3 }
          ]
        },
        pagination: { limit: 2 }
      },
      expectedStatus: 200
    },
    {
      id: 3,
      name: 'Nested OR ((position == "ST" OR position == "LW") AND goals >= 8)',
      method: 'QUERY',
      path: '/api/players',
      body: {
        query: {
          kind: 'GROUP',
          operator: 'AND',
          conditions: [
            {
              kind: 'GROUP',
              operator: 'OR',
              conditions: [
                { kind: 'CONDITION', field: 'position', operator: 'EQ', value: 'ST' },
                { kind: 'CONDITION', field: 'position', operator: 'EQ', value: 'LW' }
              ]
            },
            { kind: 'CONDITION', field: 'goals', operator: 'GTE', value: 8 }
          ]
        },
        pagination: { limit: 2 }
      },
      expectedStatus: 200
    },
    {
      id: 4,
      name: 'Derived metric (pass_accuracy >= 85)',
      method: 'QUERY',
      path: '/api/players',
      body: {
        query: {
          kind: 'GROUP',
          operator: 'AND',
          conditions: [
            { kind: 'CONDITION', field: 'pass_accuracy', operator: 'GTE', value: 85 }
          ]
        },
        pagination: { limit: 2 }
      },
      expectedStatus: 200
    },
    {
      id: 5,
      name: 'BETWEEN operator (age BETWEEN [21, 24])',
      method: 'QUERY',
      path: '/api/players',
      body: {
        query: {
          kind: 'GROUP',
          operator: 'AND',
          conditions: [
            { kind: 'CONDITION', field: 'age', operator: 'BETWEEN', value: [21, 24] }
          ]
        },
        pagination: { limit: 2 }
      },
      expectedStatus: 200
    },
    {
      id: 6,
      name: 'Minimum sample constraint (minutes >= 900 AND goals_per90 >= 0.3)',
      method: 'QUERY',
      path: '/api/players',
      body: {
        query: {
          kind: 'GROUP',
          operator: 'AND',
          conditions: [
            { kind: 'CONDITION', field: 'minutes', operator: 'GTE', value: 900 },
            { kind: 'CONDITION', field: 'goals_per90', operator: 'GTE', value: 0.3 }
          ]
        },
        pagination: { limit: 2 }
      },
      expectedStatus: 200
    },
    {
      id: 7,
      name: 'Invalid field rejection (field: "non_existent_column")',
      method: 'QUERY',
      path: '/api/players',
      body: {
        query: {
          kind: 'GROUP',
          operator: 'AND',
          conditions: [
            { kind: 'CONDITION', field: 'non_existent_column', operator: 'EQ', value: 10 }
          ]
        }
      },
      expectedStatus: 400
    },
    {
      id: 8,
      name: 'Invalid operator rejection (goals WITH operator: "LIKE")',
      method: 'QUERY',
      path: '/api/players',
      body: {
        query: {
          kind: 'GROUP',
          operator: 'AND',
          conditions: [
            { kind: 'CONDITION', field: 'goals', operator: 'LIKE', value: '%10%' }
          ]
        }
      },
      expectedStatus: 400
    },
    {
      id: 9,
      name: 'SQL injection rejection (field: "goals; DROP TABLE players; --")',
      method: 'QUERY',
      path: '/api/players',
      body: {
        query: {
          kind: 'GROUP',
          operator: 'AND',
          conditions: [
            { kind: 'CONDITION', field: 'goals; DROP TABLE players; --', operator: 'EQ', value: 10 }
          ]
        }
      },
      expectedStatus: 400
    },
    {
      id: 10,
      name: 'GET /players regression test (GET /api/players?position=ST&limit=2)',
      method: 'GET',
      path: '/api/players?position=ST&limit=2',
      body: null,
      expectedStatus: 200
    }
  ];

  console.log('Starting 10 Runtime Verification Scenarios...\n');
  let passCount = 0;

  for (const t of tests) {
    try {
      const res = await sendRequest(t.method, t.path, t.body);
      const passed = res.status === t.expectedStatus;
      if (passed) passCount++;

      console.log(`[${passed ? 'PASS' : 'FAIL'}] Scenario ${t.id}: ${t.name}`);
      console.log(`  Method: ${t.method} ${t.path}`);
      console.log(`  Status: ${res.status} (Expected: ${t.expectedStatus})`);
      if (res.status === 200 && res.data?.pagination) {
        console.log(`  Items returned: ${res.data.items?.length}, Total matched: ${res.data.pagination.total}`);
      } else if (res.status >= 400) {
        console.log(`  Error Message: ${res.data?.message}`);
      }
      console.log('');
    } catch (e) {
      console.log(`[FAIL] Scenario ${t.id}: ${t.name}`);
      console.log(`  Error: ${e.message}\n`);
    }
  }

  console.log(`Summary: ${passCount} / ${tests.length} scenarios passed.`);
}

runAudit();
