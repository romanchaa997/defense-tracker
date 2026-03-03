'use strict';

/**
 * trace-id.js — Генерація та валідація trace_id для Defense Tracker
 * Format: DT-{YYYY}{MM}{DD}-{6 random hex chars}
 * Example: DT-20260303-a1b2c3
 */

const { randomBytes } = require('crypto');

/**
 * Генерує новий trace_id
 * @returns {string} Наприклад: DT-20260303-a1b2c3
 */
function generate() {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randPart = randomBytes(3).toString('hex');
  return `DT-${datePart}-${randPart}`;
}

/**
 * Валідує формат trace_id
 * @param {string} traceId
 * @returns {boolean}
 */
function isValid(traceId) {
  if (!traceId || typeof traceId !== 'string') return false;
  return /^DT-\d{8}-[0-9a-f]{6}$/.test(traceId);
}

/**
 * Розбирає trace_id на частини
 * @param {string} traceId
 * @returns {{ prefix: string, date: string, rand: string }|null}
 */
function parse(traceId) {
  if (!isValid(traceId)) return null;
  const parts = traceId.split('-');
  return {
    prefix: parts[0],
    date: parts[1],
    rand: parts[2]
  };
}

/**
 * Перевіряє чи є trace_id у списку ClickUp-задач
 * @param {Array} tasks - Масив ClickUp задач
 * @returns {{ withTraceId: Array, withoutTraceId: Array }}
 */
function auditTasks(tasks) {
  const withTraceId = [];
  const withoutTraceId = [];

  for (const task of tasks) {
    const customFields = task.custom_fields || [];
    const traceField = customFields.find(
      f => f.name && f.name.toLowerCase().includes('trace')
    );
    const traceValue = traceField && traceField.value ? traceField.value : null;

    if (traceValue && isValid(traceValue)) {
      withTraceId.push({ id: task.id, name: task.name, trace_id: traceValue });
    } else {
      withoutTraceId.push({ id: task.id, name: task.name, trace_id: traceValue || null });
    }
  }

  return { withTraceId, withoutTraceId };
}

module.exports = { generate, isValid, parse, auditTasks };
