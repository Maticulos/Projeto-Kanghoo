const db = require('../config/db');

async function atualizarTabelaCriancas() {
    try {
        console.log('🔧 Atualizando estrutura da tabela crianças...\n');
        
        // Verificar e adicionar novos campos na tabela crianças
        const novosCampos = [
            {
                nome: 'cpf',
                tipo: 'VARCHAR(14) UNIQUE NOT NULL',
                descricao: 'CPF da criança (campo obrigatório)'
            },
            {
                nome: 'idade',
                tipo: 'INTEGER',
                descricao: 'Idade da criança'
            },
            {
                nome: 'nome_responsavel',
                tipo: 'VARCHAR(255) NOT NULL',
                descricao: 'Nome completo do responsável'
            },
            {
                nome: 'telefone_responsavel',
                tipo: 'VARCHAR(20) NOT NULL',
                descricao: 'Telefone principal do responsável'
            },
            {
                nome: 'telefone_responsavel_secundario',
                tipo: 'VARCHAR(20)',
                descricao: 'Telefone secundário do responsável'
            },
            {
                nome: 'email_responsavel',
                tipo: 'VARCHAR(255) NOT NULL',
                descricao: 'Email do responsável'
            },
            {
                nome: 'foto_url',
                tipo: 'TEXT',
                descricao: 'URL da foto da criança'
            },
            {
                nome: 'observacoes_medicas',
                tipo: 'TEXT',
                descricao: 'Observações médicas importantes'
            },
            {
                nome: 'contato_emergencia_nome',
                tipo: 'VARCHAR(255)',
                descricao: 'Nome do contato de emergência'
            },
            {
                nome: 'contato_emergencia_telefone',
                tipo: 'VARCHAR(20)',
                descricao: 'Telefone do contato de emergência'
            },
            {
                nome: 'senha_responsavel',
                tipo: 'VARCHAR(255)',
                descricao: 'Senha gerada automaticamente para o responsável'
            }
        ];

        for (const campo of novosCampos) {
            try {
                // Verificar se a coluna já existe
                const verificarColuna = await db.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'criancas' AND column_name = $1
                `, [campo.nome]);

                if (verificarColuna.rows.length === 0) {
                    // Adicionar a coluna se não existir
                    await db.query(`ALTER TABLE criancas ADD COLUMN ${campo.nome} ${campo.tipo}`);
                    console.log(`✅ Campo '${campo.nome}' adicionado: ${campo.descricao}`);
                } else {
                    console.log(`⚠️  Campo '${campo.nome}' já existe`);
                }
            } catch (error) {
                console.log(`❌ Erro ao adicionar campo '${campo.nome}': ${error.message}`);
            }
        }

        // Criar índices para melhor performance
        const indices = [
            'CREATE INDEX IF NOT EXISTS idx_criancas_cpf ON criancas(cpf)',
            'CREATE INDEX IF NOT EXISTS idx_criancas_email_responsavel ON criancas(email_responsavel)',
            'CREATE INDEX IF NOT EXISTS idx_criancas_motorista_id ON criancas(motorista_id)'
        ];

        for (const indice of indices) {
            try {
                await db.query(indice);
                console.log(`✅ Índice criado com sucesso`);
            } catch (error) {
                console.log(`⚠️  Índice já existe ou erro: ${error.message}`);
            }
        }

        // Verificar estrutura final
        console.log('\n📋 Verificando estrutura final da tabela crianças:');
        const colunas = await db.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'criancas'
            ORDER BY ordinal_position
        `);

        colunas.rows.forEach(coluna => {
            console.log(`  - ${coluna.column_name}: ${coluna.data_type} ${coluna.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
        });

        console.log('\n🎉 Tabela crianças atualizada com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        process.exit(0);
    }
}

atualizarTabelaCriancas();