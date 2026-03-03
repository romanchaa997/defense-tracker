'use strict';

/**
 * Opendatabot Client — API державних реєстрів України
 * Реєстри: ЄДРПОУ, реєстр судових рішень, обтяжень, прав власності
 * Docs: https://opendatabot.ua/en/open/api
 * Auth: API Key in header or query
 * Pricing (2026): Corporate 18535 UAH+VAT/year, Test access 1 day
 * Verified: 2026-03-03
 */

const axios = require('axios');

const ODB_BASE = 'https://api.opendatabot.ua';

function getHeaders(apiKey) {
  return { 'x-api-key': apiKey || process.env.OPENDATABOT_API_KEY };
}

/**
 * Перевірка компанії за ЄДРПОУ
 * @param {string} edrpou - 8-значний код ЄДРПОУ
 * @param {string} [apiKey]
 */
async function getCompanyByEdrpou(edrpou, apiKey) {
  const res = await axios.get(`${ODB_BASE}/v1/company/${edrpou}`, {
    headers: getHeaders(apiKey),
    timeout: 10000
  });
  return res.data;
}

/**
 * Перевірка ФОП за ІПН
 * @param {string} ipn - Індивідуальний податковий номер
 * @param {string} [apiKey]
 */
async function getFopByIpn(ipn, apiKey) {
  const res = await axios.get(`${ODB_BASE}/v1/fop/${ipn}`, {
    headers: getHeaders(apiKey),
    timeout: 10000
  });
  return res.data;
}

/**
 * Пошук по назві компанії
 * @param {string} name
 * @param {string} [apiKey]
 */
async function searchCompany(name, apiKey) {
  const res = await axios.get(`${ODB_BASE}/v1/company`, {
    headers: getHeaders(apiKey),
    params: { name },
    timeout: 10000
  });
  return res.data;
}

/**
 * Перевірка на банкрутство / ліквідацію
 * @param {string} edrpou
 * @param {string} [apiKey]
 */
async function getBankruptcyStatus(edrpou, apiKey) {
  const company = await getCompanyByEdrpou(edrpou, apiKey);
  const status = company.data && company.data.status ? company.data.status : null;
  return {
    edrpou,
    status,
    isBankrupt: status && (status.includes('ліквід') || status.includes('банкрут'))
  };
}

/**
 * Повна перевірка контрагента (Compliance Due Diligence)
 * @param {string} edrpou
 * @param {string} [apiKey]
 */
async function runDueDiligence(edrpou, apiKey) {
  const [company, bankruptcy] = await Promise.all([
    getCompanyByEdrpou(edrpou, apiKey),
    getBankruptcyStatus(edrpou, apiKey)
  ]);
  return {
    edrpou,
    timestamp: new Date().toISOString(),
    company: company.data || null,
    bankruptcy,
    riskLevel: bankruptcy.isBankrupt ? 'HIGH' : 'LOW'
  };
}

module.exports = { getCompanyByEdrpou, getFopByIpn, searchCompany, getBankruptcyStatus, runDueDiligence };
