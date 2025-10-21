const { expect } = require('chai');

describe('Teste Simples', () => {
    it('deve executar um teste básico', () => {
        expect(1 + 1).to.equal(2);
    });

    it('deve verificar se chai está funcionando', () => {
        expect('hello').to.be.a('string');
        expect([1, 2, 3]).to.have.lengthOf(3);
    });
});