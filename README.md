# 🛡️ Defense Tracker — Compliance & Audit Automation Platform

> **UHIP 2A / Bobslaigh / AuditorSEC** — щоденний compliance-моніторинг із ZK-доказами, мульти-системною синхронізацією та Diia/Monobank інтеграцією.

---

## 📋 Зміст

- [Архітектура](#архітектура)
- [Компоненти](#компоненти)
- [Цілі SLA](#цілі-sla)
- [Структура репозиторію](#структура-репозиторію)
- [Налаштування](#налаштування)
- [Compliance Report](#compliance-report)
- [API Інтеграції](#api-інтеграції)
- [Blockers & Spaces](#blockers--spaces)

---

## 🏗️ Архітектура

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEFENSE TRACKER PLATFORM                     │
├──────────────┬──────────────┬──────────────┬────────────────────┤
│   ClickUp    │     JIRA     │    GitHub    │    Make.com        │
│  (trace_id)  │  (epics)     │  (PRs/code)  │  (orchestration)   │
└──────┬───────┴──────┬───────┴──────┬───────┴────────┬───────────┘
       │              │              │                │
       └──────────────┴──────────────┴────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │  Sync Engine       │
                    │  (≥95% rate)       │
                    │  trace_id linking  │
                    └─────────┬──────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
   ┌──────▼──────┐   ┌───────▼──────┐   ┌────────▼───────┐
   │  ZK-Proofs  │   │  Compliance  │   │  Notifications │
   │  <500ms     │   │  Report Gen  │   │  Slack/Webhook │
   │  Polygon/CF │   │  (daily)     │   │  #compliance   │
   └─────────────┘   └──────────────┘   └────────────────┘
          │
   ┌──────▼──────────────────────┐
   │  External APIs              │
   │  • Diia OAuth / eID         │
   │  • Monobank Webhooks (UAH)  │
   └─────────────────────────────┘
```

---

## ⚙️ Компоненти

| Компонент | Роль | SLA Ціль |
|-----------|------|----------|
| **ClickUp** | Task management з `trace_id` | 100% задач мають `trace_id` |
| **JIRA** | Épics & business requirements | sync ≥95% |
| **GitHub** | Code, PRs, CI/CD | sync ≥95% |
| **Make.com** | Scenario orchestration | latency <5 хв |
| **ZK-Proofs** | Audit proof generation | <500ms p95 |
| **Slack** | Notifications delivery | 100% delivery |
| **Diia** | Ukrainian eID / OAuth | 2xx responses |
| **Monobank** | Payment webhooks UAH | 0 fraud drops |

---

## 🎯 Цілі SLA

```yaml
zk_proof_generation_p95: 500ms
make_scenario_latency_p95: 300s  # 5 хвилин
sync_rate_minimum: 95%           # JIRA/ClickUp/GitHub
slack_delivery_rate: 100%
diia_api_uptime: 99.5%
monobank_webhook_delivery: 99.9%
```

---

## 📁 Структура репозиторію

```
defense-tracker/
├── .github/
│   ├── workflows/
│   │   ├── compliance-daily.yml      # Daily compliance report (06:00 UTC)
│   │   ├── sync-check.yml            # Sync rate validation
│   │   └── zk-proof-benchmark.yml    # ZK-proof latency tests
│   ├── ISSUE_TEMPLATE/
│   │   ├── blocker.md                # Blocker issue template
│   │   └── compliance-gap.md         # Compliance gap template
│   └── labels.yml                    # Label definitions
├── src/
│   ├── compliance/
│   │   ├── checker.js                # Main compliance checker
│   │   ├── zk-verifier.js            # ZK-proof timing verifier
│   │   ├── sync-validator.js         # JIRA/ClickUp/GitHub sync
│   │   └── report-generator.js       # Slack report formatter
│   ├── integrations/
│   │   ├── clickup-client.js         # ClickUp API (trace_id queries)
│   │   ├── jira-client.js            # JIRA REST API client
│   │   ├── github-client.js          # GitHub API client
│   │   ├── diia-client.js            # Diia OAuth integration
│   │   └── monobank-client.js        # Monobank webhook handler
│   └── utils/
│       ├── trace-id.js               # trace_id generator/validator
│       └── metrics.js                # Metrics aggregation
├── scripts/
│   ├── daily-report.sh               # Manual report trigger
│   ├── sync-audit.sh                 # Manual sync audit
│   └── bootstrap.sh                  # Initial setup script
├── config/
│   ├── spaces.json                   # ClickUp spaces config (ЕПІКА/BUSineSS/DEVTECH)
│   ├── make-scenarios.json           # Make.com scenario IDs
│   └── sla-thresholds.json           # SLA threshold definitions
├── docs/
│   ├── architecture.md               # Detailed architecture
│   ├── api-integrations.md           # Diia/Monobank setup guide
│   └── compliance-runbook.md         # Incident response runbook
└── README.md
```

---

## 🚀 Налаштування

### Необхідні секрети (GitHub Secrets)

```bash
# ClickUp
CLICKUP_API_TOKEN=pk_...
CLICKUP_AUDIT_LIST_ID=...
CLICKUP_TEAM_ID=...

# JIRA
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=...
JIRA_API_TOKEN=...

# GitHub
GH_COMPLIANCE_TOKEN=ghp_...

# Make.com
MAKE_API_TOKEN=...
MAKE_TEAM_ID=...

# ZK-Proofs
ZK_PROVING_KEY=...
ZK_VERIFIER_CONTRACT=0x...

# Slack
SLACK_BOT_TOKEN=xoxb-...
SLACK_COMPLIANCE_CHANNEL_ID=C...

# Diia
DIIA_CLIENT_ID=...
DIIA_CLIENT_SECRET=...
DIIA_OAUTH_URL=https://api2.diia.gov.ua/api/v1/auth

# Monobank
MONOBANK_TOKEN=...
MONOBANK_WEBHOOK_SECRET=...
```

### Швидкий старт

```bash
git clone https://github.com/romanchaa997/defense-tracker.git
cd defense-tracker
npm install
cp config/spaces.json.example config/spaces.json
# Заповніть secrets у .env або GitHub Secrets
./scripts/bootstrap.sh
```

---

## 📊 Compliance Report

Щоденний звіт генерується о **06:00 UTC** через GitHub Actions і публікується в **#compliance-daily** Slack-канал.

### Структура звіту

```
🛡️ DAILY COMPLIANCE REPORT — {DATE}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣ ClickUp / trace_id
   ✅ Перевірено задач: N
   ❌ Без trace_id: 0
   🔴 sync_state=error: 0

2️⃣ ZK-Proofs
   ⏱️ p95 latency: XXX ms / ціль: <500ms
   ✅ Успішних: N | ❌ Невдалих: 0

3️⃣ Slack Notifications
   ✅ Доставлено: N/N (100%)
   ❌ Невдалих webhook: 0

4️⃣ Make.com Latency
   ⏱️ p95: XXX s / ціль: <300s
   📋 Backlog: 0 jobs

5️⃣ Sync Rate JIRA/ClickUp/GitHub
   📈 Поточна: ZZ% / ціль: ≥95%
   ⚠️ Розбіжностей: 0

6️⃣ Diia / Monobank API
   ✅ Diia OAuth: OK (2xx)
   ✅ Monobank webhooks: OK

7️⃣ Blockers
   @ЕПІКА 1: {список або none}
   @BUSineSS: {список або none}
   @DEVTECH: {список або none}

📌 ACTIONABLE ITEMS:
   • ...
```

---

## 🔌 API Інтеграції

### Diia OAuth 2.0

```javascript
// Authorization flow
POST https://api2.diia.gov.ua/api/v1/auth/token
Content-Type: application/json
{
  "grant_type": "client_credentials",
  "client_id": process.env.DIIA_CLIENT_ID,
  "client_secret": process.env.DIIA_CLIENT_SECRET,
  "scope": "eresidency:read diia-id:verify"
}
// Token refresh: check exp, auto-renew 60s before expiry
```

### Monobank Webhooks

```javascript
// Webhook validation
X-Sign: base64(ed25519(body, MONOBANK_WEBHOOK_SECRET))
// Amount normalization: kopecks → UAH (divide by 100)
// Event types: StatementItem (payment), Error
```

### ClickUp trace_id Query

```javascript
// Filter tasks by trace_id custom field
GET /v2/list/{listId}/task?custom_fields=[{"field_id":"...","operator":"!=","value":""}]
// Track: trace_id, external_id, sync_state, source_system
```

---

## 🚧 Blockers & Spaces

| Space | Відповідальний | Поточні блокери | Пріоритет |
|-------|---------------|-----------------|----------|
| **@ЕПІКА 1** | DEVTECH Lead | PostgreSQL `migration_state` rollout; CF Worker edge-verify | 🔴 HIGH |
| **@BUSineSS** | Bizdev Lead | Diia eID for LLC AuditorSEC; Monobank terms sign-off | 🟡 MED |
| **@DEVTECH** | DevSecOps | GitHub webhook → Make endpoint; `ZK_PROVING_KEY` secret | 🔴 HIGH |

---

## 📅 Roadmap

- [ ] **v0.1** — Base compliance checker + Slack reporter
- [ ] **v0.2** — ZK-proof latency monitor + alerting
- [ ] **v0.3** — JIRA/ClickUp/GitHub sync validator (≥95%)
- [ ] **v0.4** — Diia OAuth + Monobank webhook integration
- [ ] **v1.0** — Full daily report automation + Make.com orchestration

---

## 📄 Ліцензія

MIT © 2026 romanchaa997 / AuditorSEC / UHIP 2A

---

> 🔒 **Security Notice**: Усі `trace_id`, ZK-ключі та OAuth credentials зберігаються виключно в GitHub Secrets / Vault. Ніколи не комітьте секрети в репозиторій.
