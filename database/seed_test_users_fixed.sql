-- Seed de usuários de teste
-- Gera 5 usuários de teste e um plano 'premium' para um deles
-- Senha em texto: teste123 (armazenada como bcrypt via pgcrypto)

-- Requer extensão pgcrypto para usar crypt()/gen_salt()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Motorista escolar - plano básico
INSERT INTO usuarios (nome, email, senha, tipo_usuario, telefone)
VALUES (
  'Motorista Escola Basico',
  'motorista.escola.basico@example.com',
  crypt('teste123', gen_salt('bf', 10)),
  'escolar',
  '+550000000001'
)
ON CONFLICT (email) DO NOTHING;

-- 2) Motorista escolar - versão premium (terá plano premium associado)
INSERT INTO usuarios (nome, email, senha, tipo_usuario, telefone)
VALUES (
  'Motorista Escola Premium',
  'motorista.escola.premium@example.com',
  crypt('teste123', gen_salt('bf', 10)),
  'escolar',
  '+550000000002'
)
ON CONFLICT (email) DO NOTHING;

-- 3) Responsável
INSERT INTO usuarios (nome, email, senha, tipo_usuario, telefone)
VALUES (
  'Responsavel Teste',
  'responsavel.teste@example.com',
  crypt('teste123', gen_salt('bf', 10)),
  'responsavel',
  '+550000000003'
)
ON CONFLICT (email) DO NOTHING;

-- 4) Motorista de excursão
INSERT INTO usuarios (nome, email, senha, tipo_usuario, telefone)
VALUES (
  'Motorista Excursao Teste',
  'motorista.excursao@example.com',
  crypt('teste123', gen_salt('bf', 10)),
  'excursao',
  '+550000000004'
)
ON CONFLICT (email) DO NOTHING;

-- 5) Administrador com permissão total
INSERT INTO usuarios (nome, email, senha, tipo_usuario, telefone)
VALUES (
  'Administrador Teste',
  'admin.teste@example.com',
  crypt('teste123', gen_salt('bf', 10)),
  'admin',
  '+550000000000'
)
ON CONFLICT (email) DO NOTHING;

-- Exibir usuários criados
SELECT 
    id, 
    nome, 
    email, 
    tipo_usuario,
    'teste123' as senha_texto
FROM usuarios 
WHERE email LIKE '%@example.com'
ORDER BY id;
