# Documentação das APIs - Sistema de Transporte Escolar

## Visão Geral

Este documento descreve as APIs implementadas para o sistema de transporte escolar, incluindo funcionalidades para motoristas escolares, responsáveis e rastreamento de viagens.

## Autenticação

Todas as rotas protegidas requerem um token JWT válido no header `Authorization`:
```
Authorization: Bearer SEU_TOKEN_JWT
```

## Estrutura de Resposta

Todas as respostas seguem o padrão:
```json
{
  "sucesso": boolean,
  "mensagem": "string",
  "dados": object // opcional
}
```

---

## APIs do Motorista Escolar

### Base URL: `/api/motorista-escolar`

#### 1. Teste de Conectividade
- **Endpoint:** `GET /test`
- **Autenticação:** Não requerida
- **Descrição:** Verifica se a API está funcionando
- **Resposta:**
```json
{
  "sucesso": true,
  "mensagem": "API do motorista escolar funcionando"
}
```

#### 2. Listar Crianças
- **Endpoint:** `GET /criancas`
- **Autenticação:** Requerida (Motorista Escolar)
- **Descrição:** Lista todas as crianças associadas ao motorista
- **Resposta:**
```json
{
  "sucesso": true,
  "mensagem": "Crianças listadas com sucesso",
  "dados": [
    {
      "id": 1,
      "nome": "João Silva",
      "idade": 8,
      "escola": "Escola Municipal ABC",
      "endereco": "Rua das Flores, 123",
      "telefone_responsavel": "(11) 99999-9999"
    }
  ]
}
```

#### 3. Adicionar Criança
- **Endpoint:** `POST /criancas`
- **Autenticação:** Requerida (Motorista Escolar)
- **Descrição:** Adiciona uma nova criança à lista do motorista
- **Body:**
```json
{
  "nome": "string (obrigatório)",
  "idade": "number (obrigatório)",
  "escola": "string (obrigatório)",
  "endereco": "string (obrigatório)",
  "telefone_responsavel": "string (obrigatório)"
}
```

#### 4. Listar Rotas
- **Endpoint:** `GET /rotas`
- **Autenticação:** Requerida (Motorista Escolar)
- **Descrição:** Lista todas as rotas do motorista
- **Resposta:**
```json
{
  "sucesso": true,
  "mensagem": "Rotas listadas com sucesso",
  "dados": [
    {
      "id": 1,
      "nome": "Rota Manhã - Zona Norte",
      "descricao": "Rota matinal para escolas da zona norte",
      "pontos_parada": [...]
    }
  ]
}
```

#### 5. Criar Rota
- **Endpoint:** `POST /rotas`
- **Autenticação:** Requerida (Motorista Escolar)
- **Descrição:** Cria uma nova rota
- **Body:**
```json
{
  "nome": "string (obrigatório)",
  "descricao": "string (opcional)",
  "pontos_parada": [
    {
      "endereco": "string",
      "latitude": "number",
      "longitude": "number",
      "horario": "string (HH:MM)"
    }
  ]
}
```

---

## APIs do Responsável

### Base URL: `/api/responsavel`

#### 1. Listar Crianças
- **Endpoint:** `GET /criancas`
- **Autenticação:** Requerida (Responsável)
- **Descrição:** Lista todas as crianças do responsável
- **Resposta:**
```json
{
  "sucesso": true,
  "mensagem": "Crianças listadas com sucesso",
  "dados": [
    {
      "id": 1,
      "nome": "João Silva",
      "idade": 8,
      "escola": "Escola Municipal ABC",
      "motorista": "Carlos Santos",
      "status": "ativo"
    }
  ]
}
```

#### 2. Ver Detalhes da Criança
- **Endpoint:** `GET /criancas/:id`
- **Autenticação:** Requerida (Responsável)
- **Descrição:** Obtém detalhes específicos de uma criança
- **Parâmetros:** `id` - ID da criança

#### 3. Atualizar Informações da Criança
- **Endpoint:** `PUT /criancas/:id`
- **Autenticação:** Requerida (Responsável)
- **Descrição:** Atualiza informações da criança
- **Body:**
```json
{
  "telefone_emergencia": "string (opcional)",
  "observacoes": "string (opcional)",
  "endereco": "string (opcional)"
}
```

#### 4. Obter Localização Atual
- **Endpoint:** `GET /criancas/:id/localizacao`
- **Autenticação:** Requerida (Responsável)
- **Descrição:** Obtém a localização atual da criança
- **Resposta:**
```json
{
  "sucesso": true,
  "mensagem": "Localização obtida com sucesso",
  "dados": {
    "latitude": -23.5505,
    "longitude": -46.6333,
    "timestamp": "2024-01-15T10:30:00Z",
    "status_viagem": "em_transito"
  }
}
```

---

## APIs de Rastreamento

### Base URL: `/api/rastreamento`

#### 1. Iniciar Viagem
- **Endpoint:** `POST /viagens`
- **Autenticação:** Requerida (Motorista)
- **Descrição:** Inicia uma nova viagem
- **Body:**
```json
{
  "rota_id": "number (obrigatório)",
  "veiculo_id": "number (obrigatório)",
  "tipo": "string (ida/volta)"
}
```

#### 2. Finalizar Viagem
- **Endpoint:** `PUT /viagens/:id/finalizar`
- **Autenticação:** Requerida (Motorista)
- **Descrição:** Finaliza uma viagem em andamento
- **Parâmetros:** `id` - ID da viagem

#### 3. Atualizar Localização
- **Endpoint:** `POST /localizacao`
- **Autenticação:** Requerida (Motorista)
- **Descrição:** Envia atualização de localização durante a viagem
- **Body:**
```json
{
  "viagem_id": "number (obrigatório)",
  "latitude": "number (obrigatório)",
  "longitude": "number (obrigatório)",
  "velocidade": "number (opcional)",
  "direcao": "number (opcional)"
}
```

#### 4. Listar Viagens Ativas
- **Endpoint:** `GET /viagens/ativas`
- **Autenticação:** Requerida
- **Descrição:** Lista todas as viagens atualmente ativas
- **Resposta:**
```json
{
  "sucesso": true,
  "mensagem": "Viagens ativas listadas com sucesso",
  "dados": [
    {
      "id": 1,
      "rota_nome": "Rota Manhã - Zona Norte",
      "motorista": "Carlos Santos",
      "inicio": "2024-01-15T07:00:00Z",
      "status": "em_andamento"
    }
  ]
}
```

#### 5. Histórico de Viagens
- **Endpoint:** `GET /viagens/historico`
- **Autenticação:** Requerida
- **Descrição:** Obtém histórico de viagens
- **Query Parameters:**
  - `data_inicio` - Data de início (YYYY-MM-DD)
  - `data_fim` - Data de fim (YYYY-MM-DD)
  - `motorista_id` - ID do motorista (opcional)

#### 6. Detalhes da Viagem
- **Endpoint:** `GET /viagens/:id`
- **Autenticação:** Requerida
- **Descrição:** Obtém detalhes completos de uma viagem específica
- **Parâmetros:** `id` - ID da viagem

---

## Códigos de Status HTTP

- **200** - Sucesso
- **201** - Criado com sucesso
- **400** - Dados inválidos
- **401** - Não autorizado (token inválido/ausente)
- **403** - Acesso negado (permissões insuficientes)
- **404** - Recurso não encontrado
- **500** - Erro interno do servidor

---

## Middleware de Segurança

Todas as rotas incluem:
- **Rate Limiting** - Limite de requisições por IP
- **Validação de Input** - Sanitização de dados de entrada
- **Headers de Segurança** - Proteção contra ataques comuns
- **Logging** - Registro de todas as operações

---

## Exemplos de Uso

### Testando com cURL

```bash
# Teste básico
curl http://localhost:5000/api/motorista-escolar/test

# Com autenticação
curl -H "Authorization: Bearer SEU_TOKEN" \
     http://localhost:5000/api/motorista-escolar/criancas

# POST com dados
curl -X POST \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -d '{"nome":"João","idade":8,"escola":"ABC","endereco":"Rua 1","telefone_responsavel":"11999999999"}' \
     http://localhost:5000/api/motorista-escolar/criancas
```

### Testando com arquivo .http

Use o arquivo `test-routes.http` incluído no projeto para testar todas as rotas usando extensões como REST Client no VS Code.

---

## Notas Importantes

1. **Autenticação JWT**: Todos os tokens devem ser válidos e não expirados
2. **Autorização**: Usuários só podem acessar recursos aos quais têm permissão
3. **Validação**: Todos os dados de entrada são validados e sanitizados
4. **Logging**: Todas as operações são registradas para auditoria
5. **Rate Limiting**: Existe limite de requisições para prevenir abuso

---

## Suporte

Para dúvidas ou problemas com as APIs, consulte os logs do servidor ou entre em contato com a equipe de desenvolvimento.