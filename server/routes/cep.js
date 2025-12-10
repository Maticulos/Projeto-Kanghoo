const Router = require('koa-router');
const axios = require('axios');
const { success, error } = require('../utils/api-response');
const logger = require('../utils/logger');

const router = new Router();

router.get('/cep/:cep', async (ctx) => {
    const { cep } = ctx.params;
    
    // Remove caracteres não numéricos
    const cepLimpo = cep.replace(/\D/g, '');
    
    if (cepLimpo.length !== 8) {
        return ctx.body = error('CEP inválido', 400);
    }
    
    try {
        // Consulta ViaCEP
        const response = await axios.get(`https://viacep.com.br/ws/${cepLimpo}/json/`);
        
        if (response.data.erro) {
            return ctx.body = error('CEP não encontrado', 404);
        }
        
        const data = response.data;
        
        // Formata resposta padrão
        ctx.body = success({
            cep: data.cep,
            logradouro: data.logradouro,
            complemento: data.complemento,
            bairro: data.bairro,
            localidade: data.localidade,
            uf: data.uf,
            ibge: data.ibge,
            gia: data.gia,
            ddd: data.ddd,
            siafi: data.siafi
        });
        
    } catch (err) {
        logger.error(`Erro ao consultar CEP ${cep}:`, err.message);
        ctx.body = error('Erro ao consultar serviço de CEP', 502);
    }
});

module.exports = router;
