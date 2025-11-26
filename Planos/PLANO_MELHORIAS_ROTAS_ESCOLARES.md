# PLANO DE MELHORIAS - SISTEMA DE ROTAS ESCOLARES

## 📋 VISÃO GERAL DO PROJETO

### Objetivo
Implementar um sistema completo de gestão de rotas escolares que permita:
- Motoristas cadastrarem rotas de ida e volta
- Limitação por plano de assinatura (Basic/Premium)
- Cadastro de crianças nas rotas baseado na capacidade do veículo
- **Sistema de conferência de crianças em tempo real**
- **Rastreamento GPS integrado com Google Maps API**
- **Notificações automáticas para responsáveis**
- **Cálculo automático de quilometragem e combustível**
- Visualização das rotas pelos responsáveis
- Exibição das rotas disponíveis na página de busca

### Fluxo Principal
1. **Motorista** → Cadastra rota escolar (ida/volta) na área do motorista
2. **Sistema** → Valida limitações do plano de assinatura
3. **Motorista** → Adiciona crianças à rota (limitado pela capacidade do veículo)
4. **🆕 Motorista** → Inicia rota e acessa página de conferência de crianças
5. **🆕 Sistema** → Detecta paradas e solicita confirmação de embarque/desembarque
6. **🆕 Sistema** → Envia notificações automáticas para responsáveis
7. **🆕 Sistema** → Calcula quilometragem, combustível e tempo de rota
8. **Responsável** → Visualiza rotas da criança na área do responsável
9. **Público** → Encontra rotas disponíveis na página de busca

---

## 🗄️ ESTRUTURA DE DADOS

### 1. Tabela: `planos_assinatura`
```sql
CREATE TABLE IF NOT EXISTS planos_assinatura (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo_plano VARCHAR(20) NOT NULL CHECK (tipo_plano IN ('basic', 'premium', 'enterprise')),
    limite_rotas INTEGER NOT NULL,
    limite_usuarios INTEGER NOT NULL,
    data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
    data_fim DATE,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Atualização da Tabela: `rotas_escolares`
```sql
-- Adicionar campos necessários para ida e volta
ALTER TABLE rotas_escolares ADD COLUMN IF NOT EXISTS tipo_rota VARCHAR(10) CHECK (tipo_rota IN ('ida', 'volta'));
ALTER TABLE rotas_escolares ADD COLUMN IF NOT EXISTS rota_ida_id INTEGER REFERENCES rotas_escolares(id);
ALTER TABLE rotas_escolares ADD COLUMN IF NOT EXISTS endereco_origem TEXT;
ALTER TABLE rotas_escolares ADD COLUMN IF NOT EXISTS endereco_destino TEXT;
ALTER TABLE rotas_escolares ADD COLUMN IF NOT EXISTS latitude_origem DECIMAL(10, 8);
ALTER TABLE rotas_escolares ADD COLUMN IF NOT EXISTS longitude_origem DECIMAL(11, 8);
ALTER TABLE rotas_escolares ADD COLUMN IF NOT EXISTS latitude_destino DECIMAL(10, 8);
ALTER TABLE rotas_escolares ADD COLUMN IF NOT EXISTS longitude_destino DECIMAL(11, 8);
ALTER TABLE rotas_escolares ADD COLUMN IF NOT EXISTS capacidade_atual INTEGER DEFAULT 0;
ALTER TABLE rotas_escolares ADD COLUMN IF NOT EXISTS capacidade_maxima INTEGER;
```

### 3. Tabela: `criancas_rotas`
```sql
CREATE TABLE IF NOT EXISTS criancas_rotas (
    id SERIAL PRIMARY KEY,
    crianca_id INTEGER REFERENCES criancas(id) ON DELETE CASCADE,
    rota_id INTEGER REFERENCES rotas_escolares(id) ON DELETE CASCADE,
    endereco_embarque TEXT NOT NULL,
    endereco_desembarque TEXT NOT NULL,
    latitude_embarque DECIMAL(10, 8),
    longitude_embarque DECIMAL(11, 8),
    latitude_desembarque DECIMAL(10, 8),
    longitude_desembarque DECIMAL(11, 8),
    horario_embarque_previsto TIME,
    horario_desembarque_previsto TIME,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 4. 🆕 Tabela: `viagens_ativas`
```sql
CREATE TABLE IF NOT EXISTS viagens_ativas (
    id SERIAL PRIMARY KEY,
    rota_id INTEGER REFERENCES rotas_escolares(id) ON DELETE CASCADE,
    motorista_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    data_viagem DATE NOT NULL DEFAULT CURRENT_DATE,
    horario_inicio TIMESTAMP WITH TIME ZONE,
    horario_fim TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'iniciada' CHECK (status IN ('iniciada', 'em_andamento', 'finalizada', 'cancelada')),
    quilometragem_inicial DECIMAL(10, 2),
    quilometragem_final DECIMAL(10, 2),
    combustivel_gasto DECIMAL(8, 2),
    tempo_total_minutos INTEGER,
    observacoes TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 5. 🆕 Tabela: `conferencia_criancas`
```sql
CREATE TABLE IF NOT EXISTS conferencia_criancas (
    id SERIAL PRIMARY KEY,
    viagem_id INTEGER REFERENCES viagens_ativas(id) ON DELETE CASCADE,
    crianca_id INTEGER REFERENCES criancas(id) ON DELETE CASCADE,
    tipo_evento VARCHAR(15) NOT NULL CHECK (tipo_evento IN ('embarque', 'desembarque')),
    horario_previsto TIMESTAMP WITH TIME ZONE,
    horario_real TIMESTAMP WITH TIME ZONE,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    endereco TEXT,
    confirmado BOOLEAN DEFAULT false,
    observacoes TEXT,
    notificacao_enviada BOOLEAN DEFAULT false,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 6. 🆕 Tabela: `rastreamento_gps`
```sql
CREATE TABLE IF NOT EXISTS rastreamento_gps (
    id SERIAL PRIMARY KEY,
    viagem_id INTEGER REFERENCES viagens_ativas(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    velocidade DECIMAL(5, 2),
    direcao INTEGER, -- graus (0-360)
    precisao DECIMAL(8, 2),
    timestamp_gps TIMESTAMP WITH TIME ZONE NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 7. 🆕 Tabela: `paradas_rota`
```sql
CREATE TABLE IF NOT EXISTS paradas_rota (
    id SERIAL PRIMARY KEY,
    rota_id INTEGER REFERENCES rotas_escolares(id) ON DELETE CASCADE,
    ordem_parada INTEGER NOT NULL,
    endereco TEXT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    horario_previsto TIME,
    raio_deteccao INTEGER DEFAULT 50, -- metros
    tipo_parada VARCHAR(15) CHECK (tipo_parada IN ('embarque', 'desembarque', 'escola')),
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔧 IMPLEMENTAÇÃO POR ETAPAS

### ETAPA 1: BACKEND - ESTRUTURA DE DADOS
**Prioridade: ALTA**

#### 1.1 Criar/Atualizar Tabelas do Banco
- [ ] Criar tabela `planos_assinatura`
- [ ] Atualizar tabela `rotas_escolares` com novos campos
- [ ] Criar tabela `criancas_rotas`
- [ ] Criar índices para otimização de consultas

#### 1.2 Inserir Dados de Planos Padrão
```sql
INSERT INTO planos_assinatura (usuario_id, tipo_plano, limite_rotas, limite_usuarios) VALUES
(1, 'basic', 10, 5),
(2, 'premium', 50, 15);
```

#### 1.3 Validação e Testes
- [ ] Testar criação das tabelas
- [ ] Verificar relacionamentos entre tabelas
- [ ] Validar constraints e índices

---

### ETAPA 2: BACKEND - APIs DE ROTAS ESCOLARES
**Prioridade: ALTA**

#### 2.1 API para Gestão de Rotas (`/api/motorista-escolar/rotas`)

##### 2.1.1 Listar Rotas do Motorista
```javascript
GET /api/motorista-escolar/rotas
// Retorna todas as rotas do motorista com informações de capacidade
```

##### 2.1.2 Criar Nova Rota
```javascript
POST /api/motorista-escolar/rotas
{
  "nome_rota": "Rota Centro - Escola ABC",
  "escola_destino": "Escola Municipal ABC",
  "turno": "manha",
  "tipo_rota": "ida", // ou "volta"
  "endereco_origem": "Rua das Flores, 123",
  "endereco_destino": "Av. Educação, 456",
  "horario_ida": "07:00",
  "horario_volta": "12:00",
  "dias_semana": "seg-sex",
  "valor_mensal": 150.00
}
```

##### 2.1.3 Validar Limite de Rotas por Plano
```javascript
// Middleware para validar se o motorista pode criar mais rotas
const validarLimiteRotas = async (ctx, next) => {
  const motoristaId = ctx.user.id;
  const plano = await buscarPlanoAtivo(motoristaId);
  const rotasAtivas = await contarRotasAtivas(motoristaId);
  
  if (rotasAtivas >= plano.limite_rotas) {
    ctx.status = 403;
    ctx.body = {
      sucesso: false,
      mensagem: `Limite de ${plano.limite_rotas} rotas atingido para o plano ${plano.tipo_plano}`
    };
    return;
  }
  await next();
};
```

#### 2.2 API para Gestão de Crianças nas Rotas

##### 2.2.1 Adicionar Criança à Rota
```javascript
POST /api/motorista-escolar/rotas/:rota_id/criancas
{
  "crianca_id": 1,
  "endereco_embarque": "Rua A, 123",
  "endereco_desembarque": "Escola ABC",
  "horario_embarque_previsto": "07:15"
}
```

##### 2.2.2 Validar Capacidade do Veículo
```javascript
const validarCapacidadeVeiculo = async (rotaId, motoristaId) => {
  const veiculo = await buscarVeiculoMotorista(motoristaId);
  const capacidadeAtual = await contarCriancasNaRota(rotaId);
  
  if (capacidadeAtual >= veiculo.lotacao_maxima) {
    throw new Error(`Capacidade máxima de ${veiculo.lotacao_maxima} passageiros atingida`);
  }
};
```

---

### ETAPA 3: FRONTEND - ÁREA DO MOTORISTA ESCOLAR
**Prioridade: ALTA**

#### 3.1 Interface de Gestão de Rotas

##### 3.1.1 Seção "Minhas Rotas"
- [ ] Lista de rotas existentes com status
- [ ] Botão "Nova Rota" com validação de limite
- [ ] Cards informativos mostrando capacidade atual/máxima
- [ ] Filtros por turno, escola, status

##### 3.1.2 Formulário de Criação de Rota
```html
<form id="form-nova-rota">
  <div class="rota-basica">
    <input type="text" name="nome_rota" placeholder="Nome da Rota" required>
    <input type="text" name="escola_destino" placeholder="Escola de Destino" required>
    <select name="turno" required>
      <option value="manha">Manhã</option>
      <option value="tarde">Tarde</option>
      <option value="noite">Noite</option>
    </select>
  </div>
  
  <div class="endereco-origem">
    <label>Ponto de Origem</label>
    <input type="text" name="endereco_origem" placeholder="Endereço de origem" required>
    <button type="button" id="btn-localizar-origem">📍 Localizar</button>
  </div>
  
  <div class="endereco-destino">
    <label>Escola/Destino</label>
    <input type="text" name="endereco_destino" placeholder="Endereço da escola" required>
    <button type="button" id="btn-localizar-destino">📍 Localizar</button>
  </div>
  
  <div class="horarios">
    <input type="time" name="horario_ida" placeholder="Horário de Ida" required>
    <input type="time" name="horario_volta" placeholder="Horário de Volta" required>
  </div>
  
  <div class="configuracoes">
    <input type="number" name="valor_mensal" placeholder="Valor Mensal (R$)" step="0.01" required>
    <select name="dias_semana" required>
      <option value="seg-sex">Segunda a Sexta</option>
      <option value="seg-sab">Segunda a Sábado</option>
    </select>
  </div>
  
  <button type="submit">Criar Rota</button>
</form>
```

##### 3.1.3 Gestão de Crianças na Rota
- [ ] Lista de crianças cadastradas na rota
- [ ] Botão "Adicionar Criança" com busca
- [ ] Indicador visual de capacidade (ex: 8/15 crianças)
- [ ] Mapa mostrando pontos de embarque/desembarque

#### 3.2 JavaScript para Funcionalidades

##### 3.2.1 Validação de Limite de Rotas
```javascript
async function validarLimiteRotas() {
  try {
    const response = await fetch('/api/motorista-escolar/plano-info');
    const planoInfo = await response.json();
    
    if (planoInfo.rotas_ativas >= planoInfo.limite_rotas) {
      mostrarModalUpgrade(planoInfo.tipo_plano);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Erro ao validar limite:', error);
    return false;
  }
}

function mostrarModalUpgrade(planoAtual) {
  const modal = document.createElement('div');
  modal.innerHTML = `
    <div class="modal-upgrade">
      <h3>Limite de Rotas Atingido</h3>
      <p>Seu plano ${planoAtual} permite um número limitado de rotas.</p>
      <p>Faça upgrade para criar mais rotas!</p>
      <a href="/planos.html" class="btn btn-primary">Ver Planos</a>
    </div>
  `;
  document.body.appendChild(modal);
}
```

---

### ETAPA 4: FRONTEND - ÁREA DO RESPONSÁVEL
**Prioridade: MÉDIA**

#### 4.1 Visualização de Rotas da Criança

##### 4.1.1 Seção "Rota da Criança"
```html
<div class="rota-crianca-info">
  <h3>Informações da Rota</h3>
  
  <div class="rota-detalhes">
    <div class="rota-header">
      <h4 id="nome-rota">Carregando...</h4>
      <span class="status-rota" id="status-rota">Ativa</span>
    </div>
    
    <div class="rota-percurso">
      <div class="ponto-origem">
        <span class="icone">🏠</span>
        <div class="info">
          <strong>Embarque</strong>
          <p id="endereco-embarque">Carregando...</p>
          <small id="horario-embarque">Carregando...</small>
        </div>
      </div>
      
      <div class="linha-rota">
        <div class="linha"></div>
        <span class="icone-rota">🚌</span>
      </div>
      
      <div class="ponto-destino">
        <span class="icone">🏫</span>
        <div class="info">
          <strong>Escola</strong>
          <p id="endereco-escola">Carregando...</p>
          <small id="horario-chegada">Carregando...</small>
        </div>
      </div>
    </div>
    
    <div class="rota-motorista">
      <h5>Motorista Responsável</h5>
      <div class="motorista-info">
        <img id="foto-motorista" src="" alt="Foto do motorista">
        <div>
          <strong id="nome-motorista">Carregando...</strong>
          <p id="telefone-motorista">Carregando...</p>
        </div>
        <button class="btn btn-outline" id="btn-contatar-motorista">
          📞 Contatar
        </button>
      </div>
    </div>
  </div>
  
  <div class="mapa-rota">
    <div id="mapa-rota-responsavel" style="height: 300px;"></div>
  </div>
</div>
```

##### 4.1.2 API para Dados da Rota
```javascript
// Endpoint: GET /api/responsavel/crianca/:id/rota
async function carregarRotaCrianca(criancaId) {
  try {
    const response = await fetch(`/api/responsavel/crianca/${criancaId}/rota`);
    const rotaData = await response.json();
    
    if (rotaData.sucesso) {
      preencherInformacoesRota(rotaData.rota);
      inicializarMapaRota(rotaData.rota);
    }
  } catch (error) {
    console.error('Erro ao carregar rota:', error);
  }
}
```

---

### ETAPA 5: FRONTEND - PÁGINA ENCONTRAR TRANSPORTE
**Prioridade: BAIXA**

#### 5.1 Seção de Transporte Escolar

##### 5.1.1 Cards de Rotas Disponíveis
```html
<div class="rotas-disponiveis">
  <h3>Rotas Escolares Disponíveis</h3>
  
  <div class="filtros-rotas">
    <select id="filtro-escola">
      <option value="">Todas as Escolas</option>
    </select>
    <select id="filtro-turno">
      <option value="">Todos os Turnos</option>
      <option value="manha">Manhã</option>
      <option value="tarde">Tarde</option>
    </select>
    <input type="range" id="filtro-preco" min="50" max="500" value="250">
    <span>Até R$ <span id="valor-preco">250</span>/mês</span>
  </div>
  
  <div class="grid-rotas" id="grid-rotas">
    <!-- Cards serão inseridos dinamicamente -->
  </div>
</div>
```

##### 5.1.2 Template de Card de Rota
```javascript
function criarCardRota(rota) {
  return `
    <div class="card-rota" data-rota-id="${rota.id}">
      <div class="rota-header">
        <h4>${rota.nome_rota}</h4>
        <span class="preco">R$ ${rota.valor_mensal}/mês</span>
      </div>
      
      <div class="rota-info">
        <div class="escola">
          <span class="icone">🏫</span>
          <span>${rota.escola_destino}</span>
        </div>
        <div class="turno">
          <span class="icone">⏰</span>
          <span>${rota.turno}</span>
        </div>
        <div class="vagas">
          <span class="icone">👥</span>
          <span>${rota.vagas_disponiveis} vagas disponíveis</span>
        </div>
      </div>
      
      <div class="rota-percurso-mini">
        <span>${rota.endereco_origem}</span>
        <span class="seta">→</span>
        <span>${rota.escola_destino}</span>
      </div>
      
      <div class="motorista-preview">
        <img src="${rota.motorista.foto || '/assets/images/default-avatar.png'}" alt="Motorista">
        <div>
          <strong>${rota.motorista.nome}</strong>
          <div class="avaliacao">
            ${'★'.repeat(rota.motorista.avaliacao || 5)}
          </div>
        </div>
      </div>
      
      <div class="card-actions">
        <button class="btn btn-outline" onclick="verDetalhesRota(${rota.id})">
          Ver Detalhes
        </button>
        <button class="btn btn-primary" onclick="solicitarVaga(${rota.id})">
          Solicitar Vaga
        </button>
      </div>
    </div>
  `;
}
```

---

### ETAPA 6: 🆕 SISTEMA DE CONFERÊNCIA E RASTREAMENTO
**Prioridade: CRÍTICA**

#### 6.1 Backend - APIs de Rastreamento e Conferência

##### 6.1.1 API para Iniciar Viagem
```javascript
POST /api/motorista-escolar/viagens/iniciar
{
  "rota_id": 1,
  "quilometragem_inicial": 45230.5,
  "observacoes": "Rota normal, sem intercorrências"
}
```

##### 6.1.2 API para Rastreamento GPS
```javascript
POST /api/motorista-escolar/viagens/:viagem_id/gps
{
  "latitude": -23.5505,
  "longitude": -46.6333,
  "velocidade": 35.5,
  "direcao": 180,
  "precisao": 5.0,
  "timestamp": "2024-01-15T08:30:00Z"
}

// Endpoint para stream de dados GPS
WebSocket /ws/tracking/:viagem_id
```

##### 6.1.3 API para Conferência de Crianças
```javascript
// Listar crianças previstas para a viagem
GET /api/motorista-escolar/viagens/:viagem_id/criancas

// Confirmar embarque/desembarque
POST /api/motorista-escolar/viagens/:viagem_id/conferencia
{
  "crianca_id": 1,
  "tipo_evento": "embarque", // ou "desembarque"
  "latitude": -23.5505,
  "longitude": -46.6333,
  "endereco": "Rua das Flores, 123",
  "observacoes": "Criança embarcou normalmente"
}

// Detectar paradas próximas
GET /api/motorista-escolar/viagens/:viagem_id/paradas-proximas?lat=-23.5505&lng=-46.6333&raio=100
```

##### 6.1.4 API para Cálculos Automáticos
```javascript
// Calcular estatísticas da viagem
GET /api/motorista-escolar/viagens/:viagem_id/estatisticas
{
  "quilometragem_percorrida": 15.8,
  "combustivel_estimado": 1.2,
  "tempo_total_minutos": 45,
  "velocidade_media": 21.1,
  "paradas_realizadas": 8,
  "criancas_transportadas": 12
}

// Finalizar viagem
POST /api/motorista-escolar/viagens/:viagem_id/finalizar
{
  "quilometragem_final": 45246.3,
  "observacoes": "Viagem concluída sem intercorrências"
}
```

#### 6.2 Frontend - Página de Conferência de Crianças

##### 6.2.1 Interface Principal de Conferência
```html
<div class="conferencia-container">
  <div class="viagem-header">
    <h2>Conferência de Crianças</h2>
    <div class="viagem-info">
      <span class="rota-nome" id="rota-nome">Rota Centro - Escola ABC</span>
      <span class="status-viagem" id="status-viagem">Em Andamento</span>
      <span class="tempo-viagem" id="tempo-viagem">00:25:30</span>
    </div>
  </div>

  <!-- Mapa de Rastreamento -->
  <div class="mapa-rastreamento">
    <div id="mapa-conferencia" style="height: 300px;"></div>
    <div class="controles-mapa">
      <button class="btn-mapa" id="centralizar-posicao">
        <i class="fas fa-crosshairs"></i> Centralizar
      </button>
      <button class="btn-mapa" id="mostrar-rota-completa">
        <i class="fas fa-route"></i> Rota Completa
      </button>
    </div>
  </div>

  <!-- Lista de Crianças -->
  <div class="lista-criancas">
    <h3>Crianças da Rota</h3>
    <div class="filtros-conferencia">
      <button class="filtro-btn active" data-filtro="todas">Todas (12)</button>
      <button class="filtro-btn" data-filtro="pendentes">Pendentes (8)</button>
      <button class="filtro-btn" data-filtro="embarcadas">Embarcadas (4)</button>
      <button class="filtro-btn" data-filtro="desembarcadas">Desembarcadas (0)</button>
    </div>

    <div class="criancas-grid" id="criancas-grid">
      <!-- Cards de crianças serão inseridos dinamicamente -->
    </div>
  </div>

  <!-- Parada Atual -->
  <div class="parada-atual" id="parada-atual" style="display: none;">
    <div class="parada-info">
      <h4>Parada Detectada</h4>
      <p class="endereco-parada" id="endereco-parada">Rua das Flores, 123</p>
      <p class="distancia-parada" id="distancia-parada">Você está a 15m da parada</p>
    </div>
    <div class="acoes-parada">
      <button class="btn btn-primary" id="confirmar-parada">
        Confirmar Parada
      </button>
      <button class="btn btn-secondary" id="ignorar-parada">
        Ignorar
      </button>
    </div>
  </div>

  <!-- Estatísticas da Viagem -->
  <div class="estatisticas-viagem">
    <div class="stat-card">
      <div class="stat-icon">📏</div>
      <div class="stat-value" id="quilometragem">0.0 km</div>
      <div class="stat-label">Percorrido</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">⛽</div>
      <div class="stat-value" id="combustivel">0.0 L</div>
      <div class="stat-label">Combustível</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">⏱️</div>
      <div class="stat-value" id="tempo-total">00:00</div>
      <div class="stat-label">Tempo</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">🚌</div>
      <div class="stat-value" id="velocidade-media">0 km/h</div>
      <div class="stat-label">Vel. Média</div>
    </div>
  </div>

  <!-- Ações da Viagem -->
  <div class="acoes-viagem">
    <button class="btn btn-warning" id="pausar-viagem">
      <i class="fas fa-pause"></i> Pausar Viagem
    </button>
    <button class="btn btn-success" id="finalizar-viagem">
      <i class="fas fa-flag-checkered"></i> Finalizar Viagem
    </button>
    <button class="btn btn-danger" id="emergencia">
      <i class="fas fa-exclamation-triangle"></i> Emergência
    </button>
  </div>
</div>
```

##### 6.2.2 Template de Card de Criança
```javascript
function criarCardCrianca(crianca) {
  const statusClass = crianca.status || 'pendente';
  const statusIcon = {
    'pendente': '⏳',
    'embarcada': '✅',
    'desembarcada': '🏫',
    'ausente': '❌'
  };

  return `
    <div class="crianca-card ${statusClass}" data-crianca-id="${crianca.id}">
      <div class="crianca-foto">
        <img src="${crianca.foto || '/assets/images/default-child.png'}" alt="${crianca.nome}">
        <span class="status-icon">${statusIcon[statusClass]}</span>
      </div>
      
      <div class="crianca-info">
        <h4 class="crianca-nome">${crianca.nome}</h4>
        <p class="crianca-endereco">${crianca.endereco_embarque}</p>
        <p class="crianca-horario">Previsto: ${crianca.horario_previsto}</p>
        ${crianca.horario_real ? `<p class="horario-real">Real: ${crianca.horario_real}</p>` : ''}
      </div>
      
      <div class="crianca-acoes">
        ${statusClass === 'pendente' ? `
          <button class="btn btn-sm btn-success" onclick="confirmarEmbarque(${crianca.id})">
            <i class="fas fa-check"></i> Embarcar
          </button>
          <button class="btn btn-sm btn-warning" onclick="marcarAusente(${crianca.id})">
            <i class="fas fa-times"></i> Ausente
          </button>
        ` : ''}
        
        ${statusClass === 'embarcada' ? `
          <button class="btn btn-sm btn-primary" onclick="confirmarDesembarque(${crianca.id})">
            <i class="fas fa-school"></i> Desembarcar
          </button>
        ` : ''}
        
        <button class="btn btn-sm btn-outline" onclick="contatarResponsavel(${crianca.id})">
          <i class="fas fa-phone"></i>
        </button>
      </div>
      
      ${crianca.observacoes ? `
        <div class="crianca-observacoes">
          <small><i class="fas fa-info-circle"></i> ${crianca.observacoes}</small>
        </div>
      ` : ''}
    </div>
  `;
}
```

#### 6.3 Sistema de Notificações Automáticas

##### 6.3.1 Integração com Preferências do Responsável
```javascript
// Buscar preferências de notificação do responsável
async function buscarPreferenciasNotificacao(responsavelId) {
  const response = await fetch(`/api/responsavel/${responsavelId}/preferencias-notificacao`);
  return await response.json();
}

// Enviar notificação baseada nas preferências
async function enviarNotificacaoPersonalizada(criancaId, tipoEvento, dados) {
  const responsavel = await buscarResponsavelCrianca(criancaId);
  const preferencias = await buscarPreferenciasNotificacao(responsavel.id);
  
  const notificacao = {
    responsavel_id: responsavel.id,
    crianca_id: criancaId,
    tipo: tipoEvento, // 'embarque', 'desembarque', 'atraso', 'emergencia'
    titulo: gerarTituloNotificacao(tipoEvento, dados),
    mensagem: gerarMensagemNotificacao(tipoEvento, dados),
    canais: determinarCanaisNotificacao(preferencias, tipoEvento),
    dados_extras: {
      localizacao: dados.localizacao,
      horario: dados.horario,
      motorista: dados.motorista
    }
  };
  
  await enviarNotificacao(notificacao);
}
```

##### 6.3.2 Templates de Notificação
```javascript
const templatesNotificacao = {
  embarque: {
    titulo: "🚌 {crianca_nome} embarcou no transporte",
    mensagem: "Sua criança embarcou às {horario} na {endereco}. Motorista: {motorista_nome}",
    urgencia: "normal"
  },
  desembarque: {
    titulo: "🏫 {crianca_nome} chegou à escola",
    mensagem: "Sua criança chegou à escola às {horario}. Viagem concluída com sucesso!",
    urgencia: "normal"
  },
  atraso: {
    titulo: "⏰ Atraso na rota de {crianca_nome}",
    mensagem: "O transporte está {minutos_atraso} minutos atrasado. Previsão de chegada: {nova_previsao}",
    urgencia: "alta"
  },
  emergencia: {
    titulo: "🚨 EMERGÊNCIA - {crianca_nome}",
    mensagem: "Situação de emergência reportada. Entre em contato imediatamente: {telefone_motorista}",
    urgencia: "critica"
  }
};
```

#### 6.4 Integração com Google Maps API

##### 6.4.1 Configuração de Rastreamento
```javascript
class RastreamentoGPS {
  constructor(viagemId) {
    this.viagemId = viagemId;
    this.watchId = null;
    this.ultimaPosicao = null;
    this.distanciaPercorrida = 0;
    this.velocidadeMedia = 0;
    this.pontos = [];
  }

  iniciarRastreamento() {
    if (navigator.geolocation) {
      this.watchId = navigator.geolocation.watchPosition(
        (position) => this.processarPosicao(position),
        (error) => this.tratarErro(error),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000
        }
      );
    }
  }

  async processarPosicao(position) {
    const novaPosicao = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      velocidade: position.coords.speed || 0,
      precisao: position.coords.accuracy,
      timestamp: new Date().toISOString()
    };

    // Calcular distância se não for a primeira posição
    if (this.ultimaPosicao) {
      const distancia = this.calcularDistancia(this.ultimaPosicao, novaPosicao);
      this.distanciaPercorrida += distancia;
    }

    // Enviar dados para o servidor
    await this.enviarDadosGPS(novaPosicao);
    
    // Verificar paradas próximas
    await this.verificarParadasProximas(novaPosicao);
    
    // Atualizar interface
    this.atualizarInterface(novaPosicao);
    
    this.ultimaPosicao = novaPosicao;
    this.pontos.push(novaPosicao);
  }

  calcularDistancia(pos1, pos2) {
    // Fórmula de Haversine para calcular distância entre coordenadas
    const R = 6371; // Raio da Terra em km
    const dLat = this.toRad(pos2.latitude - pos1.latitude);
    const dLon = this.toRad(pos2.longitude - pos1.longitude);
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.toRad(pos1.latitude)) * Math.cos(this.toRad(pos2.latitude)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distância em km
  }

  async verificarParadasProximas(posicao) {
    try {
      const response = await fetch(
        `/api/motorista-escolar/viagens/${this.viagemId}/paradas-proximas?` +
        `lat=${posicao.latitude}&lng=${posicao.longitude}&raio=50`
      );
      
      const paradas = await response.json();
      
      if (paradas.length > 0) {
        this.mostrarAlertaParada(paradas[0]);
      }
    } catch (error) {
      console.error('Erro ao verificar paradas:', error);
    }
  }
}
```

##### 6.4.2 Cálculo de Combustível
```javascript
class CalculadoraCombustivel {
  constructor(veiculo) {
    this.consumoMedio = veiculo.consumo_medio || 10; // km/l
    this.tipoCombustivel = veiculo.tipo_combustivel || 'gasolina';
    this.precoLitro = this.obterPrecoAtual();
  }

  calcularGasto(quilometragemPercorrida) {
    const litrosGastos = quilometragemPercorrida / this.consumoMedio;
    const valorGasto = litrosGastos * this.precoLitro;
    
    return {
      litros: parseFloat(litrosGastos.toFixed(2)),
      valor: parseFloat(valorGasto.toFixed(2)),
      quilometragem: quilometragemPercorrida
    };
  }

  obterPrecoAtual() {
    // Integração com API de preços de combustível ou valor fixo
    const precos = {
      'gasolina': 5.50,
      'etanol': 3.80,
      'diesel': 4.20
    };
    return precos[this.tipoCombustivel] || 5.50;
  }
}
```

---

## 🔗 APIS NECESSÁRIAS

### Backend Routes

#### 1. Motorista Escolar
```javascript
// /api/motorista-escolar/rotas
GET    /rotas                    // Listar rotas do motorista
POST   /rotas                    // Criar nova rota
PUT    /rotas/:id                // Atualizar rota
DELETE /rotas/:id                // Excluir rota
GET    /rotas/:id/criancas       // Listar crianças da rota
POST   /rotas/:id/criancas       // Adicionar criança à rota
DELETE /rotas/:id/criancas/:crianca_id // Remover criança da rota
GET    /plano-info               // Informações do plano atual
```

#### 2. Responsável
```javascript
// /api/responsavel
GET /crianca/:id/rota            // Dados da rota da criança
GET /crianca/:id/motorista       // Dados do motorista da criança
```

#### 3. Público (Encontrar Transporte)
```javascript
// /api/transportes
GET /rotas-escolares             // Listar rotas disponíveis
GET /rotas-escolares/:id         // Detalhes de uma rota específica
POST /rotas-escolares/:id/solicitar // Solicitar vaga na rota
```

---

## 🧪 PLANO DE TESTES

### Testes por Etapa

#### ETAPA 1: Banco de Dados
- [ ] Criar tabelas sem erros
- [ ] Inserir dados de teste
- [ ] Validar relacionamentos
- [ ] Testar constraints

#### ETAPA 2: APIs Backend
- [ ] Testar criação de rota com limite
- [ ] Validar adição de criança com capacidade
- [ ] Testar busca de rotas disponíveis
- [ ] Validar autenticação e autorização

#### ETAPA 3: Frontend Motorista
- [ ] Testar formulário de criação de rota
- [ ] Validar limite de rotas por plano
- [ ] Testar adição de crianças
- [ ] Verificar responsividade

#### ETAPA 4: Frontend Responsável
- [ ] Testar carregamento de dados da rota
- [ ] Validar exibição do mapa
- [ ] Testar funcionalidades de contato

#### ETAPA 5: Frontend Público
- [ ] Testar filtros de busca
- [ ] Validar exibição de rotas
- [ ] Testar solicitação de vagas

#### ETAPA 6: Sistema de Conferência e Rastreamento
- [ ] **Backend - APIs de Rastreamento:**
  - [ ] Testar inicialização de viagem
  - [ ] Validar recebimento de dados GPS
  - [ ] Testar detecção de paradas próximas
  - [ ] Validar cálculos de quilometragem e combustível
  - [ ] Testar finalização de viagem

- [ ] **Backend - APIs de Conferência:**
  - [ ] Testar listagem de crianças da viagem
  - [ ] Validar confirmação de embarque/desembarque
  - [ ] Testar registro de ausências
  - [ ] Validar histórico de eventos

- [ ] **Frontend - Página de Conferência:**
  - [ ] Testar carregamento da lista de crianças
  - [ ] Validar interface de mapa em tempo real
  - [ ] Testar filtros de status das crianças
  - [ ] Validar ações de embarque/desembarque
  - [ ] Testar exibição de estatísticas da viagem

- [ ] **Sistema de Notificações:**
  - [ ] Testar integração com preferências do responsável
  - [ ] Validar envio de notificações de embarque
  - [ ] Testar notificações de desembarque
  - [ ] Validar notificações de emergência
  - [ ] Testar diferentes canais de notificação

- [ ] **Integração Google Maps:**
  - [ ] Testar rastreamento GPS em tempo real
  - [ ] Validar cálculo de distâncias
  - [ ] Testar detecção automática de paradas
  - [ ] Validar precisão de localização
  - [ ] Testar performance com múltiplos pontos GPS

- [ ] **Testes de Integração:**
  - [ ] Testar fluxo completo de viagem
  - [ ] Validar sincronização entre motorista e responsáveis
  - [ ] Testar cenários de perda de conexão
  - [ ] Validar recuperação de dados após reconexão
  - [ ] Testar múltiplas viagens simultâneas

---

## 📊 MÉTRICAS DE SUCESSO

### Indicadores Técnicos
- [ ] Tempo de resposta das APIs < 500ms
- [ ] Interface responsiva em todos os dispositivos
- [ ] Zero erros de JavaScript no console
- [ ] Validação completa de dados

### Indicadores de Negócio
- [ ] Motoristas conseguem criar rotas facilmente
- [ ] Responsáveis visualizam informações completas
- [ ] Sistema de limitação por plano funcionando
- [ ] Busca pública retorna resultados relevantes

---

## 🚀 CRONOGRAMA SUGERIDO

### Semana 1: Estrutura Base
- Dias 1-2: Implementar ETAPA 1 (Banco de Dados)
- Dias 3-5: Implementar ETAPA 2 (APIs Backend)
- Dias 6-7: Testes das APIs

### Semana 2: Interface Motorista
- Dias 1-4: Implementar ETAPA 3 (Frontend Motorista)
- Dias 5-7: Testes e refinamentos

### Semana 3: Interface Responsável e Público
- Dias 1-3: Implementar ETAPA 4 (Frontend Responsável)
- Dias 4-6: Implementar ETAPA 5 (Frontend Público)
- Dia 7: Testes finais e documentação

### Semana 4: Sistema de Conferência e Rastreamento (ETAPA 6)
- Dias 1-2: Implementar estrutura de banco para rastreamento e conferência
- Dias 3-4: Desenvolver APIs de rastreamento GPS e conferência de crianças
- Dias 5-6: Criar página frontend de conferência para motoristas
- Dia 7: Implementar sistema de notificações automáticas

### Semana 5: Integração e Testes Finais
- Dias 1-2: Integrar APIs do Google Maps para rastreamento
- Dias 3-4: Implementar cálculos automáticos de combustível e quilometragem
- Dias 5-6: Testes completos do sistema de conferência
- Dia 7: Documentação final e deploy

---

## 📝 OBSERVAÇÕES IMPORTANTES

### Segurança
- Validar sempre a propriedade dos dados (motorista só acessa suas rotas)
- Sanitizar inputs para prevenir XSS e SQL Injection
- Implementar rate limiting nas APIs públicas

### Performance
- Implementar cache para rotas frequentemente acessadas
- Otimizar consultas com índices apropriados
- Lazy loading para listas grandes

### UX/UI
- Feedback visual para todas as ações
- Estados de loading durante requisições
- Mensagens de erro claras e acionáveis
- Design responsivo e acessível

### Escalabilidade
- Estrutura preparada para novos tipos de planos
- APIs versionadas para futuras atualizações
- Logs detalhados para monitoramento

### Rastreamento e Privacidade (ETAPA 6)
- Implementar consentimento explícito para rastreamento GPS
- Criptografar dados de localização em trânsito e em repouso
- Permitir desativação temporária do rastreamento
- Respeitar limites de retenção de dados de localização
- Implementar anonização de dados históricos

### Performance do Sistema de Rastreamento
- Otimizar frequência de envio de dados GPS (balance entre precisão e bateria)
- Implementar cache local para dados offline
- Usar WebSockets para comunicação em tempo real
- Implementar throttling para evitar spam de dados GPS
- Monitorar uso de bateria do dispositivo

### Confiabilidade e Backup
- Implementar fallback para perda de conexão GPS
- Backup automático de dados de viagem
- Recuperação de estado após falhas de rede
- Validação cruzada de dados de localização
- Sistema de alertas para anomalias no rastreamento

---

Este plano fornece uma estrutura completa e detalhada para implementar o sistema de rotas escolares solicitado, com cada etapa bem definida e testável individualmente.