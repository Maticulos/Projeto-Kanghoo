const DEMO_MODE = String(process.env.DEMO_MODE || 'false').toLowerCase() === 'true';
const API_BASE_PATH = process.env.API_BASE_PATH || '/api';
const WS_BASE_URL = process.env.WS_BASE_URL || process.env.WS_BASE || (API_BASE_PATH.startsWith('http') ? API_BASE_PATH.replace(/^http/, 'ws') : '');

module.exports = {
  DEMO_MODE,
  API_BASE_PATH,
  WS_BASE_URL
};
