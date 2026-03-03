'use strict';

/**
 * NAZK Client — ЄДИНИЙ ДЕРЖАВНИЙ РЕЄСТР ДЕКЛАРАЦІЙ
 * Public API: https://public-api.nazk.gov.ua/v2
 * No auth required. JSON format.
 * Verified: 2026-03-03
 */

const axios = require('axios');

const NAZK_BASE = 'https://public-api.nazk.gov.ua/v2';

/**
 * Отримати декларацію за document_id
 * @param {string} documentId - UUID документа
 */
async function getDeclaration(documentId) {
  const url = `${NAZK_BASE}/documents/${documentId}`;
  const res = await axios.get(url, { timeout: 10000 });
  if (res.data.error) throw new Error(`NAZK error: ${res.data.error}`);
  return res.data;
}

/**
 * Пошук декларацій за параметрами
 * @param {Object} params
 * @param {string} [params.query] - Пошуковий запит (3-255 символів)
 * @param {number} [params.user_declarant_id] - ID суб'єкта (1-10000000)
 * @param {number} [params.declaration_type] - Тип декларації (1-4)
 * @param {number} [params.declaration_year] - Рік (2015-поточний)
 * @param {number} [params.start_date] - UNIX timestamp початку
 * @param {number} [params.end_date] - UNIX timestamp кінця
 * @param {number} [params.page] - Сторінка (1-100)
 */
async function searchDeclarations(params = {}) {
  const url = `${NAZK_BASE}/documents/list`;
  const res = await axios.get(url, { params, timeout: 10000 });
  if (res.data.error) throw new Error(`NAZK error: ${res.data.error}`);
  return res.data;
}

/**
 * Отримати список країн (довідник)
 */
async function getCountriesList() {
  const res = await axios.get(`${NAZK_BASE}/countries/list`, { timeout: 5000 });
  return res.data;
}

/**
 * Red-flag аналіз декларації
 * Повертає масив знайдених порушень
 * @param {Object} declaration - Об'єкт декларації з НАЗК API
 */
function analyzeRedFlags(declaration) {
  const flags = [];
  const data = declaration.data || {};

  // Крок 11: доходи
  const incomeStep = data['step_11'] && data['step_11'].data ? data['step_11'].data : [];
  const totalIncome = incomeStep.reduce((sum, item) => sum + (Number(item.sizeIncome) || 0), 0);

  // Крок 6: майно (нерухомість)
  const estateStep = data['step_6'] && data['step_6'].data ? data['step_6'].data : [];
  const estateCount = estateStep.length;

  // Крок 13: витрати
  const expenseStep = data['step_13'] && data['step_13'].data ? data['step_13'].data : [];
  const totalExpenses = expenseStep.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  if (totalIncome > 0 && totalExpenses > totalIncome * 1.5) {
    flags.push({
      type: 'EXPENSE_EXCEEDS_INCOME',
      severity: 'HIGH',
      detail: `Витрати (${totalExpenses}) перевищують доходи (${totalIncome}) більш ніж в 1.5 рази`
    });
  }

  if (estateCount > 5) {
    flags.push({
      type: 'EXCESSIVE_REAL_ESTATE',
      severity: 'MEDIUM',
      detail: `Задекларовано ${estateCount} об'єктів нерухомості`
    });
  }

  const corruptionAffected = declaration.corruption_affected;
  if (corruptionAffected === true || corruptionAffected === 1) {
    flags.push({
      type: 'CORRUPTION_AFFECTED_POSITION',
      severity: 'HIGH',
      detail: 'Відповідальне становище, схильне до корупції (НАЗК класифікація)'
    });
  }

  return flags;
}

module.exports = { getDeclaration, searchDeclarations, getCountriesList, analyzeRedFlags };
