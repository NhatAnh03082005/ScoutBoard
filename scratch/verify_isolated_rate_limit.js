const http = require('http');

function postLogin(clientIp, email = 'bad_user@example.com', password = 'WrongPassword123') {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ email, password });
    const req = http.request(
      {
        hostname: 'localhost',
        port: 80,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'X-Forwarded-For': clientIp,
        },
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(body);
          } catch (_) {
            parsed = body;
          }
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsed,
          });
        });
      },
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function getPlayers(clientIp) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: 80,
        path: '/api/players?limit=1',
        method: 'GET',
        headers: {
          'X-Forwarded-For': clientIp,
        },
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
          });
        });
      },
    );
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  const uniqueIp = `198.51.100.${Math.floor(Math.random() * 200) + 10}`;
  console.log(`================================================================`);
  console.log(`ISOLATED RATE-LIMIT TEST FOR POST /api/auth/login`);
  console.log(`Using fresh client tracker IP: ${uniqueIp}`);
  console.log(`Configured Limit: 10 requests / 60 seconds`);
  console.log(`================================================================\n`);

  console.log(`Sending requests 1 through 12 to POST /api/auth/login...`);
  const results = [];

  for (let i = 1; i <= 12; i++) {
    const res = await postLogin(uniqueIp);
    const retryAfter = res.headers['retry-after'];
    const limitHeader = res.headers['x-ratelimit-limit'];
    const remainingHeader = res.headers['x-ratelimit-remaining'];
    console.log(
      `  Request #${String(i).padStart(2, ' ')}: Status ${res.statusCode} | Limit: ${limitHeader || 'N/A'}, Remaining: ${remainingHeader || 'N/A'}${retryAfter ? ` | Retry-After: ${retryAfter}` : ''} | Msg: ${res.body?.message || ''}`
    );
    results.push({
      requestNum: i,
      statusCode: res.statusCode,
      retryAfter,
    });
  }

  console.log('\n--- VERIFICATION ASSERTIONS ---');
  const req1to10Allowed = results.slice(0, 10).every((r) => r.statusCode === 401);
  const req11Blocked = results[10].statusCode === 429;
  const req12Blocked = results[11].statusCode === 429;

  console.log(`Requests 1-10 allowed (Status 401 invalid creds, not rate limited): ${req1to10Allowed ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Request 11 blocked (Status 429 Too Many Requests): ${req11Blocked ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Request 12 blocked (Status 429 Too Many Requests): ${req12Blocked ? '✅ PASS' : '❌ FAIL'}`);

  console.log('\n--- TESTING CLIENT TRACKER ISOLATION (DIFFERENT IP) ---');
  const distinctIp = `198.51.100.${Math.floor(Math.random() * 200) + 10}`;
  const distinctRes = await postLogin(distinctIp);
  console.log(`Request #1 from distinct IP ${distinctIp}: Status ${distinctRes.statusCode} (Expected: 401) -> ${distinctRes.statusCode === 401 ? '✅ PASS' : '❌ FAIL'}`);

  console.log('\n--- TESTING ROUTE ISOLATION (GLOBAL VS AUTH LIMIT) ---');
  const playersRes = await getPlayers(uniqueIp);
  console.log(`GET /api/players from rate-limited IP ${uniqueIp}: Status ${playersRes.statusCode} (Expected: 200) -> ${playersRes.statusCode === 200 ? '✅ PASS' : '❌ FAIL'}`);
}

main().catch(console.error);
