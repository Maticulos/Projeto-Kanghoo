# Documentação de Segurança

## Visão Geral

Este documento descreve as medidas de segurança implementadas na aplicação para proteger contra vulnerabilidades comuns e ataques maliciosos.

## Vulnerabilidades Corrigidas

### 1. XSS (Cross-Site Scripting)
- **Problema**: Uso de `innerHTML` sem sanitização
- **Solução**: Substituição por `textContent` e `appendChild`
- **Arquivos afetados**: 
  - `frontend/public/js/app.js`
  - `frontend/public/js/formulario-multiplas-etapas.js`

### 2. Autenticação Insegura
- **Problema**: JWT_SECRET hardcoded
- **Solução**: Movido para variáveis de ambiente
- **Configuração**: Arquivo `.env` com fallback seguro

### 3. Falta de Rate Limiting
- **Problema**: Ausência de proteção contra ataques de força bruta
- **Solução**: Implementação de rate limiting diferenciado
  - Login: 5 tentativas por 15 minutos
  - Geral: 100 requisições por 15 minutos (configurável)

### 4. Headers de Segurança Insuficientes
- **Problema**: Falta de headers de proteção
- **Solução**: Implementação completa de headers de segurança

### 5. Validação de Entrada Inadequada
- **Problema**: Validação básica e inconsistente
- **Solução**: Sistema centralizado de validação e sanitização

## Configurações de Segurança

### Headers de Segurança Implementados

```javascript
{
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Content-Security-Policy': 'default-src \'self\'; script-src \'self\' \'unsafe-inline\'; style-src \'self\' \'unsafe-inline\' https://fonts.googleapis.com; font-src \'self\' https://fonts.gstatic.com; img-src \'self\' data: https:; connect-src \'self\'; frame-ancestors \'none\';',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
}
```

### Rate Limiting

- **Login**: 5 tentativas por 15 minutos por IP
- **Geral**: 100 requisições por 15 minutos por IP (configurável via ENV)
- **Implementação**: Middleware customizado com limpeza automática

### Validação de Entrada

#### Campos Validados:
- **Email**: Formato RFC válido, máximo 254 caracteres
- **Senha**: Mínimo 8 caracteres, letras e números, máximo 128 caracteres
- **Nome**: Mínimo 2 caracteres, máximo 100 caracteres
- **Telefone**: Formato brasileiro (XX) XXXXX-XXXX
- **CPF**: 11 dígitos, algoritmo de validação
- **CNPJ**: 14 dígitos, algoritmo de validação
- **Idade**: Entre 16 e 120 anos
- **Lotação**: Entre 1 e 100 pessoas

#### Sanitização:
- Remoção de caracteres perigosos (`<`, `>`)
- Limitação de tamanho de entrada
- Normalização de dados (lowercase para email, uppercase para placa)

### Criptografia

- **Senhas**: bcrypt com salt rounds 12
- **JWT**: Expiração de 2 horas
- **Algoritmo**: HS256

## Variáveis de Ambiente

```env
# Segurança JWT
JWT_SECRET=sua-chave-secreta-muito-forte-aqui
NODE_ENV=production

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Banco de Dados
DB_HOST=localhost
DB_PORT=5432
DB_NAME=seu_banco
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
```

## Logs de Segurança

### Eventos Registrados:
- Tentativas de login (sucesso/falha)
- Registros de novos usuários
- Violações de rate limiting
- Dados sensíveis são automaticamente sanitizados nos logs

### Formato dos Logs:
```json
{
  "action": "login_success",
  "email": "user@***",
  "ip": "192.168.1.1",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Proteções Implementadas

### 1. SQL Injection
- Uso de queries parametrizadas
- Validação rigorosa de entrada
- Sanitização de dados

### 2. CSRF
- Headers de segurança apropriados
- Validação de origem

### 3. Clickjacking
- Header `X-Frame-Options: DENY`
- CSP com `frame-ancestors 'none'`

### 4. MIME Sniffing
- Header `X-Content-Type-Options: nosniff`

### 5. Information Disclosure
- Remoção do header `X-Powered-By`
- Logs sanitizados
- Mensagens de erro genéricas

## Recomendações Adicionais

### Para Produção:
1. **HTTPS**: Sempre usar HTTPS em produção
2. **Firewall**: Configurar firewall adequadamente
3. **Monitoramento**: Implementar monitoramento de logs
4. **Backup**: Manter backups seguros e criptografados
5. **Atualizações**: Manter dependências atualizadas

### Para Desenvolvimento:
1. **Secrets**: Nunca commitar secrets no código
2. **Environment**: Usar diferentes configurações por ambiente
3. **Testing**: Testar regularmente as medidas de segurança

## Arquivos de Configuração

- `server/security-config.js`: Configurações centralizadas
- `.env`: Variáveis de ambiente
- `server/server.js`: Implementação das medidas

## Contato

Para questões de segurança, entre em contato com a equipe de desenvolvimento.