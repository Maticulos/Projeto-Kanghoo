let client;
try {
  client = require('prom-client');
} catch (_) {
  client = null;
}

const contentType = client ? client.register.contentType : 'text/plain; version=0.0.4';

if (client) {
  client.collectDefaultMetrics();
}

async function getMetrics() {
  if (!client) return '# prom-client not installed\n';
  return client.register.metrics();
}

module.exports = {
  getMetrics,
  contentType
};

