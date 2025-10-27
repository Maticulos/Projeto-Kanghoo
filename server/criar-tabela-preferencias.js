const db = require('./config/db');

async function criarTabelaPreferencias() {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS preferencias_notificacao (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        email_ativo BOOLEAN DEFAULT true,
        sms_ativo BOOLEAN DEFAULT true,
        push_ativo BOOLEAN DEFAULT true,
        notif_chegada BOOLEAN DEFAULT true,
        notif_saida BOOLEAN DEFAULT true,
        notif_atraso BOOLEAN DEFAULT true,
        notif_emergencia BOOLEAN DEFAULT true,
        criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(usuario_id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_preferencias_usuario ON preferencias_notificacao(usuario_id);
    `;
    
    await db.query(query);
    console.log('✅ Tabela preferencias_notificacao criada com sucesso');
  } catch (error) {
    console.error('❌ Erro ao criar tabela preferencias_notificacao:', error.message);
  }
  process.exit(0);
}

criarTabelaPreferencias();