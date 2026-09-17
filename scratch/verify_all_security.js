const http = require('http');

function makeRequest({
  hostname = 'localhost',
  port = 80,
  path,
  method = 'GET',
  headers = {},
  body = null,
}) {
  return new Promise((resolve, reject) => {
    const payload = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
    const reqHeaders = { ...headers };
    if (payload) {
      reqHeaders['Content-Type'] = reqHeaders['Content-Type'] || 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const options = {
      hostname,
      port,
      path,
      method,
      headers: reqHeaders,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        let parsed = data;
        try {
          parsed = JSON.parse(data);
        } catch (_) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: parsed,
          rawBody: data,
        });
      });
    });

    req.on('error', reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function runComprehensiveVerification() {
  console.log('================================================================');
  console.log('      TASK 6.3 SECURITY VERIFICATION & RATE-LIMIT AUDIT');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // 1. HELMET HTTP DEFENSE HEADERS
  // ---------------------------------------------------------------------------
  console.log('=== 1. HELMET HTTP SECURITY HEADERS ===');
  const helmetRes = await makeRequest({ path: '/api/players?limit=1' });
  console.log(`Status: ${helmetRes.statusCode}`);
  const expectedHeaders = [
    'x-content-type-options',
    'x-frame-options',
    'referrer-policy',
    'x-dns-prefetch-control',
    'x-download-options',
    'x-permitted-cross-domain-policies',
    'cross-origin-opener-policy',
  ];
  let helmetOk = true;
  for (const h of expectedHeaders) {
    const val = helmetRes.headers[h];
    console.log(`  ${h}: ${val || 'MISSING'}`);
    if (!val) helmetOk = false;
  }
  console.log(`Helmet Header Evaluation: ${helmetOk ? '✅ PASS' : '❌ FAIL'}\n`);

  // ---------------------------------------------------------------------------
  // 2. CORS VERIFICATION (ALLOWED & DISALLOWED ORIGINS)
  // ---------------------------------------------------------------------------
  console.log('=== 2. CORS VERIFICATION ===');
  // 2.1 Allowed Origin
  const allowedRes = await makeRequest({
    path: '/api/players?limit=1',
    headers: { Origin: 'http://localhost' },
  });
  const allowOriginHeader = allowedRes.headers['access-control-allow-origin'];
  console.log(`2.1 Allowed Origin (http://localhost):`);
  console.log(`    Status: ${allowedRes.statusCode} (Expected: 200)`);
  console.log(`    Access-Control-Allow-Origin: ${allowOriginHeader || 'NONE'} (Expected: http://localhost)`);
  const allowedPass = allowedRes.statusCode === 200 && allowOriginHeader === 'http://localhost';

  // 2.2 Disallowed Origin
  const disallowedRes = await makeRequest({
    path: '/api/players?limit=1',
    headers: { Origin: 'https://malicious-attacker.com' },
  });
  const disallowOriginHeader = disallowedRes.headers['access-control-allow-origin'];
  console.log(`2.2 Disallowed Origin (https://malicious-attacker.com):`);
  console.log(`    Status: ${disallowedRes.statusCode} (Expected: 403 Forbidden)`);
  console.log(`    Access-Control-Allow-Origin: ${disallowOriginHeader || 'NONE'} (Expected: NONE)`);
  console.log(`    Response Body: ${JSON.stringify(disallowedRes.data)}`);
  const disallowedPass = disallowedRes.statusCode === 403 && !disallowOriginHeader;

  // 2.3 Preflight OPTIONS Disallowed Origin
  const optionsDisallowed = await makeRequest({
    path: '/api/auth/login',
    method: 'OPTIONS',
    headers: {
      Origin: 'https://malicious-attacker.com',
      'Access-Control-Request-Method': 'POST',
    },
  });
  const optDisallowOriginHeader = optionsDisallowed.headers['access-control-allow-origin'];
  console.log(`2.3 Preflight OPTIONS Disallowed Origin:`);
  console.log(`    Status: ${optionsDisallowed.statusCode} (Expected: 403 Forbidden)`);
  console.log(`    Access-Control-Allow-Origin: ${optDisallowOriginHeader || 'NONE'} (Expected: NONE)`);
  const optDisallowPass = optionsDisallowed.statusCode === 403 && !optDisallowOriginHeader;

  console.log(`CORS Evaluation: ${allowedPass && disallowedPass && optDisallowPass ? '✅ PASS' : '❌ FAIL'}\n`);

  // ---------------------------------------------------------------------------
  // 3. ISOLATED RATE-LIMIT TEST FOR POST /api/auth/login (10 req / 60s)
  // ---------------------------------------------------------------------------
  console.log('=== 3. ISOLATED AUTH RATE LIMIT TEST (POST /api/auth/login) ===');
  const authIp = `203.0.113.${Math.floor(Math.random() * 200) + 10}`;
  console.log(`Using fresh client tracker IP: ${authIp}`);
  console.log(`Target: Requests 1-10 allowed, Request 11 blocked with HTTP 429`);

  const authHits = [];
  for (let i = 1; i <= 12; i++) {
    const res = await makeRequest({
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'X-Forwarded-For': authIp,
      },
      body: {
        email: 'test_candidate@example.com',
        password: 'IncorrectPassword123!',
      },
    });
    const limit = res.headers['x-ratelimit-limit'];
    const remaining = res.headers['x-ratelimit-remaining'];
    const retryAfter = res.headers['retry-after'];
    console.log(
      `  Request #${String(i).padStart(2, ' ')}: Status ${res.statusCode} | Limit: ${limit || 'N/A'}, Remaining: ${remaining || 'N/A'}${retryAfter ? ` | Retry-After: ${retryAfter}s` : ''}`
    );
    authHits.push({ reqNum: i, status: res.statusCode });
  }

  const auth1to10Allowed = authHits.slice(0, 10).every((h) => h.status === 401);
  const auth11Blocked = authHits[10].status === 429;
  const auth12Blocked = authHits[11].status === 429;
  console.log(`Auth Rate Limit 1-10 Allowed: ${auth1to10Allowed ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Auth Rate Limit 11 Blocked (429): ${auth11Blocked ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Auth Rate Limit 12 Blocked (429): ${auth12Blocked ? '✅ PASS' : '❌ FAIL'}\n`);

  // ---------------------------------------------------------------------------
  // 4. AUTHENTICATE FOR QUERY AND ROLE MATRIX TESTS
  // ---------------------------------------------------------------------------
  console.log('=== 4. AUTHENTICATION & QUERY RATE LIMIT TEST ===');
  // Use distinct IP for acquiring tokens so it has a fresh tracker
  const adminIp = `198.51.100.${Math.floor(Math.random() * 200) + 10}`;
  const userIp = `198.51.100.${Math.floor(Math.random() * 200) + 10}`;

  const adminAuthRes = await makeRequest({
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'X-Forwarded-For': adminIp },
    body: { email: 'admin@scoutboard.com', password: 'Admin@123456' },
  });
  const adminToken = adminAuthRes.data?.accessToken;

  const userAuthRes = await makeRequest({
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'X-Forwarded-For': userIp },
    body: { email: 'test_user_qa@scoutboard.com', password: 'User@123456' },
  });
  const userToken = userAuthRes.data?.accessToken;

  console.log(`Admin Token: ${adminToken ? '✅ ACQUIRED' : '❌ FAILED'}`);
  console.log(`User Token:   ${userToken ? '✅ ACQUIRED' : '❌ FAILED'}\n`);

  // 4.1 QUERY /api/players Rate Limit (60 req / 60s)
  console.log('Testing QUERY /api/players Rate Limit (60 req / 60s)...');
  const queryIp = `192.0.2.${Math.floor(Math.random() * 200) + 10}`;
  const queryPayload = {
    query: {
      kind: 'CONDITION',
      field: 'goals_per90',
      operator: 'GTE',
      value: 0.1,
    },
    pagination: { limit: 1, offset: 0 },
  };

  let query200Count = 0;
  let first429Hit = null;
  for (let i = 1; i <= 62; i++) {
    const res = await makeRequest({
      path: '/api/players',
      method: 'QUERY',
      headers: {
        Authorization: `Bearer ${userToken}`,
        'X-Forwarded-For': queryIp,
      },
      body: queryPayload,
    });
    if (res.statusCode === 200) {
      query200Count++;
    } else if (res.statusCode === 429 && !first429Hit) {
      first429Hit = i;
    }
  }
  console.log(`  Requests 1-60 successful (HTTP 200): ${query200Count === 60 ? '✅ 60/60' : `❌ ${query200Count}/60`}`);
  console.log(`  Request 61 blocked with HTTP 429: ${first429Hit === 61 ? '✅ PASS (Hit #61)' : `❌ Hit #${first429Hit}`}`);

  // ---------------------------------------------------------------------------
  // 5. SECURITY REGRESSION MATRIX (TASK 5.1 VERIFICATION)
  // ---------------------------------------------------------------------------
  console.log('\n=== 5. SECURITY REGRESSION MATRIX ===');
  const matrix = [
    { name: 'QUERY /api/players (Anonymous)', path: '/api/players', method: 'QUERY', headers: {}, body: queryPayload, expected: 401 },
    { name: 'QUERY /api/players (Malformed JWT)', path: '/api/players', method: 'QUERY', headers: { Authorization: 'Bearer invalid.token' }, body: queryPayload, expected: 401 },
    { name: 'QUERY /api/players (USER role)', path: '/api/players', method: 'QUERY', headers: { Authorization: `Bearer ${userToken}` }, body: queryPayload, expected: 200 },
    { name: 'QUERY /api/players (ADMIN role)', path: '/api/players', method: 'QUERY', headers: { Authorization: `Bearer ${adminToken}` }, body: queryPayload, expected: 200 },
    { name: 'PATCH primary-position (Anonymous)', path: '/api/players/e0ecfd17-cd31-4c14-b918-55e2c2e2b1db/primary-position', method: 'PATCH', headers: {}, body: { positionCode: 'CB' }, expected: 401 },
    { name: 'PATCH primary-position (USER role)', path: '/api/players/e0ecfd17-cd31-4c14-b918-55e2c2e2b1db/primary-position', method: 'PATCH', headers: { Authorization: `Bearer ${userToken}` }, body: { positionCode: 'CB' }, expected: 403 },
    { name: 'PATCH primary-position (ADMIN role)', path: '/api/players/e0ecfd17-cd31-4c14-b918-55e2c2e2b1db/primary-position', method: 'PATCH', headers: { Authorization: `Bearer ${adminToken}` }, body: { positionCode: 'CB' }, expected: 200 },
    { name: 'GET /api/admin/users (Anonymous)', path: '/api/admin/users', method: 'GET', headers: {}, expected: 401 },
    { name: 'GET /api/admin/users (USER role)', path: '/api/admin/users', method: 'GET', headers: { Authorization: `Bearer ${userToken}` }, expected: 403 },
    { name: 'GET /api/admin/users (ADMIN role)', path: '/api/admin/users', method: 'GET', headers: { Authorization: `Bearer ${adminToken}` }, expected: 200 },
    { name: 'GET /api/admin/data-sync/jobs (Anonymous)', path: '/api/admin/data-sync/jobs', method: 'GET', headers: {}, expected: 401 },
    { name: 'GET /api/admin/data-sync/jobs (USER role)', path: '/api/admin/data-sync/jobs', method: 'GET', headers: { Authorization: `Bearer ${userToken}` }, expected: 403 },
    { name: 'GET /api/admin/data-sync/jobs (ADMIN role)', path: '/api/admin/data-sync/jobs', method: 'GET', headers: { Authorization: `Bearer ${adminToken}` }, expected: 200 },
    { name: 'GET /api/players (Public Baseline)', path: '/api/players?limit=1', method: 'GET', headers: {}, expected: 200 },
  ];

  let matrixAllPass = true;
  for (const item of matrix) {
    const res = await makeRequest({
      path: item.path,
      method: item.method,
      headers: item.headers,
      body: item.body,
    });
    const pass = res.statusCode === item.expected;
    if (!pass) matrixAllPass = false;
    console.log(`  ${item.name.padEnd(42, ' ')} -> Expected: ${item.expected} | Actual: ${res.statusCode} ${pass ? '✅' : '❌'}`);
  }
  console.log(`\nRegression Matrix Result: ${matrixAllPass ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

  console.log('\n================================================================');
  console.log('         ALL SECURITY AUDIT SUITES COMPLETED');
  console.log('================================================================');
}

runComprehensiveVerification().catch(console.error);
