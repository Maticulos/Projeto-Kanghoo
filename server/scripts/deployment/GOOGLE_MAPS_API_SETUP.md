# Configuração do Google Maps API para Produção

## 1. Criar Projeto no Google Cloud Console

### Passo 1: Acessar o Google Cloud Console
1. Acesse: https://console.cloud.google.com/
2. Faça login com sua conta Google
3. Clique em "Criar Projeto" ou selecione um projeto existente

### Passo 2: Criar Novo Projeto
1. Nome do projeto: `Transporte Escolar - Produção`
2. ID do projeto: `transporte-escolar-prod-[RANDOM]`
3. Clique em "Criar"

## 2. Ativar APIs Necessárias

### APIs Obrigatórias:
1. **Maps JavaScript API** - Para exibir mapas
2. **Geocoding API** - Para converter endereços em coordenadas
3. **Directions API** - Para calcular rotas
4. **Places API** - Para busca de locais
5. **Distance Matrix API** - Para calcular distâncias

### Como Ativar:
1. No menu lateral, vá em "APIs e Serviços" > "Biblioteca"
2. Pesquise por cada API listada acima
3. Clique na API e depois em "Ativar"

## 3. Criar Chave de API

### Passo 1: Gerar Chave
1. Vá em "APIs e Serviços" > "Credenciais"
2. Clique em "+ CRIAR CREDENCIAIS"
3. Selecione "Chave de API"
4. Copie a chave gerada

### Passo 2: Configurar Restrições (IMPORTANTE!)

#### Restrições de Aplicativo:
- **Tipo**: Referenciadores HTTP (sites)
- **Referenciadores de site**: 
  - `https://seudominio.com/*`
  - `https://www.seudominio.com/*`
  - `http://localhost:3000/*` (apenas para testes)

#### Restrições de API:
Selecione apenas as APIs que você ativou:
- Maps JavaScript API
- Geocoding API
- Directions API
- Places API
- Distance Matrix API

## 4. Configurar Cobrança

### Importante:
- O Google Maps API não é gratuito para uso em produção
- Configure um método de pagamento válido
- Defina alertas de cobrança para controlar custos

### Limites Recomendados:
- **Maps JavaScript API**: 28,000 carregamentos/mês (gratuito)
- **Geocoding API**: 40,000 solicitações/mês ($5/1000 após limite)
- **Directions API**: 40,000 solicitações/mês ($5/1000 após limite)

## 5. Configurar no Sistema

### Atualizar arquivo .env:
```bash
GOOGLE_MAPS_API_KEY=SUA_CHAVE_AQUI
GOOGLE_MAPS_REGION=BR
GOOGLE_MAPS_LANGUAGE=pt-BR
```

### Testar Configuração:
```bash
# No diretório do servidor
node -e "
const config = require('./config/google-maps-config.js');
console.log('Configuração Google Maps:', config);
"
```

## 6. Monitoramento e Segurança

### Monitorar Uso:
1. Acesse "APIs e Serviços" > "Painel"
2. Monitore o uso diário/mensal de cada API
3. Configure alertas de cota

### Segurança:
- ✅ Sempre use restrições de referenciador
- ✅ Limite as APIs habilitadas
- ✅ Monitore logs de acesso
- ✅ Rotacione chaves periodicamente
- ❌ Nunca exponha a chave no código frontend
- ❌ Nunca commite chaves no repositório

## 7. Backup da Configuração

### Salvar Informações:
- ID do Projeto: `_________________`
- Chave de API: `_________________`
- Data de Criação: `_________________`
- Restrições Configuradas: ✅

### Documentar:
- Mantenha registro das configurações
- Documente qualquer mudança
- Tenha um plano de recuperação

## 8. Troubleshooting

### Erros Comuns:

#### "API key not valid"
- Verifique se a chave está correta no .env
- Confirme se as restrições de referenciador estão corretas

#### "This API project is not authorized"
- Verifique se todas as APIs necessárias estão ativadas
- Confirme se a cobrança está configurada

#### "Quota exceeded"
- Monitore o uso no console
- Considere aumentar os limites se necessário

### Logs de Debug:
```bash
# Verificar configuração
curl "https://maps.googleapis.com/maps/api/geocode/json?address=São+Paulo&key=SUA_CHAVE"
```

## 9. Custos Estimados (Mensal)

### Uso Típico para Sistema de Transporte Escolar:
- **100 rotas ativas**: ~$50-100/mês
- **500 rotas ativas**: ~$200-400/mês
- **1000+ rotas ativas**: ~$500+/mês

### Otimização de Custos:
- Cache resultados de geocoding
- Limite atualizações de rota
- Use batch requests quando possível
- Implemente rate limiting

---

**⚠️ IMPORTANTE**: Mantenha sua chave de API segura e monitore o uso regularmente para evitar custos inesperados!