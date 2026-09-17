const http = require('http');

function sendQuery(body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/players',
      method: 'QUERY',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        resolve({ status: res.statusCode, data: JSON.parse(data) });
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function testTrees() {
  const condA = { kind: 'CONDITION', field: 'goals', operator: 'GTE', value: 5 };
  const condB = { kind: 'CONDITION', field: 'assists', operator: 'GTE', value: 3 };
  const condC = { kind: 'CONDITION', field: 'minutes', operator: 'GTE', value: 500 };
  const condD = { kind: 'CONDITION', field: 'position', operator: 'EQ', value: 'ST' };

  // Tree 1: A AND B
  const tree1 = {
    kind: 'GROUP',
    operator: 'AND',
    conditions: [condA, condB]
  };

  // Tree 2: (A OR B) AND C
  const tree2 = {
    kind: 'GROUP',
    operator: 'AND',
    conditions: [
      { kind: 'GROUP', operator: 'OR', conditions: [condA, condB] },
      condC
    ]
  };

  // Tree 3: (A OR B) AND (C OR D)
  const tree3 = {
    kind: 'GROUP',
    operator: 'AND',
    conditions: [
      { kind: 'GROUP', operator: 'OR', conditions: [condA, condB] },
      { kind: 'GROUP', operator: 'OR', conditions: [condC, condD] }
    ]
  };

  // Tree 4: (A AND (B OR C)) OR D
  const tree4 = {
    kind: 'GROUP',
    operator: 'OR',
    conditions: [
      {
        kind: 'GROUP',
        operator: 'AND',
        conditions: [
          condA,
          { kind: 'GROUP', operator: 'OR', conditions: [condB, condC] }
        ]
      },
      condD
    ]
  };

  const trees = [
    { name: 'A AND B', node: tree1 },
    { name: '(A OR B) AND C', node: tree2 },
    { name: '(A OR B) AND (C OR D)', node: tree3 },
    { name: '(A AND (B OR C)) OR D', node: tree4 },
  ];

  for (const t of trees) {
    const res = await sendQuery({ query: t.node, pagination: { limit: 1 } });
    console.log(`[${res.status === 200 ? 'PASS' : 'FAIL'}] Tree "${t.name}": status ${res.status}, total matched: ${res.data?.pagination?.total}`);
  }
}

testTrees();
