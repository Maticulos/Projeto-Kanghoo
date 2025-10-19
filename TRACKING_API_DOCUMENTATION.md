# 📍 Documentação das APIs de Rastreamento

## 🎯 Visão Geral

O sistema de rastreamento oferece APIs RESTful completas para gerenciar dados de localização em tempo real, viagens, embarque/desembarque de passageiros e análise de dados. Todas as APIs utilizam autenticação JWT e seguem padrões REST.

## 🔐 Autenticação

Todas as rotas requerem autenticação via JWT Bearer Token:

```http
Authorization: Bearer <seu_jwt_token>
Content-Type: application/json
```

## 📊 Base URL

```
http://localhost:5000/api/tracking
```

---

## 🗺️ APIs de Localização

### 1. Salvar Localização em Tempo Real

**Endpoint:** `POST /location`

**Descrição:** Salva a localização atual do motorista com timestamp automático.

**Parâmetros do Body:**
```json
{
  "motorista_id": 1,           // ID do motorista (obrigatório)
  "latitude": -23.5505,        // Latitude GPS (obrigatório)
  "longitude": -46.6333,       // Longitude GPS (obrigatório)
  "velocidade": 45.5,          // Velocidade em km/h (opcional)
  "direcao": 90,               // Direção em graus (0-360) (opcional)
  "precisao": 10               // Precisão do GPS em metros (opcional)
}
```

**Resposta de Sucesso (200):**
```json
{
  "sucesso": true,
  "mensagem": "Localização salva com sucesso",
  "dados": {
    "id": "loc_123456789",
    "motorista_id": 1,
    "latitude": -23.5505,
    "longitude": -46.6333,
    "velocidade": 45.5,
    "direcao": 90,
    "precisao": 10,
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

**Exemplo de Uso:**
```javascript
const response = await fetch('/api/tracking/location', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    motorista_id: 1,
    latitude: -23.5505,
    longitude: -46.6333,
    velocidade: 45.5,
    direcao: 90,
    precisao: 10
  })
});
```

---

### 2. Obter Localização Atual

**Endpoint:** `GET /location/current/:motorista_id`

**Descrição:** Retorna a localização mais recente de um motorista específico.

**Parâmetros da URL:**
- `motorista_id` (number): ID do motorista

**Resposta de Sucesso (200):**
```json
{
  "sucesso": true,
  "dados": {
    "motorista_id": 1,
    "latitude": -23.5505,
    "longitude": -46.6333,
    "velocidade": 45.5,
    "direcao": 90,
    "precisao": 10,
    "timestamp": "2024-01-15T10:30:00.000Z",
    "tempo_decorrido": "2 minutos atrás"
  }
}
```

**Resposta quando não encontrado (404):**
```json
{
  "sucesso": false,
  "mensagem": "Localização não encontrada para este motorista"
}
```

---

### 3. Histórico de Localizações

**Endpoint:** `GET /location/history/:motorista_id`

**Descrição:** Retorna o histórico de localizações de um motorista com filtros opcionais.

**Parâmetros da URL:**
- `motorista_id` (number): ID do motorista

**Query Parameters (opcionais):**
- `limit` (number): Número máximo de registros (padrão: 50, máximo: 100)
- `offset` (number): Número de registros para pular (padrão: 0)
- `data_inicio` (string): Data de início no formato ISO (ex: 2024-01-15T00:00:00Z)
- `data_fim` (string): Data de fim no formato ISO

**Exemplo de URL:**
```
GET /location/history/1?limit=20&offset=0&data_inicio=2024-01-15T00:00:00Z
```

**Resposta de Sucesso (200):**
```json
{
  "sucesso": true,
  "dados": {
    "motorista_id": 1,
    "total_registros": 150,
    "registros_retornados": 20,
    "localizacoes": [
      {
        "id": "loc_123456789",
        "latitude": -23.5505,
        "longitude": -46.6333,
        "velocidade": 45.5,
        "direcao": 90,
        "precisao": 10,
        "timestamp": "2024-01-15T10:30:00.000Z"
      }
    ]
  }
}
```

---

## 🚌 APIs de Viagem

### 4. Iniciar Viagem

**Endpoint:** `POST /trip/start`

**Descrição:** Inicia uma nova sessão de viagem para rastreamento.

**Parâmetros do Body:**
```json
{
  "motorista_id": 1,           // ID do motorista (obrigatório)
  "rota_id": 1,                // ID da rota (obrigatório)
  "veiculo_id": 1,             // ID do veículo (obrigatório)
  "tipo_viagem": "ida",        // "ida" ou "volta" (opcional)
  "observacoes": "Viagem normal" // Observações (opcional)
}
```

**Resposta de Sucesso (201):**
```json
{
  "sucesso": true,
  "mensagem": "Viagem iniciada com sucesso",
  "dados": {
    "viagem_id": "trip_123456789",
    "motorista_id": 1,
    "rota_id": 1,
    "veiculo_id": 1,
    "tipo_viagem": "ida",
    "status": "em_andamento",
    "inicio": "2024-01-15T07:00:00.000Z",
    "observacoes": "Viagem normal"
  }
}
```

---

### 5. Finalizar Viagem

**Endpoint:** `POST /trip/end`

**Descrição:** Finaliza uma viagem em andamento.

**Parâmetros do Body:**
```json
{
  "viagem_id": "trip_123456789", // ID da viagem (obrigatório)
  "latitude": -23.5700,          // Localização final (opcional)
  "longitude": -46.6500,         // Localização final (opcional)
  "observacoes": "Viagem concluída sem intercorrências" // (opcional)
}
```

**Resposta de Sucesso (200):**
```json
{
  "sucesso": true,
  "mensagem": "Viagem finalizada com sucesso",
  "dados": {
    "viagem_id": "trip_123456789",
    "status": "finalizada",
    "inicio": "2024-01-15T07:00:00.000Z",
    "fim": "2024-01-15T08:30:00.000Z",
    "duracao_minutos": 90,
    "distancia_percorrida_km": 25.5,
    "velocidade_media": 17.0,
    "observacoes": "Viagem concluída sem intercorrências"
  }
}
```

---

### 6. Obter Dados da Viagem

**Endpoint:** `GET /trip/:viagem_id`

**Descrição:** Retorna informações detalhadas de uma viagem específica.

**Parâmetros da URL:**
- `viagem_id` (string): ID da viagem

**Resposta de Sucesso (200):**
```json
{
  "sucesso": true,
  "dados": {
    "viagem_id": "trip_123456789",
    "motorista_id": 1,
    "rota_id": 1,
    "veiculo_id": 1,
    "status": "em_andamento",
    "inicio": "2024-01-15T07:00:00.000Z",
    "fim": null,
    "duracao_minutos": null,
    "criancas_embarcadas": 12,
    "criancas_desembarcadas": 8,
    "pontos_visitados": 5,
    "distancia_percorrida_km": 15.2,
    "velocidade_media": 18.5,
    "observacoes": "Viagem normal"
  }
}
```

---

## 👶 APIs de Embarque/Desembarque

### 7. Registrar Embarque

**Endpoint:** `POST /child/board`

**Descrição:** Registra o embarque de uma criança no veículo.

**Parâmetros do Body:**
```json
{
  "crianca_id": 1,             // ID da criança (obrigatório)
  "viagem_id": "trip_123456789", // ID da viagem (obrigatório)
  "ponto_parada_id": 1,        // ID do ponto de parada (obrigatório)
  "latitude": -23.5505,        // Localização do embarque (opcional)
  "longitude": -46.6333,       // Localização do embarque (opcional)
  "observacoes": "Embarque normal" // Observações (opcional)
}
```

**Resposta de Sucesso (201):**
```json
{
  "sucesso": true,
  "mensagem": "Embarque registrado com sucesso",
  "dados": {
    "id": "board_123456789",
    "crianca_id": 1,
    "viagem_id": "trip_123456789",
    "ponto_parada_id": 1,
    "tipo": "embarque",
    "timestamp": "2024-01-15T07:15:00.000Z",
    "latitude": -23.5505,
    "longitude": -46.6333,
    "observacoes": "Embarque normal"
  }
}
```

---

### 8. Registrar Desembarque

**Endpoint:** `POST /child/unboard`

**Descrição:** Registra o desembarque de uma criança do veículo.

**Parâmetros do Body:**
```json
{
  "crianca_id": 1,             // ID da criança (obrigatório)
  "viagem_id": "trip_123456789", // ID da viagem (obrigatório)
  "ponto_parada_id": 2,        // ID do ponto de parada (obrigatório)
  "latitude": -23.5600,        // Localização do desembarque (opcional)
  "longitude": -46.6400,       // Localização do desembarque (opcional)
  "observacoes": "Desembarque normal" // Observações (opcional)
}
```

**Resposta de Sucesso (201):**
```json
{
  "sucesso": true,
  "mensagem": "Desembarque registrado com sucesso",
  "dados": {
    "id": "unboard_123456789",
    "crianca_id": 1,
    "viagem_id": "trip_123456789",
    "ponto_parada_id": 2,
    "tipo": "desembarque",
    "timestamp": "2024-01-15T08:20:00.000Z",
    "latitude": -23.5600,
    "longitude": -46.6400,
    "observacoes": "Desembarque normal"
  }
}
```

---

## 📈 APIs de Estatísticas e Monitoramento

### 9. Estatísticas do Sistema

**Endpoint:** `GET /stats`

**Descrição:** Retorna estatísticas gerais do sistema de rastreamento.

**Resposta de Sucesso (200):**
```json
{
  "sucesso": true,
  "dados": {
    "cache": {
      "total_localizacoes": 1250,
      "motoristas_ativos": 15,
      "ultima_atualizacao": "2024-01-15T10:30:00.000Z"
    },
    "viagens": {
      "viagens_ativas": 8,
      "viagens_hoje": 25,
      "viagens_mes": 450
    },
    "criancas": {
      "embarcadas_hoje": 180,
      "desembarcadas_hoje": 165,
      "criancas_em_transito": 15
    },
    "performance": {
      "tempo_resposta_medio_ms": 45,
      "uptime_sistema": "99.8%",
      "ultima_limpeza_cache": "2024-01-15T06:00:00.000Z"
    }
  }
}
```

---

### 10. Limpeza de Cache

**Endpoint:** `POST /cleanup`

**Descrição:** Remove dados antigos do cache para otimizar performance.

**Parâmetros do Body (opcionais):**
```json
{
  "idade_maxima_horas": 24,    // Remover dados mais antigos que X horas (padrão: 24)
  "manter_viagens_ativas": true // Manter dados de viagens em andamento (padrão: true)
}
```

**Resposta de Sucesso (200):**
```json
{
  "sucesso": true,
  "mensagem": "Cache limpo com sucesso",
  "dados": {
    "registros_removidos": 450,
    "registros_mantidos": 800,
    "espaco_liberado_mb": 12.5,
    "tempo_execucao_ms": 150
  }
}
```

---

## 🚨 Códigos de Erro

### Códigos HTTP Comuns

| Código | Descrição | Exemplo |
|--------|-----------|---------|
| 200 | Sucesso | Operação realizada com sucesso |
| 201 | Criado | Recurso criado com sucesso |
| 400 | Requisição Inválida | Parâmetros obrigatórios ausentes |
| 401 | Não Autorizado | Token JWT inválido ou expirado |
| 403 | Proibido | Usuário sem permissão para a operação |
| 404 | Não Encontrado | Recurso não existe |
| 422 | Entidade Não Processável | Dados inválidos |
| 500 | Erro Interno | Erro no servidor |

### Estrutura de Resposta de Erro

```json
{
  "sucesso": false,
  "erro": {
    "codigo": "VALIDATION_ERROR",
    "mensagem": "Parâmetros obrigatórios ausentes",
    "detalhes": {
      "campos_ausentes": ["motorista_id", "latitude", "longitude"]
    }
  }
}
```

### Códigos de Erro Específicos

| Código | Descrição |
|--------|-----------|
| `VALIDATION_ERROR` | Erro de validação de dados |
| `AUTHENTICATION_ERROR` | Erro de autenticação |
| `AUTHORIZATION_ERROR` | Erro de autorização |
| `RESOURCE_NOT_FOUND` | Recurso não encontrado |
| `DUPLICATE_RESOURCE` | Recurso duplicado |
| `RATE_LIMIT_EXCEEDED` | Limite de requisições excedido |
| `CACHE_ERROR` | Erro no sistema de cache |
| `DATABASE_ERROR` | Erro no banco de dados |

---

## 🔄 Rate Limiting

As APIs implementam rate limiting para prevenir abuso:

- **Localização:** 60 requisições por minuto por usuário
- **Viagens:** 10 requisições por minuto por usuário
- **Embarque/Desembarque:** 30 requisições por minuto por usuário
- **Estatísticas:** 20 requisições por minuto por usuário

**Headers de Rate Limiting:**
```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1642248000
```

---

## 📱 Exemplos de Integração

### JavaScript/Frontend

```javascript
class TrackingAPI {
  constructor(baseURL, token) {
    this.baseURL = baseURL;
    this.token = token;
  }

  async salvarLocalizacao(dados) {
    const response = await fetch(`${this.baseURL}/location`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dados)
    });
    return response.json();
  }

  async obterLocalizacaoAtual(motoristaId) {
    const response = await fetch(`${this.baseURL}/location/current/${motoristaId}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });
    return response.json();
  }
}

// Uso
const api = new TrackingAPI('http://localhost:5000/api/tracking', 'seu_token');
const resultado = await api.salvarLocalizacao({
  motorista_id: 1,
  latitude: -23.5505,
  longitude: -46.6333
});
```

### Node.js/Backend

```javascript
const axios = require('axios');

class TrackingService {
  constructor(baseURL, token) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async iniciarViagem(dados) {
    try {
      const response = await this.client.post('/trip/start', dados);
      return response.data;
    } catch (error) {
      throw new Error(`Erro ao iniciar viagem: ${error.response?.data?.mensagem || error.message}`);
    }
  }
}
```

### Python

```python
import requests
import json

class TrackingAPI:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
    
    def salvar_localizacao(self, dados):
        response = requests.post(
            f'{self.base_url}/location',
            headers=self.headers,
            json=dados
        )
        return response.json()
    
    def obter_estatisticas(self):
        response = requests.get(
            f'{self.base_url}/stats',
            headers=self.headers
        )
        return response.json()
```

---

## 🛠️ Configuração e Deployment

### Variáveis de Ambiente

```env
# Servidor
PORT=5000
NODE_ENV=production

# JWT
JWT_SECRET=sua_chave_secreta_super_segura

# Banco de Dados
DB_HOST=localhost
DB_PORT=5432
DB_NAME=transporte_escolar
DB_USER=usuario
DB_PASSWORD=senha

# Cache
CACHE_TTL_HOURS=24
CACHE_MAX_SIZE=10000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=60
```

### Monitoramento

Para monitorar a saúde das APIs:

```bash
# Health Check
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/tracking/stats

# Verificar Cache
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/tracking/stats | jq '.dados.cache'
```

---

## 🔧 Troubleshooting

### Problemas Comuns

1. **Token JWT Inválido**
   - Verifique se o token não expirou
   - Confirme se está usando o formato correto: `Bearer <token>`

2. **Erro 404 em Rotas**
   - Verifique se o servidor está rodando
   - Confirme a URL base e endpoints

3. **Performance Lenta**
   - Execute limpeza de cache: `POST /cleanup`
   - Verifique estatísticas: `GET /stats`

4. **Dados Não Salvos**
   - Verifique conexão com banco de dados
   - Confirme se todos os campos obrigatórios estão presentes

### Logs e Debug

Para habilitar logs detalhados:

```env
DEBUG=tracking:*
LOG_LEVEL=debug
```

---

## 📞 Suporte

Para dúvidas ou problemas:

1. Consulte esta documentação
2. Verifique os logs do servidor
3. Teste com as rotas de exemplo fornecidas
4. Entre em contato com a equipe de desenvolvimento

---

**Versão da Documentação:** 1.0.0  
**Última Atualização:** Janeiro 2024  
**Compatibilidade:** Node.js 16+, API REST v1