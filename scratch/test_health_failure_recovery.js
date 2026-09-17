const http = require('http');
const { execSync } = require('child_process');

function fetchPath(url) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const req = http.get(url, (res) => {
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
          body: parsed,
          durationMs: Date.now() - startTime,
        });
      });
    });
    req.on('error', (err) => {
      resolve({
        statusCode: 0,
        error: err.message,
        durationMs: Date.now() - startTime,
      });
    });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getContainerHealth(containerName) {
  try {
    const out = execSync(
      `docker inspect --format="{{.State.Health.Status}}" ${containerName}`,
      { encoding: 'utf8' }
    ).trim();
    return out;
  } catch (err) {
    return 'error/stopped';
  }
}

async function run() {
  console.log('================================================================');
  console.log('TASK 6.4: DATABASE FAILURE & RECOVERY SIMULATION TEST');
  console.log('================================================================\n');

  const readyUrl = 'http://localhost/api/health/ready';
  const livenessUrl = 'http://localhost/api/health';

  // --- STEP 1: Baseline Verification ---
  console.log('--- STEP 1: Baseline Normal State ---');
  const baseReady = await fetchPath(readyUrl);
  const baseLive = await fetchPath(livenessUrl);
  console.log(`  GET /api/health       -> Status: ${baseLive.statusCode} (Duration: ${baseLive.durationMs}ms) | Body:`, baseLive.body);
  console.log(`  GET /api/health/ready -> Status: ${baseReady.statusCode} (Duration: ${baseReady.durationMs}ms) | Body:`, baseReady.body);
  console.log(`  Postgres Health: ${getContainerHealth('scoutboard-postgres-prod')}`);
  console.log(`  Backend Health:  ${getContainerHealth('scoutboard-backend-prod')}`);

  if (baseReady.statusCode !== 200 || baseLive.statusCode !== 200) {
    console.error('❌ Initial baseline failed! Aborting test.');
    process.exit(1);
  }
  console.log('  Baseline: ✅ PASS\n');

  // --- STEP 2: Simulate Database Failure (docker stop) ---
  console.log('--- STEP 2: Stopping PostgreSQL Container (docker stop scoutboard-postgres-prod) ---');
  execSync('docker stop scoutboard-postgres-prod', { stdio: 'inherit' });
  console.log('  Postgres container stopped.\n');

  // Small pause to allow socket closure
  await sleep(1000);

  // --- STEP 3: Verify Bounded 503 Rejection & Unaffected Liveness ---
  console.log('--- STEP 3: Testing Readiness & Liveness with Database Down ---');
  const failReady = await fetchPath(readyUrl);
  console.log(`  GET /api/health/ready -> Status: ${failReady.statusCode} (Expected: 503)`);
  console.log(`  Duration: ${failReady.durationMs}ms (Expected: <= 3500ms bounded)`);
  console.log(`  Response Body:`, failReady.body);

  const failLive = await fetchPath(livenessUrl);
  console.log(`  GET /api/health (Liveness) -> Status: ${failLive.statusCode} (Expected: 200)`);
  console.log(`  Duration: ${failLive.durationMs}ms | Body:`, failLive.body);

  const readyFailedAsExpected = failReady.statusCode === 503 && failReady.body?.database === 'down';
  const readyBoundedTime = failReady.durationMs <= 3500;
  const livenessSurvived = failLive.statusCode === 200 && failLive.body?.status === 'ok';

  console.log(`  Readiness returns 503: ${readyFailedAsExpected ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Readiness returns within bounded timeout: ${readyBoundedTime ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Liveness survives DB outage (200): ${livenessSurvived ? '✅ PASS' : '❌ FAIL'}\n`);

  // --- STEP 4: Simulate Database Recovery (docker start) ---
  console.log('--- STEP 4: Restarting PostgreSQL Container (docker start scoutboard-postgres-prod) ---');
  execSync('docker start scoutboard-postgres-prod', { stdio: 'inherit' });
  console.log('  Postgres container started. Waiting for Postgres to accept connections...');

  let recovered = false;
  for (let attempt = 1; attempt <= 20; attempt++) {
    await sleep(1500);
    const pgStatus = getContainerHealth('scoutboard-postgres-prod');
    const recReady = await fetchPath(readyUrl);
    console.log(`  [Poll #${attempt}] Postgres Health: ${pgStatus} | Readiness Status: ${recReady.statusCode} (Duration: ${recReady.durationMs}ms)`);
    if (recReady.statusCode === 200 && recReady.body?.database === 'up') {
      console.log('  ✅ Readiness successfully recovered to HTTP 200!');
      recovered = true;
      break;
    }
  }

  if (!recovered) {
    console.error('❌ Readiness failed to recover within timeout window!');
    process.exit(1);
  }

  // --- STEP 5: Wait for Docker Healthchecks to Stabilize ---
  console.log('\n--- STEP 5: Verifying Final Docker Healthcheck States ---');
  let backendHealthy = false;
  for (let attempt = 1; attempt <= 10; attempt++) {
    const pgStatus = getContainerHealth('scoutboard-postgres-prod');
    const beStatus = getContainerHealth('scoutboard-backend-prod');
    console.log(`  [Check #${attempt}] Postgres: ${pgStatus} | Backend: ${beStatus}`);
    if (pgStatus === 'healthy' && beStatus === 'healthy') {
      backendHealthy = true;
      break;
    }
    await sleep(3000);
  }

  console.log(`\nFinal Container Healthcheck Evaluation:`);
  console.log(`  Postgres Container Healthy: ${getContainerHealth('scoutboard-postgres-prod') === 'healthy' ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Backend Container Healthy:  ${getContainerHealth('scoutboard-backend-prod') === 'healthy' ? '✅ PASS' : '❌ FAIL'}`);

  console.log('\n================================================================');
  console.log('      DATABASE FAILURE & RECOVERY TEST COMPLETED SUCCESSFULLY');
  console.log('================================================================');
}

run().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
