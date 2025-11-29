# 🎯 Guia do Ambiente de Simulação de Produção

## Visão Geral

Este sistema foi configurado para funcionar como um **ambiente de produção simulado**, permitindo demonstrações realistas do sistema de transporte escolar VanSegura.

## 📋 Credenciais de Acesso

Todos os usuários utilizam a senha padrão: **`teste123`**

### 🚐 Motoristas

| Email | Nome | Plano | Descrição |
|-------|------|-------|-----------|
| `basic@motorista.com` | Carlos Silva Santos | Basic | Motorista escolar com plano básico (3 rotas, 15 alunos) |
| `premium@motorista.com` | Maria Oliveira Costa | Premium | Motorista escolar com plano premium (10 rotas, 50 alunos) |
| `excursao@motorista.com` | Roberto Almeida Junior | Premium | Motorista de excursão |

### 👨‍👩‍👧 Responsáveis

| Email | Nome | Criança | Idade |
|-------|------|---------|-------|
| `pai1@email.com` | Ana Paula Ferreira | Sofia Ferreira Costa | 8 anos |
| `pai2@email.com` | João Carlos Mendes | Pedro Mendes Silva | 9 anos |
| `pai3@email.com` | Fernanda Santos Lima | Lucas Santos Lima | 7 anos |

## 🗺️ Rotas Configuradas

### Rota 1: Vila Madalena - Escola Monteiro Lobato
- **Motorista:** Carlos (Basic)
- **Turno:** Manhã (06:30 - 12:30)
- **Crianças:** Sofia e Lucas
- **Status:** Ativa

### Rota 2: Jardins - Colégio São Francisco
- **Motorista:** Maria (Premium)
- **Turno:** Tarde (12:00 - 18:00)
- **Crianças:** Pedro
- **Status:** Ativa

## 🚀 Como Executar o Seed

### Opção 1: Via SQL Direto
```bash
cd teste
psql -U postgres -d kanghoo_db_prod -f database/seed_test_users.sql
```

### Opção 2: Via Docker
```bash
cd teste
docker-compose exec postgres psql -U postgres -d kanghoo_db_prod -f /docker-entrypoint-initdb.d/seed_test_users.sql
```

### Opção 3: Via Script Node.js
```bash
cd teste/server
node scripts/atualizar-senhas-teste.js
```

## 🎮 Funcionalidades de Simulação

### Painel do Motorista

1. **Acesse:** `http://localhost:3000/auth/login.html`
2. **Login:** Use `basic@motorista.com` / `teste123`
3. **Dashboard:** Você verá o painel completo do motorista

### Simulação em Tempo Real

O dashboard do motorista agora inclui:

#### 📍 Mapa de Rastreamento
- Visualização em tempo real da posição do veículo
- Marcadores das casas das crianças
- Marcador da escola (destino)
- Linha da rota traçada

#### 🎛️ Controles da Simulação
1. **Selecionar Rota:** Escolha uma das rotas ativas
2. **Iniciar Rota:** Clique no botão verde "Iniciar Rota"
3. **Acompanhar:** Veja o veículo se movendo no mapa
4. **Notificações:** Receba alertas quando crianças embarcarem
5. **Parar Rota:** Clique no botão vermelho para encerrar

#### 🔔 Notificações Automáticas
- Embarque de crianças
- Proximidade de pontos de parada
- Conclusão da rota

#### 👶 Lista de Passageiros
- Status em tempo real de cada criança
- Atualização automática quando embarcam
- Informações de endereço

## 🎨 Visual Moderno

O dashboard foi atualizado com:
- Design limpo e profissional
- Cores consistentes com a identidade visual
- Animações suaves
- Responsivo para mobile e desktop
- Notificações toast elegantes

## 📊 Dados Realistas

### Crianças Cadastradas
- **Sofia Ferreira Costa** (8 anos)
  - Endereço: Rua dos Jardins, 456 - Jardins, SP
  - Escola: Escola Municipal Monteiro Lobato
  - Responsável: Ana Paula Ferreira

- **Pedro Mendes Silva** (9 anos)
  - Endereço: Rua das Palmeiras, 789 - Moema, SP
  - Escola: Colégio São Francisco
  - Responsável: João Carlos Mendes

- **Lucas Santos Lima** (7 anos)
  - Endereço: Av. Faria Lima, 321 - Itaim Bibi, SP
  - Escola: Escola Municipal Monteiro Lobato
  - Responsável: Fernanda Santos Lima

### Associações Criança-Rota
- Todas as crianças estão corretamente associadas às rotas
- Coordenadas GPS configuradas
- Horários de embarque/desembarque definidos

## 🔧 Estrutura Técnica

### Arquivos Modificados

1. **Frontend:**
   - `frontend/public/auth/area-motorista-escolar.html` - Dashboard com mapa
   - `frontend/public/assets/js/auth/motorista-escolar.js` - Lógica de simulação

2. **Backend:**
   - `database/seed_test_users.sql` - Dados de teste atualizados

3. **Documentação:**
   - `GUIA_SIMULACAO_PRODUCAO.md` - Este arquivo

### Tecnologias Utilizadas

- **Tailwind CSS:** Para componentes modernos
- **Font Awesome:** Ícones
- **JavaScript Vanilla:** Simulação em tempo real
- **PostgreSQL:** Banco de dados

## 🎯 Casos de Uso

### Demonstração para Clientes
1. Faça login como motorista
2. Selecione uma rota
3. Inicie a simulação
4. Mostre o rastreamento em tempo real
5. Destaque as notificações automáticas

### Testes de Funcionalidade
1. Verifique se todas as rotas carregam
2. Teste a simulação de movimento
3. Valide as notificações
4. Confirme atualização de status

### Treinamento de Equipe
1. Use para treinar novos motoristas
2. Demonstre o fluxo completo
3. Explique cada funcionalidade

## 🐛 Troubleshooting

### Rotas não aparecem
```bash
# Verificar se o seed foi executado
psql -U postgres -d kanghoo_db_prod -c "SELECT COUNT(*) FROM rotas_escolares;"
```

### Crianças não aparecem
```bash
# Verificar associações
psql -U postgres -d kanghoo_db_prod -c "SELECT COUNT(*) FROM criancas_rotas;"
```

### Simulação não inicia
- Verifique o console do navegador (F12)
- Confirme que uma rota foi selecionada
- Recarregue a página

## 📝 Próximos Passos

- [ ] Adicionar mais rotas de exemplo
- [ ] Implementar simulação para responsáveis
- [ ] Adicionar histórico de viagens
- [ ] Criar relatórios automáticos
- [ ] Integrar com Google Maps real

## 💡 Dicas

- Use o Chrome/Edge para melhor experiência
- Abra o DevTools (F12) para ver logs detalhados
- Teste em diferentes resoluções
- Experimente com múltiplas abas (motorista + responsável)

---

**Desenvolvido para VanSegura** 🚐
*Ambiente de simulação de produção v1.0*
