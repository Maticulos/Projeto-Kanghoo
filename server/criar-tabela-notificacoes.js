const db = require('./config/db');

async function criarTabelaNotificacoes() {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS notificacoes (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        titulo VARCHAR(255) NOT NULL,
        mensagem TEXT NOT NULL,
        tipo VARCHAR(50) DEFAULT 'info',
        lida BOOLEAN DEFAULT false,
        dados_extras JSONB,
        prioridade VARCHAR(20) DEFAULT 'normal',
        criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario ON notificacoes(usuario_id);
      CREATE INDEX IF NOT EXISTS idx_notificacoes_lida ON notificacoes(lida);
      CREATE INDEX IF NOT EXISTS idx_notificacoes_criado ON notificacoes(criado_em);
    `;
    
    await db.query(query);
    console.log('✅ Tabela notificacoes criada com sucesso');
  } catch (error) {
    console.error('❌ Erro ao criar tabela notificacoes:', error.message);
  }
  process.exit(0);
}

criarTabelaNotificacoes();