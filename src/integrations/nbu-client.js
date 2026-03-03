'use strict';

/**
 * NBU OpenData Client — Національний Банк України
 * REST API: https://bank.gov.ua/NBUStatService/v1/statdirectory
 * No auth required. JSON/XML formats.
 * Updated 2026-01-21: new field 'special' for USD rate conditions.
 * Docs: https://bank.gov.ua/en/open-data/api-dev
 */

const axios = require('axios');

const NBU_BASE = 'https://bank.gov.ua/NBUStatService/v1/statdirectory';

/**
 * Отримати курс валют на поточну дату
 * @returns {Promise<Array>} Масив об'єктів з полями: r030, cc, txt, rate, exchangedate, special
 */
async function getCurrentRates() {
  const res = await axios.get(`${NBU_BASE}/exchange`, {
    params: { json: true },
    timeout: 8000
  });
  return res.data;
}

/**
 * Курс на конкретну дату
 * @param {string} date - Формат YYYYMMDD
 * @returns {Promise<Array>}
 */
async function getRatesByDate(date) {
  const res = await axios.get(`${NBU_BASE}/exchange`, {
    params: { date, json: true },
    timeout: 8000
  });
  return res.data;
}

/**
 * Курс конкретної валюти на дату
 * @param {string} currency - Літерний код (usd, eur, тощо)
 * @param {string} [date] - Формат YYYYMMDD (необов'язково)
 * @returns {Promise<Object>}
 */
async function getRateByCurrency(currency, date) {
  const params = { valcode: currency, json: true };
  if (date) params.date = date;
  const res = await axios.get(`${NBU_BASE}/exchange`, { params, timeout: 8000 });
  return Array.isArray(res.data) ? res.data[0] : res.data;
}

/**
 * Перевести суму USD в UAH за поточним курсом
 * @param {number} usdAmount
 * @returns {Promise<number>}
 */
async function convertUsdToUah(usdAmount) {
  const rateObj = await getRateByCurrency('usd');
  if (!rateObj || !rateObj.rate) throw new Error('Cannot fetch USD rate from NBU');
  return usdAmount * rateObj.rate;
}

module.exports = { getCurrentRates, getRatesByDate, getRateByCurrency, convertUsdToUah };
