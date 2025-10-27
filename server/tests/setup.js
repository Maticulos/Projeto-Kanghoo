// Configuração global para testes
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key';

// Desabilitar logs durante os testes
console.log = () => {};
console.warn = () => {};
console.error = () => {};