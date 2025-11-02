const dotenv = require('dotenv');
const path = require('path');
const db = require('../config/db');
const bcrypt = require('bcrypt');

// Carrega as variáveis de ambiente do .env.local para desenvolvimento
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Função para resetar e criar usuários de teste
async function resetUsers() {
    try {
        console.log('Iniciando limpeza da tabela criancas...');
        await db.query('DELETE FROM criancas');
        console.log('✅ Tabela criancas limpa');

        console.log('Iniciando limpeza da tabela usuarios...');
        await db.query('DELETE FROM usuarios');
        console.log('✅ Tabela usuarios limpa');

        console.log('Preparando para inserir usuários de teste com senhas criptografadas...');
        
        const usuarios = [
            {
                nome_completo: 'João Silva - Motorista Basic',
                email: 'motorista.basic@teste.com',
                senha: 'teste123',
                tipo_cadastro: 'motorista_escolar_excursao',
                celular: '(11) 98765-4321',
                data_nascimento: '1990-01-01',
                tipo_usuario: 'motorista',
                endereco_completo: 'Rua Teste, 123 - São Paulo'
            },
            {
                nome_completo: 'Maria Oliveira - Motorista Premium',
                email: 'motorista.premium@teste.com',
                senha: 'teste123',
                tipo_cadastro: 'motorista_escolar_excursao',
                celular: '(11) 98765-4322',
                data_nascimento: '1985-05-10',
                tipo_usuario: 'motorista',
                endereco_completo: 'Avenida Exemplo, 456 - Rio de Janeiro'
            },
            {
                nome_completo: 'Pedro Costa - Motorista Escolar',
                email: 'motorista.escolar@teste.com',
                senha: 'teste123',
                tipo_cadastro: 'motorista_escolar',
                celular: '(11) 98765-4325',
                data_nascimento: '1988-07-22',
                tipo_usuario: 'motorista',
                endereco_completo: 'Rua da Escola, 500 - Campinas'
            },
            {
                nome_completo: 'Ana Paula - Motorista Excursão',
                email: 'motorista.excursao@teste.com',
                senha: 'teste123',
                tipo_cadastro: 'motorista_excursao',
                celular: '(11) 98765-4326',
                data_nascimento: '1995-02-18',
                tipo_usuario: 'motorista',
                endereco_completo: 'Avenida do Turismo, 700 - Salvador'
            },
            {
                nome_completo: 'Carlos Santos - Administrador',
                email: 'admin@teste.com',
                senha: 'MrAdmin123',
                tipo_cadastro: 'admin',
                celular: '(11) 98765-4323',
                data_nascimento: '1978-11-20',
                tipo_usuario: 'admin',
                endereco_completo: 'Praça Central, 789 - Belo Horizonte'
            },
            {
                nome_completo: 'Ana Souza - Responsável',
                email: 'responsavel@teste.com',
                senha: 'teste123',
                tipo_cadastro: 'responsavel',
                celular: '(11) 98765-4324',
                data_nascimento: '1992-03-15',
                tipo_usuario: 'responsavel',
                endereco_completo: 'Alameda dos Anjos, 101 - Curitiba'
            }
        ];

        const saltRounds = 10;

        // Inserir usuários
        for (const usuario of usuarios) {
            console.log(`Criptografando e inserindo usuário: ${usuario.email}`);
            
            const hashedPassword = await bcrypt.hash(usuario.senha, saltRounds);
            
            await db.query(`
                INSERT INTO usuarios (
                    nome_completo, email, senha, tipo_cadastro, celular, data_nascimento, tipo_usuario, endereco_completo, criado_em
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [
                usuario.nome_completo, 
                usuario.email, 
                hashedPassword,
                usuario.tipo_cadastro,
                usuario.celular,
                usuario.data_nascimento,
                usuario.tipo_usuario,
                usuario.endereco_completo,
                new Date()
            ]);
        }

        console.log('✅ Usuários de teste criados com sucesso:');
        console.log('- Motorista Basic (Escolar e Excursão)');
        console.log('  Email: motorista.basic@teste.com');
        console.log('  Senha: teste123');
        console.log('- Motorista Premium (Escolar e Excursão)');
        console.log('  Email: motorista.premium@teste.com');
        console.log('  Senha: teste123');
        console.log('- Motorista Escolar');
        console.log('  Email: motorista.escolar@teste.com');
        console.log('  Senha: teste123');
        console.log('- Motorista Excursão');
        console.log('  Email: motorista.excursao@teste.com');
        console.log('  Senha: teste123');
        console.log('- Administrador');
        console.log('  Email: admin@teste.com');
        console.log('  Senha: MrAdmin123');
        console.log('- Responsável');
        console.log('  Email: responsavel@teste.com');
        console.log('  Senha: teste123');

    } catch (error) {
        console.error('❌ Erro ao resetar usuários:', error);
    } finally {
        // A conexão do pool não deve ser encerrada aqui para que o app continue funcionando
    }
}

resetUsers();