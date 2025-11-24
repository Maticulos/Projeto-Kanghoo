const DEMO_MODE = String(process.env.DEMO_MODE || 'false').toLowerCase() === 'true';
const API_BASE_PATH = process.env.API_BASE_PATH || '/api';

module.exports = {
  DEMO_MODE,
  API_BASE_PATH
};
