'use strict';

/**
 * metrics.js — Збір та агрегація метрик SLA для Defense Tracker
 * SLA цілі:
 *   zk_proof_p95 < 500ms
 *   make_scenario_p95 < 300s
 *   sync_rate >= 95%
 *   slack_delivery = 100%
 *   diia_api_uptime >= 99.5%
 *   monobank_webhook_delivery >= 99.9%
 */

const SLA_THRESHOLDS = {
  zk_proof_p95_ms: 500,
  make_scenario_p95_s: 300,
  sync_rate_min_pct: 95,
  slack_delivery_pct: 100,
  diia_uptime_pct: 99.5,
  monobank_delivery_pct: 99.9
};

/**
 * Обчислює p95 з масиву латентностей (мілісекунди)
 * @param {number[]} latencies
 * @returns {number}
 */
function calcP95(latencies) {
  if (!latencies || latencies.length === 0) return 0;
  const sorted = [...latencies].sort((a, b) => a - b);
  const idx = Math.ceil(sorted.length * 0.95) - 1;
  return sorted[Math.max(0, idx)];
}

/**
 * Перевіряє всі SLA метрики
 * @param {Object} data
 * @param {number[]} data.zkLatencies - Латентності ZK-доведень (ms)
 * @param {number[]} data.makeLatencies - Латентності Make.com сценаріїв (s)
 * @param {number} data.syncedTasks - Кількість синхронізованих задач
 * @param {number} data.totalTasks - Загальна кількість задач
 * @param {number} data.slackDelivered - Доставлено повідомлень
 * @param {number} data.slackTotal - Всього повідомлень
 * @returns {Object} Результати перевірки
 */
function checkSLA(data) {
  const zkP95 = calcP95(data.zkLatencies || []);
  const makeP95 = calcP95(data.makeLatencies || []);
  const syncRate = data.totalTasks > 0
    ? (data.syncedTasks / data.totalTasks) * 100
    : 0;
  const slackRate = data.slackTotal > 0
    ? (data.slackDelivered / data.slackTotal) * 100
    : 100;

  const results = {
    timestamp: new Date().toISOString(),
    metrics: {
      zk_proof_p95_ms: { value: zkP95, threshold: SLA_THRESHOLDS.zk_proof_p95_ms, pass: zkP95 <= SLA_THRESHOLDS.zk_proof_p95_ms },
      make_scenario_p95_s: { value: makeP95, threshold: SLA_THRESHOLDS.make_scenario_p95_s, pass: makeP95 <= SLA_THRESHOLDS.make_scenario_p95_s },
      sync_rate_pct: { value: syncRate, threshold: SLA_THRESHOLDS.sync_rate_min_pct, pass: syncRate >= SLA_THRESHOLDS.sync_rate_min_pct },
      slack_delivery_pct: { value: slackRate, threshold: SLA_THRESHOLDS.slack_delivery_pct, pass: slackRate >= SLA_THRESHOLDS.slack_delivery_pct }
    }
  };

  results.allPassing = Object.values(results.metrics).every(m => m.pass);
  results.failingMetrics = Object.entries(results.metrics)
    .filter(([, v]) => !v.pass)
    .map(([k]) => k);

  return results;
}

/**
 * Формує рядок SLA статусу для Slack
 * @param {Object} slaResult - Результат checkSLA()
 * @returns {string}
 */
function formatSLAStatus(slaResult) {
  const lines = [];
  lines.push(`*SLA Status: ${slaResult.allPassing ? '✅ ALL PASSING' : '❌ FAILURES DETECTED'}*`);
  for (const [key, metric] of Object.entries(slaResult.metrics)) {
    const icon = metric.pass ? '✅' : '❌';
    lines.push(`${icon} ${key}: ${metric.value.toFixed(1)} (threshold: ${metric.threshold})`);
  }
  return lines.join('\n');
}

module.exports = { calcP95, checkSLA, formatSLAStatus, SLA_THRESHOLDS };
