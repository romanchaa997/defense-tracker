#!/usr/bin/env bash
# bootstrap.sh — Початкове налаштування Defense Tracker
# Виконуй: ./scripts/bootstrap.sh
set -euo pipefail

COLOR_GREEN='\033[0;32m'
COLOR_YELLOW='\033[1;33m'
COLOR_RED='\033[0;31m'
NC='\033[0m'

log_ok()   { echo -e "${COLOR_GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${COLOR_YELLOW}[WARN]${NC} $1"; }
log_err()  { echo -e "${COLOR_RED}[ERR]${NC} $1"; }

echo ""
echo "========================================="
echo " Defense Tracker — Bootstrap"
echo " AuditorSEC / UHIP 2A / Bobslaigh"
echo "=========================================" 
echo ""

# 1. Перевірка Node.js
if ! command -v node &>/dev/null; then
  log_err "Node.js not found. Install Node.js 20+"
  exit 1
fi
NODE_VER=$(node -e "process.stdout.write(process.versions.node)")
log_ok "Node.js $NODE_VER"

# 2. Інсталяція залежностей
echo ""
echo "Інсталюю dependencies..."
npm ci
log_ok "Dependencies installed"

# 3. Перевірка .env
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    log_warn ".env created from .env.example — Заповніть secrets!"
  else
    log_warn ".env not found. Create it with required secrets."
    cat > .env << 'EOF'
# Defense Tracker — Environment Variables
# See README.md for full description

# ClickUp
CLICKUP_API_TOKEN=pk_...
CLICKUP_AUDIT_LIST_ID=
CLICKUP_TEAM_ID=

# JIRA
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=
JIRA_API_TOKEN=

# GitHub
GH_COMPLIANCE_TOKEN=ghp_...

# Make.com
MAKE_API_TOKEN=
MAKE_TEAM_ID=

# Slack
SLACK_BOT_TOKEN=xoxb-...
SLACK_COMPLIANCE_CHANNEL_ID=C...

# Diia (BLOCKER: requires LLC AuditorSEC contract)
DIIA_CLIENT_ID=
DIIA_CLIENT_SECRET=
DIIA_OAUTH_URL=https://api2.diia.gov.ua/api/v1/auth

# Monobank (requires terms sign-off)
MONOBANK_TOKEN=
MONOBANK_WEBHOOK_SECRET=

# Opendatabot (test access: 1 day, corporate: 18535 UAH+VAT/year)
OPENDATABOT_API_KEY=

# ZK-Proofs (BLOCKER: ZK_PROVING_KEY must be set in GitHub Secrets)
ZK_PROVING_KEY=
ZK_VERIFIER_CONTRACT=0x...
EOF
    log_ok ".env template created"
  fi
else
  log_ok ".env exists"
fi

# 4. Перевірка NAZK API (no auth required)
echo ""
echo "Перевіряю API availability..."
NAZK_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  "https://public-api.nazk.gov.ua/v2/countries/list" 2>/dev/null || echo "000")
if [ "$NAZK_STATUS" = "200" ]; then
  log_ok "NAZK API: UP ($NAZK_STATUS)"
else
  log_warn "NAZK API: $NAZK_STATUS (check network)"
fi

# 5. Перевірка NBU API (no auth required)
NBU_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  "https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json" 2>/dev/null || echo "000")
if [ "$NBU_STATUS" = "200" ]; then
  log_ok "NBU OpenData API: UP ($NBU_STATUS)"
else
  log_warn "NBU API: $NBU_STATUS (check network)"
fi

# 6. Створення директорії reports/
mkdir -p reports
log_ok "reports/ directory ready"

echo ""
echo "========================================="
echo " Bootstrap завершено!"
echo ""
echo " Наступні кроки:"
echo " 1. Заповніть .env секретами"
echo " 2. npm test (запуск compliance checker)"
echo " 3. ./scripts/daily-report.sh (ручний compliance звіт)"
echo ""
echo " Блокери (README):"
echo " - Diia eID: підпишіть договір UBKI / активуйте Diia eID для LLC AuditorSEC"
echo " - ZK_PROVING_KEY: додайте в GitHub Secrets"
echo "=========================================" 
echo ""
