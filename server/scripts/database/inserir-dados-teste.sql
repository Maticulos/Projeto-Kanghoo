-- Inserir motorista
INSERT INTO usuarios (nome_completo, email, senha, tipo_usuario)
VALUES ('Motorista Teste 2', 'motorista2@teste.com', 'senha123', 'motorista')
RETURNING id;

-- Inserir rota
INSERT INTO rotas (motorista_id, nome_rota, horario_inicio, horario_fim, dias_semana, ativo)
SELECT id, 'Rota Teste 2', '08:00', '09:00', '1,2,3,4,5', true
FROM usuarios
WHERE email = 'motorista2@teste.com'
RETURNING id;

-- Inserir viagem
INSERT INTO viagens (motorista_id, rota_id, data_viagem, tipo_viagem, status)
SELECT u.id, r.id, CURRENT_DATE, 'ida', 'iniciada'
FROM usuarios u
JOIN rotas r ON r.motorista_id = u.id
WHERE u.email = 'motorista2@teste.com'
AND r.nome_rota = 'Rota Teste 2';