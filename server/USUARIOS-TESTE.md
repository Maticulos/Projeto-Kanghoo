# 👥 Gerenciamento de Usuários de Teste

Este documento descreve como usar o sistema centralizado de criação e gerenciamento de usuários de teste.

## 📁 Arquivo Principal

**`test-users-manager.js`** - Sistema centralizado que substitui os arquivos anteriores:
- ~~`create-test-user.js`~~ (removido)
- ~~`create-all-test-users.js`~~ (removido)
- ~~`scripts/development/setup/create-test-users.js`~~ (removido)

## 🚀 Como Usar

### Comandos Disponíveis

```bash
# Criar usuários básicos (padrão - recomendado para desenvolvimento)
node test-users-manager.js
# ou
node test-users-manager.js basic

# Criar apenas um usuário de teste simples
node test-users-manager.js single

# Criar usuários completos com veículos e empresas
node test-users-manager.js complete

# Listar usuários de teste existentes
node test-users-manager.js list

# Remover todos os usuários de teste
node test-users-manager.js clean

# Mostrar ajuda
node test-users-manager.js help
```

## 👤 Usuários Criados

### Modo Básico (`basic`)
Cria 5 usuários para teste geral:

| Tipo | Email | Senha | Descrição |
|------|-------|-------|-----------|
| Responsável | `teste@login.com` | `teste123` | Usuário original de teste |
| Responsável | `responsavel@teste.com` | `teste123` | Responsável por crianças |
| Motorista Escolar | `motorista.escolar@teste.com` | `teste123` | Transporte escolar |
| Motorista Excursão | `motorista.excursao@teste.com` | `teste123` | Turismo e excursões |
| Motorista Escolar e Excursão Basic | `motorista.basic@teste.com` | `teste123` | Transporte escolar e excursões Basic |
| Motorista Escolar e Excursão Premium | `motorista.premium@teste.com` | `teste123` | Transporte escolar e excursões Premium |
| Admin | `admin@teste.com` | `admin123` | Administrador do sistema |

### Modo Completo (`complete`)
Cria 3 usuários com dados completos, veículos e empresas:

| Tipo | Email | Senha | Extras |
|------|-------|-------|--------|
| Responsável | `responsavel.teste@email.com` | `teste123` | Dados pessoais completos |
| Motorista Escolar | `motorista.escolar.teste@email.com` | `teste123` | + Veículo (ABC-1234) |
| Motorista Excursão | `motorista.excursao.teste@email.com` | `teste123` | + Veículo (XYZ-5678) + Empresa |

### Modo Único (`single`)
Cria apenas o usuário básico: `teste@login.com` / `teste123`

## 🔧 Uso Programático

```javascript
const { TestUsersManager } = require('./test-users-manager');

const manager = new TestUsersManager();

// Criar usuários básicos
await manager.createAllBasicTestUsers();

// Criar usuário único
await manager.createSingleTestUser();

// Criar usuários completos
await manager.createCompleteTestUsers();

// Listar usuários
await manager.listTestUsers();

// Limpar usuários
await manager.cleanTestUsers();

// Fechar conexão
await manager.close();
```

## 🔒 Segurança

- Todas as senhas são criptografadas com bcrypt (salt rounds: 10)
- Usuários existentes têm suas senhas atualizadas automaticamente
- Transações são usadas para operações complexas
- Conexão com banco é fechada automaticamente

## 🎯 Casos de Uso

### Desenvolvimento Local
```bash
node test-users-manager.js basic
```

### Testes de Integração
```bash
node test-users-manager.js complete
```

### Reset do Ambiente
```bash
node test-users-manager.js clean
node test-users-manager.js basic
```

### Verificação Rápida
```bash
node test-users-manager.js list
```

## ⚠️ Importante

- **Não use em produção** - Apenas para desenvolvimento e testes
- **Backup recomendado** - Faça backup antes de usar `clean`
- **Verificação automática** - O sistema verifica credenciais após criação
- **Conexão automática** - Usa `DATABASE_URL` ou configuração padrão

## 🔄 Migração dos Arquivos Antigos

Se você tinha scripts que usavam os arquivos antigos, substitua:

```javascript
// ❌ Antigo
require('./create-test-user');
require('./create-all-test-users');
require('./scripts/development/setup/create-test-users');

// ✅ Novo
const { createSingleTestUser, createAllBasicTestUsers, createCompleteTestUsers } = require('./test-users-manager');
```

## 📞 Suporte

Para problemas ou dúvidas sobre o gerenciamento de usuários de teste, verifique:

1. Conexão com banco de dados
2. Variáveis de ambiente (`DATABASE_URL`)
3. Permissões de escrita no banco
4. Logs de erro no console

---

*Arquivo criado automaticamente durante a centralização dos scripts de usuários de teste.*