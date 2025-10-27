-- Script para criar a tabela de preferências de notificação
-- Execute este script no PostgreSQL para criar a estrutura necessária

-- Criar tabela de preferências de notificação
CREATE TABLE IF NOT EXISTS notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    
    -- Tipos de notificação (boolean)
    embarque_desembarque BOOLEAN DEFAULT true,
    localizacao_tempo_real BOOLEAN DEFAULT true,
    veiculo_chegando BOOLEAN DEFAULT true,
    emergencia BOOLEAN DEFAULT true,
    atraso_detectado BOOLEAN DEFAULT true,
    
    -- Canais de notificação (JSON array)
    canais JSONB DEFAULT '["app"]'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_user_preferences UNIQUE (user_id),
    CONSTRAINT valid_canais CHECK (jsonb_typeof(canais) = 'array')
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id 
ON notification_preferences (user_id);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_updated_at 
ON notification_preferences (updated_at);

-- Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para atualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_notification_preferences_updated_at 
ON notification_preferences;

CREATE TRIGGER trigger_update_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_preferences_updated_at();

-- Comentários para documentação
COMMENT ON TABLE notification_preferences IS 'Tabela para armazenar as preferências de notificação dos usuários';
COMMENT ON COLUMN notification_preferences.user_id IS 'ID do usuário (referência para tabela de usuários)';
COMMENT ON COLUMN notification_preferences.embarque_desembarque IS 'Receber notificações de embarque/desembarque';
COMMENT ON COLUMN notification_preferences.localizacao_tempo_real IS 'Receber atualizações de localização em tempo real';
COMMENT ON COLUMN notification_preferences.veiculo_chegando IS 'Receber avisos quando veículo estiver chegando';
COMMENT ON COLUMN notification_preferences.emergencia IS 'Receber notificações de emergência (sempre ativo)';
COMMENT ON COLUMN notification_preferences.atraso_detectado IS 'Receber avisos sobre atrasos';
COMMENT ON COLUMN notification_preferences.canais IS 'Array JSON com canais de notificação habilitados (app, email, whatsapp)';

-- Inserir algumas preferências de exemplo (opcional)
-- Descomente as linhas abaixo se quiser dados de teste

/*
INSERT INTO notification_preferences (user_id, embarque_desembarque, localizacao_tempo_real, veiculo_chegando, emergencia, atraso_detectado, canais)
VALUES 
    (1, true, true, true, true, true, '["app", "email"]'::jsonb),
    (2, true, false, true, true, false, '["app"]'::jsonb),
    (3, false, true, true, true, true, '["app", "whatsapp"]'::jsonb)
ON CONFLICT (user_id) DO NOTHING;
*/

-- Verificar se a tabela foi criada corretamente
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'notification_preferences'
ORDER BY ordinal_position;