# 🗄️ Estrutura do Banco de Dados - Sistema de Tracking

## 📋 Visão Geral

Este documento detalha a estrutura completa do banco de dados utilizado pelo sistema de rastreamento de transporte escolar. O sistema utiliza **SQLite** como banco de dados principal, com tabelas otimizadas para armazenar dados de localização, viagens, embarques/desembarques e estatísticas.

## 🏗️ Arquitetura do Banco

### Características Principais
- **Banco de Dados**: SQLite 3.x
- **Localização**: `./database.db` (raiz do projeto)
- **Encoding**: UTF-8
- **Transações**: ACID compliant
- **Índices**: Otimizados para consultas frequentes
- **Backup**: Automático via WAL mode

### Configurações de Performance
```sql
-- Configurações aplicadas automaticamente
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = 10000;
PRAGMA temp_store = MEMORY;
```

## 📊 Tabelas do Sistema

### 1. 📍 tracking_locations
**Descrição**: Armazena todas as localizações GPS dos motoristas em tempo real.

```sql
CREATE TABLE tracking_locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    motorista_id INTEGER NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    velocidade REAL DEFAULT 0,
    direcao REAL DEFAULT 0,
    precisao REAL DEFAULT 0,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Índices para otimização
    INDEX idx_tracking_motorista (motorista_id),
    INDEX idx_tracking_timestamp (timestamp),
    INDEX idx_tracking_motorista_timestamp (motorista_id, timestamp)
);
```

**Campos Detalhados**:
| Campo | Tipo | Descrição | Exemplo |
|-------|------|-----------|---------|
| `id` | INTEGER | Chave primária auto-incremento | 1, 2, 3... |
| `motorista_id` | INTEGER | ID do motorista (FK) | 1, 2, 3... |
| `latitude` | REAL | Coordenada de latitude | -23.5505 |
| `longitude` | REAL | Coordenada de longitude | -46.6333 |
| `velocidade` | REAL | Velocidade em km/h | 45.5 |
| `direcao` | REAL | Direção em graus (0-360) | 90.0 |
| `precisao` | REAL | Precisão GPS em metros | 10.5 |
| `timestamp` | DATETIME | Data/hora da localização | 2024-01-15 14:30:25 |

**Consultas Comuns**:
```sql
-- Última localização de um motorista
SELECT * FROM tracking_locations 
WHERE motorista_id = ? 
ORDER BY timestamp DESC LIMIT 1;

-- Histórico de localizações
SELECT * FROM tracking_locations 
WHERE motorista_id = ? 
AND timestamp >= datetime('now', '-1 day')
ORDER BY timestamp DESC;
```

### 2. 🚌 tracking_trips
**Descrição**: Registra informações sobre viagens realizadas pelos motoristas.

```sql
CREATE TABLE tracking_trips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    motorista_id INTEGER NOT NULL,
    rota_id INTEGER,
    veiculo_id INTEGER,
    tipo_viagem TEXT DEFAULT 'ida',
    status TEXT DEFAULT 'ativa',
    inicio_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    fim_timestamp DATETIME,
    inicio_latitude REAL,
    inicio_longitude REAL,
    fim_latitude REAL,
    fim_longitude REAL,
    distancia_percorrida_km REAL DEFAULT 0,
    velocidade_media REAL DEFAULT 0,
    observacoes TEXT,
    
    -- Índices para otimização
    INDEX idx_trips_motorista (motorista_id),
    INDEX idx_trips_status (status),
    INDEX idx_trips_data (inicio_timestamp),
    INDEX idx_trips_motorista_status (motorista_id, status)
);
```

**Campos Detalhados**:
| Campo | Tipo | Descrição | Valores Possíveis |
|-------|------|-----------|-------------------|
| `id` | INTEGER | Chave primária | 1, 2, 3... |
| `motorista_id` | INTEGER | ID do motorista | 1, 2, 3... |
| `rota_id` | INTEGER | ID da rota | 1, 2, 3... |
| `veiculo_id` | INTEGER | ID do veículo | 1, 2, 3... |
| `tipo_viagem` | TEXT | Tipo da viagem | 'ida', 'volta', 'extra' |
| `status` | TEXT | Status atual | 'ativa', 'finalizada', 'cancelada' |
| `inicio_timestamp` | DATETIME | Início da viagem | 2024-01-15 07:00:00 |
| `fim_timestamp` | DATETIME | Fim da viagem | 2024-01-15 08:30:00 |
| `inicio_latitude` | REAL | Latitude inicial | -23.5505 |
| `inicio_longitude` | REAL | Longitude inicial | -46.6333 |
| `fim_latitude` | REAL | Latitude final | -23.5700 |
| `fim_longitude` | REAL | Longitude final | -46.6500 |
| `distancia_percorrida_km` | REAL | Distância em km | 15.7 |
| `velocidade_media` | REAL | Velocidade média | 32.5 |
| `observacoes` | TEXT | Observações | "Viagem normal" |

**Consultas Comuns**:
```sql
-- Viagens ativas de um motorista
SELECT * FROM tracking_trips 
WHERE motorista_id = ? AND status = 'ativa';

-- Relatório de viagens do dia
SELECT * FROM tracking_trips 
WHERE DATE(inicio_timestamp) = DATE('now');
```

### 3. 👶 tracking_child_events
**Descrição**: Registra eventos de embarque e desembarque de crianças.

```sql
CREATE TABLE tracking_child_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    crianca_id INTEGER NOT NULL,
    viagem_id INTEGER NOT NULL,
    tipo_evento TEXT NOT NULL,
    ponto_parada_id INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    latitude REAL,
    longitude REAL,
    observacoes TEXT,
    
    -- Índices para otimização
    INDEX idx_child_events_crianca (crianca_id),
    INDEX idx_child_events_viagem (viagem_id),
    INDEX idx_child_events_tipo (tipo_evento),
    INDEX idx_child_events_timestamp (timestamp),
    
    -- Chave estrangeira
    FOREIGN KEY (viagem_id) REFERENCES tracking_trips(id)
);
```

**Campos Detalhados**:
| Campo | Tipo | Descrição | Valores Possíveis |
|-------|------|-----------|-------------------|
| `id` | INTEGER | Chave primária | 1, 2, 3... |
| `crianca_id` | INTEGER | ID da criança | 1, 2, 3... |
| `viagem_id` | INTEGER | ID da viagem (FK) | 1, 2, 3... |
| `tipo_evento` | TEXT | Tipo do evento | 'embarque', 'desembarque' |
| `ponto_parada_id` | INTEGER | ID do ponto de parada | 1, 2, 3... |
| `timestamp` | DATETIME | Data/hora do evento | 2024-01-15 07:15:00 |
| `latitude` | REAL | Latitude do evento | -23.5505 |
| `longitude` | REAL | Longitude do evento | -46.6333 |
| `observacoes` | TEXT | Observações | "Embarque normal" |

**Consultas Comuns**:
```sql
-- Eventos de uma criança
SELECT * FROM tracking_child_events 
WHERE crianca_id = ? 
ORDER BY timestamp DESC;

-- Embarques/desembarques de uma viagem
SELECT * FROM tracking_child_events 
WHERE viagem_id = ? 
ORDER BY timestamp;
```

### 4. 📊 tracking_statistics
**Descrição**: Armazena estatísticas agregadas do sistema para relatórios.

```sql
CREATE TABLE tracking_statistics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data_referencia DATE NOT NULL,
    motorista_id INTEGER,
    total_localizacoes INTEGER DEFAULT 0,
    total_viagens INTEGER DEFAULT 0,
    total_embarques INTEGER DEFAULT 0,
    total_desembarques INTEGER DEFAULT 0,
    distancia_total_km REAL DEFAULT 0,
    tempo_total_minutos INTEGER DEFAULT 0,
    velocidade_media REAL DEFAULT 0,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Índices para otimização
    INDEX idx_stats_data (data_referencia),
    INDEX idx_stats_motorista (motorista_id),
    INDEX idx_stats_motorista_data (motorista_id, data_referencia),
    
    -- Constraint de unicidade
    UNIQUE(data_referencia, motorista_id)
);
```

**Campos Detalhados**:
| Campo | Tipo | Descrição | Exemplo |
|-------|------|-----------|---------|
| `id` | INTEGER | Chave primária | 1, 2, 3... |
| `data_referencia` | DATE | Data de referência | 2024-01-15 |
| `motorista_id` | INTEGER | ID do motorista | 1, 2, 3... |
| `total_localizacoes` | INTEGER | Total de localizações | 150 |
| `total_viagens` | INTEGER | Total de viagens | 4 |
| `total_embarques` | INTEGER | Total de embarques | 25 |
| `total_desembarques` | INTEGER | Total de desembarques | 25 |
| `distancia_total_km` | REAL | Distância total | 85.5 |
| `tempo_total_minutos` | INTEGER | Tempo total | 240 |
| `velocidade_media` | REAL | Velocidade média | 32.8 |
| `timestamp` | DATETIME | Data de criação | 2024-01-15 23:59:59 |

### 5. 🔧 tracking_system_config
**Descrição**: Configurações do sistema de tracking.

```sql
CREATE TABLE tracking_system_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chave TEXT UNIQUE NOT NULL,
    valor TEXT NOT NULL,
    tipo TEXT DEFAULT 'string',
    descricao TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Índice para otimização
    INDEX idx_config_chave (chave)
);
```

**Configurações Padrão**:
```sql
INSERT INTO tracking_system_config (chave, valor, tipo, descricao) VALUES
('cache_retention_hours', '24', 'integer', 'Horas para manter dados em cache'),
('max_locations_per_driver', '1000', 'integer', 'Máximo de localizações por motorista'),
('cleanup_interval_hours', '6', 'integer', 'Intervalo de limpeza automática'),
('enable_real_time', 'true', 'boolean', 'Habilitar rastreamento em tempo real'),
('location_precision_meters', '10', 'integer', 'Precisão mínima de localização');
```

### 6. 📝 tracking_audit_log
**Descrição**: Log de auditoria para rastreamento de operações.

```sql
CREATE TABLE tracking_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER,
    acao TEXT NOT NULL,
    tabela_afetada TEXT,
    registro_id INTEGER,
    dados_anteriores TEXT,
    dados_novos TEXT,
    ip_address TEXT,
    user_agent TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Índices para otimização
    INDEX idx_audit_usuario (usuario_id),
    INDEX idx_audit_acao (acao),
    INDEX idx_audit_timestamp (timestamp),
    INDEX idx_audit_tabela (tabela_afetada)
);
```

## 🔗 Relacionamentos

### Diagrama de Relacionamentos
```
tracking_trips (1) ←→ (N) tracking_child_events
       ↓
tracking_locations (N) ←→ (1) motorista_id
       ↓
tracking_statistics (agregação)
       ↓
tracking_audit_log (auditoria)
```

### Chaves Estrangeiras
- `tracking_child_events.viagem_id` → `tracking_trips.id`
- `tracking_locations.motorista_id` → `motoristas.id` (tabela externa)
- `tracking_trips.motorista_id` → `motoristas.id` (tabela externa)

## 📈 Índices e Performance

### Índices Principais
```sql
-- Índices para tracking_locations
CREATE INDEX idx_tracking_motorista ON tracking_locations(motorista_id);
CREATE INDEX idx_tracking_timestamp ON tracking_locations(timestamp);
CREATE INDEX idx_tracking_motorista_timestamp ON tracking_locations(motorista_id, timestamp);

-- Índices para tracking_trips
CREATE INDEX idx_trips_motorista ON tracking_trips(motorista_id);
CREATE INDEX idx_trips_status ON tracking_trips(status);
CREATE INDEX idx_trips_data ON tracking_trips(inicio_timestamp);

-- Índices para tracking_child_events
CREATE INDEX idx_child_events_crianca ON tracking_child_events(crianca_id);
CREATE INDEX idx_child_events_viagem ON tracking_child_events(viagem_id);
CREATE INDEX idx_child_events_tipo ON tracking_child_events(tipo_evento);
```

### Consultas Otimizadas
```sql
-- Consulta mais eficiente para última localização
SELECT * FROM tracking_locations 
WHERE motorista_id = ? 
ORDER BY timestamp DESC 
LIMIT 1;

-- Consulta otimizada para histórico com paginação
SELECT * FROM tracking_locations 
WHERE motorista_id = ? 
AND timestamp >= ? 
ORDER BY timestamp DESC 
LIMIT ? OFFSET ?;
```

## 🧹 Manutenção e Limpeza

### Limpeza Automática
O sistema implementa limpeza automática baseada em:
- **Idade dos dados**: Remove registros mais antigos que X horas
- **Limite por motorista**: Mantém apenas os N registros mais recentes
- **Viagens ativas**: Preserva dados de viagens em andamento

### Scripts de Manutenção
```sql
-- Limpeza de localizações antigas (mais de 24h)
DELETE FROM tracking_locations 
WHERE timestamp < datetime('now', '-24 hours')
AND motorista_id NOT IN (
    SELECT DISTINCT motorista_id 
    FROM tracking_trips 
    WHERE status = 'ativa'
);

-- Limpeza de logs de auditoria (mais de 30 dias)
DELETE FROM tracking_audit_log 
WHERE timestamp < datetime('now', '-30 days');

-- Atualização de estatísticas
INSERT OR REPLACE INTO tracking_statistics (
    data_referencia, motorista_id, total_localizacoes, total_viagens
) 
SELECT 
    DATE('now'), 
    motorista_id, 
    COUNT(*), 
    (SELECT COUNT(*) FROM tracking_trips WHERE motorista_id = tl.motorista_id)
FROM tracking_locations tl 
WHERE DATE(timestamp) = DATE('now')
GROUP BY motorista_id;
```

## 🔒 Segurança e Backup

### Configurações de Segurança
- **WAL Mode**: Permite leituras concorrentes
- **Transações**: Garantem consistência dos dados
- **Validação**: Constraints e checks nos dados
- **Auditoria**: Log completo de operações

### Estratégia de Backup
```bash
# Backup diário automático
sqlite3 database.db ".backup backup_$(date +%Y%m%d).db"

# Backup incremental (WAL)
cp database.db-wal backup_wal_$(date +%Y%m%d_%H%M).wal
```

## 📊 Monitoramento

### Métricas Importantes
- **Tamanho do banco**: Monitorar crescimento
- **Performance de consultas**: Tempo de resposta
- **Índices utilizados**: EXPLAIN QUERY PLAN
- **Fragmentação**: VACUUM periódico

### Consultas de Monitoramento
```sql
-- Tamanho das tabelas
SELECT name, COUNT(*) as registros 
FROM sqlite_master sm, pragma_table_info(sm.name) 
WHERE sm.type = 'table' 
GROUP BY name;

-- Performance de índices
EXPLAIN QUERY PLAN 
SELECT * FROM tracking_locations 
WHERE motorista_id = 1 
ORDER BY timestamp DESC LIMIT 1;
```

## 🚀 Migração e Versionamento

### Controle de Versão
```sql
-- Tabela de controle de versão
CREATE TABLE schema_version (
    version INTEGER PRIMARY KEY,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

-- Versão atual
INSERT INTO schema_version (version, description) 
VALUES (1, 'Estrutura inicial do sistema de tracking');
```

### Scripts de Migração
Cada alteração na estrutura deve ter um script de migração correspondente:
- `migration_001_initial.sql`
- `migration_002_add_audit.sql`
- `migration_003_optimize_indexes.sql`

---

## 📞 Suporte

Para dúvidas sobre a estrutura do banco de dados:
- **Documentação**: Este arquivo
- **Código fonte**: `tracking-persistence.js`
- **Testes**: `testar-persistencia-rastreamento.js`
- **Exemplos**: `exemplos-uso-tracking.js`

---

*Última atualização: Janeiro 2024*
*Versão do schema: 1.0*