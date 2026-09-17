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
    if (payload) req.write(payload);
    req.end();
  });
}

async function runLiveRegression() {
  console.log('--- RUNNING LIVE REGRESSION AUDIT ---');

  // 1. GET /players
  const res1 = await sendRequest('GET', '/api/players?limit=2');
  console.log(`1. GET /players: status=${res1.status}, total=${res1.data?.pagination?.total}`);

  // 2. QUERY /players (Basic Condition)
  const res2 = await sendRequest('QUERY', '/api/players', {
    query: {
      kind: 'GROUP',
      operator: 'AND',
      conditions: [{ kind: 'CONDITION', field: 'goals', operator: 'GTE', value: 5 }]
    },
    pagination: { limit: 2 }
  });
  console.log(`2. QUERY /players (Condition): status=${res2.status}, total=${res2.data?.pagination?.total}`);

  // 3. QUERY /players (Match Aggregation)
  const res3 = await sendRequest('QUERY', '/api/players', {
    query: {
      kind: 'GROUP',
      operator: 'AND',
      conditions: [
        {
          kind: 'MATCH_AGGREGATION',
          matchCriteria: { kind: 'CONDITION', field: 'match_rating', operator: 'GTE', value: 7 },
          aggregation: { type: 'COUNT', operator: 'GTE', value: 3 }
        }
      ]
    },
    pagination: { limit: 2 }
  });
  console.log(`3. QUERY /players (Match Aggregation): status=${res3.status}, total=${res3.data?.pagination?.total}`);

  // Fetch season id for La Liga
  const compRes = await sendRequest('GET', '/api/competitions');
  const laLiga = compRes.data.find(c => c.name === 'La Liga');
  const testSeason = { id: '1a85c0bf-470c-40ca-b6bf-9d448f217bcf' };

  // 4. QUERY /players (Cohort Comparison)
  const res4 = await sendRequest('QUERY', '/api/players', {
    query: {
      kind: 'GROUP',
      operator: 'AND',
      conditions: [
        {
          kind: 'COHORT_COMPARISON',
          metric: 'goals_per90',
          comparison: { type: 'AVERAGE', operator: 'GTE' },
          cohort: {
            competitionId: laLiga.id,
            seasonId: testSeason.id,
            position: ['ST', 'CF']
          }
        }
      ]
    },
    pagination: { limit: 2 }
  });
  console.log(`4. QUERY /players (Cohort Comparison): status=${res4.status}, total=${res4.data?.pagination?.total}`);

  // 5. QUERY /players (Full Composition)
  const res5 = await sendRequest('QUERY', '/api/players', {
    query: {
      kind: 'GROUP',
      operator: 'AND',
      conditions: [
        { kind: 'CONDITION', field: 'position', operator: 'EQ', value: 'ST' },
        { kind: 'CONDITION', field: 'minutes', operator: 'GTE', value: 500 },
        {
          kind: 'MATCH_AGGREGATION',
          matchCriteria: { kind: 'CONDITION', field: 'match_rating', operator: 'GTE', value: 6.5 },
          aggregation: { type: 'COUNT', operator: 'GTE', value: 2 }
        },
        {
          kind: 'COHORT_COMPARISON',
          metric: 'goals_per90',
          comparison: { type: 'AVERAGE', operator: 'GTE' },
          cohort: {
            competitionId: laLiga.id,
            seasonId: testSeason.id,
            position: ['ST']
          }
        }
      ]
    },
    pagination: { limit: 2 }
  });
  console.log(`5. QUERY /players (Full Composition): status=${res5.status}, total=${res5.data?.pagination?.total}`);
}

runLiveRegression().catch(console.error);
