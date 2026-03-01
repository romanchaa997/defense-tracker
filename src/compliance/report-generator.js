#!/usr/bin/env node
/**
 * Defense Tracker - Slack Report Generator
 * Генерує Slack Block Kit повідомлення з compliance результатів
 */

const fs = require('fs');

function generateSlackReport(complianceData) {
  const date = new Date(complianceData.timestamp).toISOString().split('T')[0];
  const status = complianceData.overall_status === 'PASS' ? '✅' : '❌';
  
  // Головний блок
  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `🛡️ Daily Compliance Report — ${date}`,
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Overall Status:* ${status} *${complianceData.overall_status}*\n*SLA Violations:* ${complianceData.sla_violations}`,
      },
    },
    { type: 'divider' },
  ];
  
  // 1️⃣ ClickUp trace_id
  const cu = complianceData.clickup;
  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `*1️⃣ ClickUp / trace_id*\n• Перевірено задач: ${cu.total}\n• Без trace_id: ${cu.without_trace_id}\n• sync_state=error: ${cu.sync_errors}`,
    },
  });
  
  // 2️⃣ ZK-Proofs
  const zk = complianceData.zk_proofs;
  const zkStatus = zk.compliant ? '✅' : '❌';
  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `*2️⃣ ZK-Proofs* ${zkStatus}\n• p95 latency: *${zk.p95_ms}ms* / ціль: <${zk.target_ms}ms\n• Успішних: ${zk.samples} | Невдалих: ${zk.failed}`,
    },
  });
  
  // 3️⃣ Slack Notifications
  const slack = complianceData.slack;
  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `*3️⃣ Slack Notifications*\n• Доставлено: ${slack.delivered}/${slack.delivered + slack.failed} (${slack.delivery_rate}%)\n• Невдалих webhook: ${slack.failed}`,
    },
  });
  
  // 4️⃣ Make.com
  const make = complianceData.make;
  const makeStatus = make.compliant ? '✅' : '❌';
  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `*4️⃣ Make.com Latency* ${makeStatus}\n• p95: *${make.p95_seconds}s* / ціль: <${make.target_seconds}s\n• Backlog: ${make.backlog} jobs`,
    },
  });
  
  // 5️⃣ Sync Rate
  const sync = complianceData.sync;
  const syncStatus = sync.compliant ? '✅' : '❌';
  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `*5️⃣ Sync Rate JIRA/ClickUp/GitHub* ${syncStatus}\n• Поточна: *${sync.sync_rate_percent}%* / ціль: ≥95%\n• Помилок: ${sync.errors} | Конфліктів: ${sync.conflicts}`,
    },
  });
  
  // 6️⃣ Diia / Monobank
  const diia = complianceData.diia;
  const diiaStatus = diia.healthy ? '✅' : '❌';
  const mono = complianceData.monobank;
  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `*6️⃣ Diia / Monobank API*\n• Diia OAuth: ${diiaStatus} (status: ${diia.status})\n• Monobank webhooks: ✅ (Останній: ${mono.last_webhook})`,
    },
  });
  
  // 7️⃣ Blockers
  blocks.push({ type: 'divider' });
  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: '*7️⃣ Blockers by Spaces*',
    },
  });
  
  const blockers = complianceData.blockers;
  for (const [space, items] of Object.entries(blockers)) {
    if (items.length === 0) continue;
    
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${space}*\n${items.map(i => `• ${i}`).join('\n')}`,
      },
    });
  }
  
  // Actionable Items
  const actionables = [];
  if (!zk.compliant) actionables.push('⚠️ Optimize ZK-proof generation (<500ms)');
  if (!make.compliant) actionables.push('⚠️ Investigate Make.com scenario delays');
  if (!sync.compliant) actionables.push('⚠️ Fix sync errors/conflicts in JIRA/ClickUp/GitHub');
  if (cu.sync_errors > 0) actionables.push(`⚠️ Resolve ${cu.sync_errors} ClickUp sync errors`);
  if (!diia.healthy) actionables.push('⚠️ Check Diia OAuth credentials/API health');
  
  if (actionables.length > 0) {
    blocks.push({ type: 'divider' });
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*📌 ACTIONABLE ITEMS:*\n${actionables.join('\n')}`,
      },
    });
  }
  
  // Footer
  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `Generated: ${complianceData.timestamp} | <https://github.com/romanchaa997/defense-tracker|View Repo>`,
      },
    ],
  });
  
  return {
    channel: process.env.SLACK_COMPLIANCE_CHANNEL_ID || 'C0123456789',
    blocks,
    text: `Compliance Report ${date} - ${complianceData.overall_status}`,
  };
}

// CLI інтерфейс
if (require.main === module) {
  const inputFile = process.argv[2];
  if (!inputFile) {
    console.error('Usage: node report-generator.js <compliance-report.json>');
    process.exit(1);
  }
  
  const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  const report = generateSlackReport(data);
  console.log(JSON.stringify(report, null, 2));
}

module.exports = { generateSlackReport };
