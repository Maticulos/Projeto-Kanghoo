const { query } = require('../config/db');
const logger = require('../utils/logger');

async function getUserData() {
    try {
        const res = await query('SELECT id, nome_completo, email, senha, celular, data_nascimento, tipo_cadastro, tipo_usuario, endereco_completo, criado_em FROM usuarios');
        const users = res.rows.map(user => ({
            id: user.id,
            login: user.email, // Usando email como login
            senha: user.senha, // Senha criptografada
            nome_completo: user.nome_completo,
            celular: user.celular,
            data_nascimento: user.data_nascimento,
            tipo_cadastro: user.tipo_cadastro,
            tipo_usuario: user.tipo_usuario,
            endereco_completo: user.endereco_completo,
            criado_em: user.criado_em
        }));
        logger.info('Dados de usuários recuperados com sucesso:', users);
        return users;
    } catch (error) {
        logger.error('Erro ao recuperar dados de usuários:', error);
        throw error;
    }
}

// Para execução direta via Node
if (require.main === module) {
    getUserData()
        .then(data => {
            console.log('\n--- Dados Completos dos Usuários ---');
            data.forEach(user => {
                console.log(JSON.stringify(user, null, 2));
                console.log('----------------------------------');
            });
            process.exit(0);
        })
        .catch(err => {
            console.error('Falha ao obter dados de usuários:', err);
            process.exit(1);
        });
}

module.exports = { getUserData };