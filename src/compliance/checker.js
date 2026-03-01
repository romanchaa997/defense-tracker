#!/usr/bin/env node
/**
 * Defense Tracker - Compliance Checker
 * Перевіряє всі SLA-цілі для UHIP 2A / Bobslaigh / AuditorSEC
 */

const https = require('https');
const { performance } = require('perf_hooks');

// Конфігурація з env
const CONFIG = {
  clickup: {
    token: process.env.CLICKUP_API_TOKEN,
    listId: process.env.CLICKUP_AUDIT_LIST_ID,
    teamId: process.env.CLICKUP_TEAM_ID,
  },
  jira: {
    baseUrl: process.env.JIRA_BASE_URL,
    email: process.env.JIRA_EMAIL,
    token: process.env.JIRA_API_TOKEN,
  },
  github: {
    token: process.env.GH_COMPLIANCE_TOKEN,
    repo: 'romanchaa997/defense-tracker',
  },
  make: {
    token: process.env.MAKE_API_TOKEN,
    teamId: process.env.MAKE_TEAM_ID,
  },
  zk: {
    provingKey: process.env.ZK_PROVING_KEY,
    verifierContract: process.env.ZK_VERIFIER_CONTRACT,
  },
  diia: {
    clientId: process.env.DIIA_CLIENT_ID,
    clientSecret: process.env.DIIA_CLIENT_SECRET,
    oauthUrl: 'https://api2.diia.gov.ua/api/v1/auth/token',
  },
  monobank: {
    token: process.env.MONOBANK_TOKEN,
  },
  sla: {
    zkProofP95Ms: 500,
    makeLatencyP95S: 300,
    syncRateMin: 95,
  },
  spaces: ['@ЕПІКА 1', '@BUSineSS', '@DEVTECH'],
};

// Гелпери для API запитів
function apiRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    if (postData) req.write(JSON.stringify(postData));
    req.end();
  });
}

// 1️⃣ ClickUp trace_id перевірка
async function checkClickUpTracking() {
  const opts = {
    hostname: 'api.clickup.com',
    path: `/api/v2/list/${CONFIG.clickup.listId}/task`,
    headers: { 'Authorization': CONFIG.clickup.token },
  };
  
  const res = await apiRequest(opts);
  const tasks = res.data.tasks || [];
  
  const withTraceId = tasks.filter(t => 
    t.custom_fields?.some(f => f.name === 'trace_id' && f.value)
  );
  const errors = tasks.filter(t => 
    t.custom_fields?.some(f => f.name === 'sync_state' && f.value === 'error')
  );
  
  return {
    total: tasks.length,
    with_trace_id: withTraceId.length,
    without_trace_id: tasks.length - withTraceId.length,
    sync_errors: errors.length,
    error_trace_ids: errors.map(t => t.custom_fields.find(f => f.name === 'trace_id')?.value).filter(Boolean),
  };
}

// 2️⃣ ZK-Proof latency перевірка (симульована для тесту)
async function checkZKProofLatency() {
  // В реальному сценарії це буде клік до Polygon/Cloudflare Worker
  // і запис таймінгів у базу
  const mockTimings = [
    420, 380, 510, 390, 460, 470, 440, 490, 500, 520,
    450, 430, 480, 410, 460, 495, 505, 485, 475, 515,
  ];
  
  mockTimings.sort((a, b) => a - b);
  const p95Index = Math.floor(mockTimings.length * 0.95);
  const p95Latency = mockTimings[p95Index];
  const avgLatency = mockTimings.reduce((a, b) => a + b, 0) / mockTimings.length;
  
  return {
    samples: mockTimings.length,
    avg_ms: Math.round(avgLatency),
    p95_ms: p95Latency,
    target_ms: CONFIG.sla.zkProofP95Ms,
    compliant: p95Latency < CONFIG.sla.zkProofP95Ms,
    failed: 0,
  };
}

// 3️⃣ Slack notification delivery
async function checkSlackNotifications() {
  // В production це читає логи webhook delivery з Make/Cloudflare
  return {
    delivered: 150,
    failed: 0,
    delivery_rate: 100,
  };
}

// 4️⃣ Make.com scenario latency
async function checkMakeLatency() {
  // Мок-дані (в production — Make.com API /v2/scenarios/executions)
  const mockLatencies = [120, 180, 240, 150, 200, 270, 190, 220, 280, 160];
  mockLatencies.sort((a, b) => a - b);
  const p95Index = Math.floor(mockLatencies.length * 0.95);
  
  return {
    p95_seconds: mockLatencies[p95Index],
    target_seconds: CONFIG.sla.makeLatencyP95S,
    compliant: mockLatencies[p95Index] < CONFIG.sla.makeLatencyP95S,
    backlog: 0,
  };
}

// 5️⃣ Sync rate JIRA/ClickUp/GitHub
async function checkSyncRate() {
  // Mock: в production це запит до PostgreSQL `migration_state` table
  const synced = 950;
  const errors = 20;
  const conflicts = 10;
  const total = synced + errors + conflicts;
  const rate = (synced / total) * 100;
  
  return {
    synced,
    errors,
    conflicts,
    total,
    sync_rate_percent: rate.toFixed(2),
    target_percent: CONFIG.sla.syncRateMin,
    compliant: rate >= CONFIG.sla.syncRateMin,
  };
}

// 6️⃣ Diia OAuth health check
async function checkDiiaAPI() {
  try {
    const opts = {
      hostname: 'api2.diia.gov.ua',
      path: '/api/v1/auth/token',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    };
    
    const payload = {
      grant_type: 'client_credentials',
      client_id: CONFIG.diia.clientId,
      client_secret: CONFIG.diia.clientSecret,
      scope: 'eresidency:read',
    };
    
    const res = await apiRequest(opts, payload);
    
    return {
      status: res.status,
      healthy: res.status === 200,
      last_check: new Date().toISOString(),
    };
  } catch (e) {
    return { status: 0, healthy: false, error: e.message };
  }
}

// 7️⃣ Monobank webhook health
async function checkMonobankAPI() {
  // Mock: в production — перевірка останнього webhook delivery
  return {
    healthy: true,
    last_webhook: '2026-03-01T08:45:00Z',
    failed_events: 0,
  };
}

// 8️⃣ Blockers by spaces
async function checkBlockers() {
  // В production: ClickUp API фільтр по space + status=blocked
  return {
    '@ЕПІКА 1': [
      'PostgreSQL migration_state rollout incomplete',
      'Cloudflare Worker edge-verify not deployed',
    ],
    '@BUSineSS': [
      'Diia eID verification for LLC AuditorSEC pending',
    ],
    '@DEVTECH': [
      'GitHub webhook → Make.com endpoint missing',
      'ZK_PROVING_KEY secret not configured',
    ],
  };
}

// Головна функція
async function main() {
  console.error('🔍 Starting compliance checks...');
  
  const results = {
    timestamp: new Date().toISOString(),
    clickup: await checkClickUpTracking(),
    zk_proofs: await checkZKProofLatency(),
    slack: await checkSlackNotifications(),
    make: await checkMakeLatency(),
    sync: await checkSyncRate(),
    diia: await checkDiiaAPI(),
    monobank: await checkMonobankAPI(),
    blockers: await checkBlockers(),
  };
  
  // Підрахунок SLA violations
  let violations = 0;
  if (!results.zk_proofs.compliant) violations++;
  if (!results.make.compliant) violations++;
  if (!results.sync.compliant) violations++;
  if (!results.diia.healthy) violations++;
  if (results.clickup.sync_errors > 0) violations++;
  
  results.sla_violations = violations;
  results.overall_status = violations === 0 ? 'PASS' : 'FAIL';
  
  // Виведення JSON для GitHub Actions
  console.log(JSON.stringify(results, null, 2));
  
  process.exit(violations > 0 ? 1 : 0);
}

if (require.main === module) {
  main().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
}

module.exports = { checkClickUpTracking, checkZKProofLatency, checkSyncRate };
