// Configuração global para testes
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key';

// Configurar console para testes (reduzir logs)
console.log = () => {};
console.warn = () => {};
console.error = () => {};