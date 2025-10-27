# 🗄️ Configuração do Banco de Dados

## Scripts de Configuração Inicial

### 1. Criação de Tabelas Completas
```bash
node scripts/criar-tabelas-completas.js
```
- Cria todas as tabelas necessárias do sistema
- Adiciona colunas faltantes em tabelas existentes
- Verifica integridade da estrutura

### 2. Melhoramento do Sistema de Rastreamento
```bash
node scripts/melhorar-rastreamento.js
```
- Cria tabelas otimizadas para rastreamento GPS
- Configura relacionamentos entre viagens e localizações
- Adiciona índices para performance

## Ordem Recomendada de Execução

1. **Primeiro acesso:**
   ```bash
   node scripts/criar-tabelas-completas.js
   node scripts/melhorar-rastreamento.js
   ```

2. **Verificação e testes:**
   ```bash
   node debug-tools.js
   # Selecione opção 1: Verificar conexão com banco
   # Selecione opção 2: Listar e analisar tabelas
   ```

3. **Criação de dados de teste:**
   ```bash
   node debug-tools.js
   # Selecione opção 5: Criar dados de teste
   ```

## Estrutura Final das Tabelas

Após executar os scripts, você terá:
- `usuarios` - Motoristas e responsáveis
- `rotas` - Rotas de transporte
- `criancas` - Dados das crianças
- `viagens` - Sessões de rastreamento
- `localizacoes` - Pontos GPS detalhados
- `criancas_viagem` - Associação crianças/viagens
- `checkins` - Check-ins de embarque/desembarque

## Troubleshooting

Se encontrar erros:
1. Verifique as variáveis de ambiente no `.env`
2. Execute `node debug-tools.js` para diagnóstico
3. Consulte os logs detalhados nos scripts