-- Seed de usuários de teste
-- Gera 5 usuários de teste e um plano 'premium' para um deles
-- Senha em texto: teste123 (armazenada como bcrypt via pgcrypto)

-- Requer extensão pgcrypto para usar crypt()/gen_salt()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Motorista escolar - plano básico
INSERT INTO usuarios (nome_completo, email, senha, tipo_cadastro, telefone)
VALUES (
  'Motorista Escola Basico',
  'motorista.escola.basico@example.com',
  crypt('teste123', gen_salt('bf', 10)),
  'motorista_escolar',
  '+550000000001'
)
ON CONFLICT (email) DO NOTHING;

-- 2) Motorista escolar - versão premium (terá plano premium associado)
INSERT INTO usuarios (nome_completo, email, senha, tipo_cadastro, telefone)
VALUES (
  'Motorista Escola Premium',
  'motorista.escola.premium@example.com',
  crypt('teste123', gen_salt('bf', 10)),
  'motorista_escolar',
  '+550000000002'
)
ON CONFLICT (email) DO NOTHING;

-- 3) Responsável
INSERT INTO usuarios (nome_completo, email, senha, tipo_cadastro, telefone)
VALUES (
  'Responsavel Teste',
  'responsavel.teste@example.com',
  crypt('teste123', gen_salt('bf', 10)),
  'responsavel',
  '+550000000003'
)
ON CONFLICT (email) DO NOTHING;

-- 4) Motorista de excursão
INSERT INTO usuarios (nome_completo, email, senha, tipo_cadastro, telefone)
VALUES (
  'Motorista Excursao Teste',
  'motorista.excursao@example.com',
  crypt('teste123', gen_salt('bf', 10)),
  'motorista_excursao',
  '+550000000004'
)
ON CONFLICT (email) DO NOTHING;

-- 5) Administrador com permissão total
INSERT INTO usuarios (nome_completo, email, senha, tipo_cadastro, telefone)
VALUES (
  'Administrador Teste',
  'admin.teste@example.com',
  crypt('teste123', gen_salt('bf', 10)),
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

-- Observação: execute este script com um usuário do banco que possa criar extensão (ou remova a linha de CREATE EXTENSION
-- se sua instalação do Postgres já tiver pgcrypto habilitado).

-- Fim do seed
