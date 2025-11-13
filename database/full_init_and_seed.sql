-- Extensões
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tabela usuarios (copiado de create_usuarios_table.sql)
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome_completo VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    tipo_cadastro VARCHAR(50) NOT NULL,
    tipo_usuario VARCHAR(50) NOT NULL DEFAULT 'motorista_escolar',
    telefone VARCHAR(20),
    celular VARCHAR(20),
    endereco TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela planos_assinatura (trecho relevante de parte1_criar_tabelas.sql)
CREATE TABLE IF NOT EXISTS planos_assinatura (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo_plano VARCHAR(50) NOT NULL DEFAULT 'basico',
    limite_rotas INTEGER DEFAULT 3,
    limite_usuarios INTEGER DEFAULT 50,
    data_inicio TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    data_fim TIMESTAMP WITH TIME ZONE,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_planos_usuario ON planos_assinatura(usuario_id);
CREATE INDEX IF NOT EXISTS idx_planos_ativo ON planos_assinatura(ativo);
CREATE INDEX IF NOT EXISTS idx_planos_tipo ON planos_assinatura(tipo_plano);

-- (Opcional) outras tabelas que podem ser referenciadas pelo sistema foram omitidas

-- Seed de usuários de teste (mesmo conteúdo de seed_test_users.sql)
INSERT INTO usuarios (nome_completo, email, senha, tipo_cadastro, tipo_usuario, telefone)
VALUES (
  'Motorista Escola Basico',
  'motorista.escola.basico@example.com',
  crypt('teste123', gen_salt('bf', 10)),
  'motorista_escolar',
  'motorista_escolar',
  '+550000000001'
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO usuarios (nome_completo, email, senha, tipo_cadastro, tipo_usuario, telefone)
VALUES (
  'Motorista Escola Premium',
  'motorista.escola.premium@example.com',
  crypt('teste123', gen_salt('bf', 10)),
  'motorista_escolar',
  'motorista_escolar',
  'motorista_escolar',
  'motorista_escolar_premium',
  '+550000000002'
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO usuarios (nome_completo, email, senha, tipo_cadastro, tipo_usuario, telefone)
VALUES (
  'Responsavel Teste',
  'responsavel.teste@example.com',
  crypt('teste123', gen_salt('bf', 10)),
  'responsavel',
  'responsavel',
  '+550000000003'
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO usuarios (nome_completo, email, senha, tipo_cadastro, tipo_usuario, telefone)
VALUES (
  'Motorista Excursao Teste',
  'motorista.excursao@example.com',
  crypt('teste123', gen_salt('bf', 10)),
  'motorista_excursao',
  'motorista_excursao',
  '+550000000004'
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO usuarios (nome_completo, email, senha, tipo_cadastro, tipo_usuario, telefone)
VALUES (
  'Administrador Teste',
  'admin.teste@example.com',
  crypt('teste123', gen_salt('bf', 10)),
  'admin',
  'admin',
  '+550000000000'
)
ON CONFLICT (email) DO NOTHING;

-- Criar plano premium para o motorista premium (se ainda não existir)
INSERT INTO planos_assinatura (usuario_id, tipo_plano, limite_rotas, limite_usuarios, ativo)
SELECT u.id, 'premium', 20, 500, true
FROM usuarios u
WHERE u.email = 'motorista.escola.premium@example.com'
  AND NOT EXISTS (
    SELECT 1 FROM planos_assinatura p WHERE p.usuario_id = u.id AND p.ativo = true
  );

-- Fim