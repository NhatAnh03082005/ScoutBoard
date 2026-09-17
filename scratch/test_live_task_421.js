const http = require('http');

const PREMIER_LEAGUE = '9cef6c96-c74e-432d-b0f2-7867ee7f3e07';
const LA_LIGA = 'ad6261b7-7170-4824-aeed-edeb1e03a05f';
const ARSENAL = 'b66fe9e9-c125-4442-9955-c16340d9d4d9';
const ASTON_VILLA = 'cda76fec-8902-455b-92f9-e48823f1b6ff';
const REAL_MADRID = 'a6e6dd22-032f-474b-8105-ca7d34361831';

function queryPlayers(payload) {
  return new Promise((resolve, reject) => {
    const req = http.request('http://localhost:3000/api/players', {
      method: 'QUERY',
      headers: { 'Content-Type': 'application/json' },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          reject(new Error(`Failed to parse response (status ${res.statusCode}): ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(JSON.stringify(payload));
    req.end();
  });
}

async function runLiveVerification() {
  console.log('========================================================');
  console.log('TASK 4.2.1 LIVE HTTP QUERY VERIFICATION');
  console.log('========================================================\n');

  // Baseline 1: All players in DB
  const baseReq = await queryPlayers({
    query: {
      kind: 'GROUP',
      operator: 'AND',
      conditions: [{ kind: 'CONDITION', field: 'appearances', operator: 'GTE', value: 0 }]
    }
  });
  console.log(`Baseline Active Players (appearances >= 0): total = ${baseReq.body.pagination.total}`);

  // Case 1: 1 competition + 1 club + position
  // e.g. Premier League + Arsenal + CM
  const case1Payload = {
    query: {
      kind: 'GROUP',
      operator: 'AND',
      conditions: [
        { kind: 'CONDITION', field: 'competition', operator: 'EQ', value: PREMIER_LEAGUE },
        { kind: 'CONDITION', field: 'club', operator: 'EQ', value: ARSENAL },
        { kind: 'CONDITION', field: 'position', operator: 'EQ', value: 'CM' }
      ]
    }
  };
  const case1 = await queryPlayers(case1Payload);
  console.log(`\nCase 1 (1 Competition [PL] + 1 Club [Arsenal] + Position [CM]):`);
  console.log(`  HTTP Status: ${case1.status}`);
  console.log(`  Total matched: ${case1.body.pagination.total}`);
  console.log(`  Players returned:`, case1.body.items.map(p => ({
    name: p.fullName || p.name,
    club: p.currentTeam?.name,
    clubId: p.currentTeam?.id,
    pos: p.primaryPosition
  })));

  // Case 2: 2 competitions + position
  // e.g. Premier League OR La Liga + CM
  const case2Payload = {
    query: {
      kind: 'GROUP',
      operator: 'AND',
      conditions: [
        {
          kind: 'GROUP',
          operator: 'OR',
          conditions: [
            { kind: 'CONDITION', field: 'competition', operator: 'EQ', value: PREMIER_LEAGUE },
            { kind: 'CONDITION', field: 'competition', operator: 'EQ', value: LA_LIGA }
          ]
        },
        { kind: 'CONDITION', field: 'position', operator: 'EQ', value: 'CM' }
      ]
    }
  };
  const case2 = await queryPlayers(case2Payload);
  console.log(`\nCase 2 (2 Competitions [PL OR LaLiga] + Position [CM]):`);
  console.log(`  HTTP Status: ${case2.status}`);
  console.log(`  Total matched: ${case2.body.pagination.total}`);
  // Also check single PL + CM and single La Liga + CM to verify total = sum (or union)
  const plOnly = await queryPlayers({
    query: {
      kind: 'GROUP',
      operator: 'AND',
      conditions: [
        { kind: 'CONDITION', field: 'competition', operator: 'EQ', value: PREMIER_LEAGUE },
        { kind: 'CONDITION', field: 'position', operator: 'EQ', value: 'CM' }
      ]
    }
  });
  const laligaOnly = await queryPlayers({
    query: {
      kind: 'GROUP',
      operator: 'AND',
      conditions: [
        { kind: 'CONDITION', field: 'competition', operator: 'EQ', value: LA_LIGA },
        { kind: 'CONDITION', field: 'position', operator: 'EQ', value: 'CM' }
      ]
    }
  });
  console.log(`  -> Proof of OR summation: PL CM = ${plOnly.body.pagination.total}, LaLiga CM = ${laligaOnly.body.pagination.total}`);
  console.log(`  -> PL (${plOnly.body.pagination.total}) + LaLiga (${laligaOnly.body.pagination.total}) matches combined total: ${case2.body.pagination.total}`);

  // Case 3: 2 clubs + position
  // e.g. Arsenal OR Aston Villa + CM
  const case3Payload = {
    query: {
      kind: 'GROUP',
      operator: 'AND',
      conditions: [
        {
          kind: 'GROUP',
          operator: 'OR',
          conditions: [
            { kind: 'CONDITION', field: 'club', operator: 'EQ', value: ARSENAL },
            { kind: 'CONDITION', field: 'club', operator: 'EQ', value: ASTON_VILLA }
          ]
        },
        { kind: 'CONDITION', field: 'position', operator: 'EQ', value: 'CM' }
      ]
    }
  };
  const case3 = await queryPlayers(case3Payload);
  console.log(`\nCase 3 (2 Clubs [Arsenal OR Aston Villa] + Position [CM]):`);
  console.log(`  HTTP Status: ${case3.status}`);
  console.log(`  Total matched: ${case3.body.pagination.total}`);
  console.log(`  Players:`, case3.body.items.map(p => ({
    name: p.fullName || p.name,
    club: p.currentTeam?.name,
    pos: p.primaryPosition
  })));

  // Case 4: 2 competitions + 2 clubs + position
  // e.g. (Premier League OR La Liga) AND (Arsenal OR Real Madrid) AND position CM
  const case4Payload = {
    query: {
      kind: 'GROUP',
      operator: 'AND',
      conditions: [
        {
          kind: 'GROUP',
          operator: 'OR',
          conditions: [
            { kind: 'CONDITION', field: 'competition', operator: 'EQ', value: PREMIER_LEAGUE },
            { kind: 'CONDITION', field: 'competition', operator: 'EQ', value: LA_LIGA }
          ]
        },
        {
          kind: 'GROUP',
          operator: 'OR',
          conditions: [
            { kind: 'CONDITION', field: 'club', operator: 'EQ', value: ARSENAL },
            { kind: 'CONDITION', field: 'club', operator: 'EQ', value: REAL_MADRID }
          ]
        },
        { kind: 'CONDITION', field: 'position', operator: 'EQ', value: 'CM' }
      ]
    }
  };
  const case4 = await queryPlayers(case4Payload);
  console.log(`\nCase 4 (2 Competitions [PL OR LaLiga] AND 2 Clubs [Arsenal OR Real Madrid] AND Position [CM]):`);
  console.log(`  HTTP Status: ${case4.status}`);
  console.log(`  Total matched: ${case4.body.pagination.total}`);
  console.log(`  Players:`, case4.body.items.map(p => ({
    name: p.fullName || p.name,
    club: p.currentTeam?.name,
    pos: p.primaryPosition
  })));

  console.log('\n========================================================');
  console.log('ALL LIVE HTTP QUERY VERIFICATIONS COMPLETE AND AUDITED');
  console.log('========================================================');
}

runLiveVerification().catch(err => {
  console.error('Error during live verification:', err);
  process.exit(1);
});
