-- Seed com dados de teste
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Limpar dados anteriores
DELETE FROM criancas_rotas WHERE crianca_id IN (SELECT id FROM criancas WHERE email_responsavel IN ('pai1@email.com', 'pai2@email.com', 'pai3@email.com'));
DELETE FROM rotas_escolares WHERE usuario_id IN (SELECT id FROM usuarios WHERE email IN ('basic@motorista.com', 'premium@motorista.com'));
DELETE FROM criancas WHERE email_responsavel IN ('pai1@email.com', 'pai2@email.com', 'pai3@email.com');
DELETE FROM planos_assinatura WHERE usuario_id IN (SELECT id FROM usuarios WHERE email IN ('basic@motorista.com', 'premium@motorista.com'));
DELETE FROM usuarios WHERE email IN ('basic@motorista.com', 'premium@motorista.com', 'pai1@email.com', 'pai2@email.com', 'pai3@email.com');

-- Criar usuários (tipo_cadastro e tipo_usuario devem ser iguais)
INSERT INTO usuarios (nome_completo, email, senha, tipo_cadastro, celular, endereco, tipo_usuario, created_at)
VALUES 
('Carlos Silva', 'basic@motorista.com', crypt('teste123', gen_salt('bf', 10)), 'motorista_escolar', '(11) 98765-4321', 'Rua das Flores, 123', 'motorista_escolar', NOW()),
('Maria Costa', 'premium@motorista.com', crypt('teste123', gen_salt('bf', 10)), 'motorista_escolar', '(11) 91234-5678', 'Av. Paulista, 1000', 'motorista_escolar', NOW()),
('Ana Paula', 'pai1@email.com', crypt('teste123', gen_salt('bf', 10)), 'responsavel', '(11) 99999-1111', 'Rua dos Jardins, 456', 'responsavel', NOW()),
('João Carlos', 'pai2@email.com', crypt('teste123', gen_salt('bf', 10)), 'responsavel', '(11) 98888-2222', 'Rua das Palmeiras, 789', 'responsavel', NOW()),
('Fernanda Santos', 'pai3@email.com', crypt('teste123', gen_salt('bf', 10)), 'responsavel', '(11) 97777-3333', 'Av. Faria Lima, 321', 'responsavel', NOW());

-- Criar planos
INSERT INTO planos_assinatura (usuario_id, tipo_plano, limite_rotas, limite_usuarios, ativo, data_inicio)
SELECT id, 'basico', 3, 15, true, NOW() FROM usuarios WHERE email = 'basic@motorista.com';

INSERT INTO planos_assinatura (usuario_id, tipo_plano, limite_rotas, limite_usuarios, ativo, data_inicio)
SELECT id, 'premium', 10, 50, true, NOW() FROM usuarios WHERE email = 'premium@motorista.com';

-- Criar crianças
INSERT INTO criancas (nome_completo, data_nascimento, endereco_residencial, escola, endereco_escola, responsavel_id, cpf, idade, nome_responsavel, telefone_responsavel, email_responsavel, ativo, created_at)
SELECT 'Sofia Ferreira', '2016-03-15', 'Rua dos Jardins, 456', 'Escola Monteiro Lobato', 'Rua Monteiro Lobato, 100', u.id, '12345678901', 8, 'Ana Paula', '(11) 99999-1111', 'pai1@email.com', true, NOW()
FROM usuarios u WHERE u.email = 'pai1@email.com';

INSERT INTO criancas (nome_completo, data_nascimento, endereco_residencial, escola, endereco_escola, responsavel_id, cpf, idade, nome_responsavel, telefone_responsavel, email_responsavel, ativo, created_at)
SELECT 'Pedro Mendes', '2015-08-22', 'Rua das Palmeiras, 789', 'Colégio São Francisco', 'Av. São Francisco, 500', u.id, '98765432109', 9, 'João Carlos', '(11) 98888-2222', 'pai2@email.com', true, NOW()
FROM usuarios u WHERE u.email = 'pai2@email.com';

INSERT INTO criancas (nome_completo, data_nascimento, endereco_residencial, escola, endereco_escola, responsavel_id, cpf, idade, nome_responsavel, telefone_responsavel, email_responsavel, ativo, created_at)
SELECT 'Lucas Santos', '2017-01-10', 'Av. Faria Lima, 321', 'Escola Monteiro Lobato', 'Rua Monteiro Lobato, 100', u.id, '11122233344', 7, 'Fernanda Santos', '(11) 97777-3333', 'pai3@email.com', true, NOW()
FROM usuarios u WHERE u.email = 'pai3@email.com';

-- Criar rotas
INSERT INTO rotas_escolares (usuario_id, nome_rota, descricao, escola_destino, turno, horario_ida, horario_volta, dias_semana, preco_mensal, vagas_disponiveis, ativo, created_at)
SELECT u.id, 'Rota Vila Madalena', 'Rota matutina', 'Escola Monteiro Lobato', 'manha', '06:30:00', '12:15:00', 'seg-sex', 180.00, 12, true, NOW()
FROM usuarios u WHERE u.email = 'basic@motorista.com';

INSERT INTO rotas_escolares (usuario_id, nome_rota, descricao, escola_destino, turno, horario_ida, horario_volta, dias_semana, preco_mensal, vagas_disponiveis, ativo, created_at)
SELECT u.id, 'Rota Jardins', 'Rota vespertina', 'Colégio São Francisco', 'tarde', '12:30:00', '17:45:00', 'seg-sex', 220.00, 10, true, NOW()
FROM usuarios u WHERE u.email = 'premium@motorista.com';

-- Associar crianças às rotas
INSERT INTO criancas_rotas (crianca_id, rota_id, endereco_embarque, endereco_desembarque, latitude_embarque, longitude_embarque, latitude_desembarque, longitude_desembarque, horario_embarque_previsto, horario_desembarque_previsto, ativo, created_at)
SELECT c.id, r.id, 'Rua dos Jardins, 456', 'Escola Monteiro Lobato', -23.5615, -46.6565, -23.5505, -46.6333, '06:45:00', '12:15:00', true, NOW()
FROM criancas c, rotas_escolares r, usuarios u
WHERE c.cpf = '12345678901' AND r.usuario_id = u.id AND u.email = 'basic@motorista.com';

INSERT INTO criancas_rotas (crianca_id, rota_id, endereco_embarque, endereco_desembarque, latitude_embarque, longitude_embarque, latitude_desembarque, longitude_desembarque, horario_embarque_previsto, horario_desembarque_previsto, ativo, created_at)
SELECT c.id, r.id, 'Av. Faria Lima, 321', 'Escola Monteiro Lobato', -23.5875, -46.6822, -23.5505, -46.6333, '06:50:00', '12:20:00', true, NOW()
FROM criancas c, rotas_escolares r, usuarios u
WHERE c.cpf = '11122233344' AND r.usuario_id = u.id AND u.email = 'basic@motorista.com';

INSERT INTO criancas_rotas (crianca_id, rota_id, endereco_embarque, endereco_desembarque, latitude_embarque, longitude_embarque, latitude_desembarque, longitude_desembarque, horario_embarque_previsto, horario_desembarque_previsto, ativo, created_at)
SELECT c.id, r.id, 'Rua das Palmeiras, 789', 'Colégio São Francisco', -23.5965, -46.6722, -23.5615, -46.6565, '12:15:00', '17:45:00', true, NOW()
FROM criancas c, rotas_escolares r, usuarios u
WHERE c.cpf = '98765432109' AND r.usuario_id = u.id AND u.email = 'premium@motorista.com';

-- Resumo
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ AMBIENTE PRONTO!';
    RAISE NOTICE '';
    RAISE NOTICE 'Login: basic@motorista.com / teste123';
    RAISE NOTICE 'Login: premium@motorista.com / teste123';
    RAISE NOTICE '';
    RAISE NOTICE 'Acesse: http://localhost:3000/auth/login.html';
    RAISE NOTICE '';
END $$;
