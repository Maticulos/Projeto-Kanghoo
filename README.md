# 🚌 Sistema Kanghoo - Transporte Escolar e Excursões

[![Status](https://img.shields.io/badge/Status-Operacional-green)](https://github.com)
[![Testes](https://img.shields.io/badge/Testes-77%25-yellow)](https://github.com)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13+-blue)](https://postgresql.org)

Sistema completo para gestão de transporte escolar e excursões, desenvolvido com tecnologias modernas e foco em segurança, performance e usabilidade.

## 📋 Índice

- [Visão Geral](#-visão-geral)
- [Tecnologias Utilizadas](#-tecnologias-utilizadas)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Instalação e Configuração](#-instalação-e-configuração)
- [Testes e Qualidade](#-testes-e-qualidade)
- [Funcionalidades](#-funcionalidades)
- [Comandos Úteis](#-comandos-úteis)
- [Monitoramento](#-monitoramento)
- [Segurança](#-segurança)
- [Documentação](#-documentação)
- [Contribuição](#-contribuição)
- [Suporte](#-suporte)
- [Licença](#-licença)
- [Status do Projeto](#-status-do-projeto)

## 🎯 Visão Geral

O Sistema de Transporte Escolar é uma plataforma web que facilita a comunicação e organização entre motoristas de transporte escolar e responsáveis pelas crianças. A aplicação oferece funcionalidades de cadastro, rastreamento em tempo real, e gerenciamento de rotas.

### Principais Benefícios

- **Segurança**: Rastreamento em tempo real das crianças
- **Comunicação**: Canal direto entre motoristas e responsáveis
- **Organização**: Gestão eficiente de rotas e horários
- **Transparência**: Histórico completo de viagens

## ✨ Funcionalidades

### Para Motoristas
- 📝 Cadastro completo com dados pessoais e do veículo
- 🗺️ Criação e gerenciamento de rotas
- 📍 Sistema de rastreamento GPS
- 👥 Gestão de lista de crianças
- 📊 Relatórios de viagens

### Para Responsáveis
- 👶 Cadastro de crianças
- 🔍 Busca por motoristas disponíveis
- 📱 Rastreamento em tempo real
- 💬 Comunicação direta com motoristas
- 📈 Histórico de transportes

### Funcionalidades Gerais
- 🔐 Sistema de autenticação seguro
- 📱 Interface responsiva
- 🌙 Modo escuro/claro
- 🔔 Sistema de notificações
- 📧 Formulário de contato

## 🛠️ Tecnologias Utilizadas

### Frontend
- **HTML5**: Estrutura semântica
- **CSS3**: Estilização moderna com Flexbox/Grid
- **JavaScript (ES6+)**: Funcionalidades interativas
- **Progressive Web App**: Experiência mobile otimizada

### Backend
- **Node.js**: Runtime JavaScript
- **Koa.js**: Framework web minimalista
- **PostgreSQL**: Banco de dados relacional
- **JWT**: Autenticação baseada em tokens
- **bcrypt**: Hash seguro de senhas

### Segurança
- **Rate Limiting**: Proteção contra ataques DDoS
- **CORS**: Configuração de Cross-Origin
- **Headers de Segurança**: Proteção contra XSS, clickjacking
- **Validação de Dados**: Sanitização de entradas
- **HTTPS**: Comunicação criptografada (produção)

## 📁 Estrutura do Projeto

```
teste/
├── frontend/                 # Aplicação frontend
│   ├── public/              # Páginas HTML principais
│   │   ├── index.html       # Página inicial
│   │   ├── planos.html      # Página de planos
│   │   ├── sobre.html       # Página sobre
│   │   ├── encontrar-escolar.html
│   │   ├── encontrar-excursao.html
│   │   ├── cadastro-escolar.html
│   │   └── cadastro-excursao.html
│   ├── auth/                # Páginas de autenticação
│   │   ├── login.html       # Login
│   │   └── dashboard.html   # Dashboard do usuário
│   ├── css/                 # Estilos CSS
│   │   ├── styles.css       # Estilos principais
│   │   ├── responsive.css   # Responsividade
│   │   └── animations.css   # Animações
│   ├── js/                  # Scripts JavaScript
│   │   ├── app.js           # Funcionalidades principais
│   │   ├── formulario-multiplas-etapas.js
│   │   ├── rastreamento-api.js
│   │   ├── mascaras.js      # Máscaras de input
│   │   ├── ui-utils.js      # Utilitários de UI
│   │   └── animacoes-index.js
│   └── images/              # Recursos visuais
├── server/                  # Aplicação backend
│   ├── server.js            # Servidor principal
│   ├── config/              # Configurações
│   │   ├── db.js            # Conexão com banco
│   │   └── security-config.js # Configurações de segurança
│   ├── routes/              # Rotas da API
│   │   ├── cadastro-criancas.js
│   │   ├── motorista-escolar.js
│   │   ├── rastreamento.js
│   │   └── transportes.js
│   ├── middleware/          # Middlewares customizados
│   │   ├── auth-utils.js    # Utilitários de autenticação
│   │   └── upload-security.js
│   ├── scripts/             # Scripts de banco de dados
│   │   ├── criar-tabelas-completas.js
│   │   └── criar-dados-teste.js
│   └── utils/               # Utilitários
│       ├── notification-service.js
│       └── tracking-persistence.js
├── .env                     # Variáveis de ambiente
├── package.json             # Dependências do projeto
└── README.md               # Este arquivo
```

## 🚀 Instalação e Configuração

### Pré-requisitos

- **Node.js** (versão 18 ou superior)
- **PostgreSQL** (versão 12 ou superior)
- **npm** ou **yarn**

### Passo a Passo

1. **Clone o repositório**
   ```bash
   git clone [URL_DO_REPOSITORIO]
   cd teste
   ```

2. **Instale as dependências**
   ```bash
   cd server
   npm install
   ```

3. **Configure o banco de dados**
   ```bash
   # Crie um banco PostgreSQL
   createdb transporte_escolar
   ```

4. **Configure as variáveis de ambiente**
   ```bash
   # Copie o arquivo de exemplo
   cp .env.example .env
   
   # Edite o arquivo .env com suas configurações
   nano .env
   ```

   Exemplo de configuração:
   ```env
   # Configurações de Segurança
   JWT_SECRET=sua-chave-jwt-super-secreta-e-forte-aqui
   NODE_ENV=development
   
   # Rate Limiting
   RATE_LIMIT_WINDOW_MS=60000
   RATE_LIMIT_MAX_REQUESTS=1000
   
   # Configurações do Banco de Dados
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=transporte_escolar
   DB_USER=seu_usuario
   DB_PASSWORD=sua_senha
   ```

5. **Crie as tabelas do banco de dados**
   ```bash
   node scripts/criar-tabelas-completas.js
   ```

6. **Inicie o servidor**
   ```bash
   npm start
   ```

7. **Acesse a aplicação**
   - Frontend: `http://localhost:5000`
   - API: `http://localhost:5000/api`

## 💻 Uso da Aplicação

### Cadastro de Motorista

1. Acesse a página inicial
2. Clique em "Cadastrar como Motorista"
3. Preencha o formulário em múltiplas etapas:
   - **Etapa 1**: Dados pessoais
   - **Etapa 2**: Dados do veículo
   - **Etapa 3**: Informações da empresa (se aplicável)
   - **Etapa 4**: Confirmação

### Cadastro de Responsável

1. Acesse "Encontrar Transporte"
2. Clique em "Cadastrar Criança"
3. Preencha os dados da criança e responsável
4. Aguarde aprovação do motorista

### Sistema de Rastreamento

1. Faça login no dashboard
2. Inicie uma viagem
3. O sistema registra automaticamente:
   - Localização GPS
   - Horários de embarque/desembarque
   - Status da viagem

## 📚 API Documentation

### Autenticação

Todas as rotas protegidas requerem um token JWT no header:
```
Authorization: Bearer <token>
```

### Principais Endpoints

#### Autenticação
- `POST /api/login` - Login de usuário
- `POST /api/logout` - Logout de usuário

#### Cadastros
- `POST /api/cadastro/motorista-escolar` - Cadastro de motorista escolar
- `POST /api/cadastro/motorista-excursao` - Cadastro de motorista de excursão
- `POST /api/cadastro/crianca` - Cadastro de criança

#### Rastreamento
- `GET /api/rastreamento/viagens` - Listar viagens
- `POST /api/rastreamento/viagens/iniciar` - Iniciar viagem
- `PUT /api/rastreamento/viagens/:id/finalizar` - Finalizar viagem
- `POST /api/rastreamento/localizacao` - Atualizar localização

#### Utilitários
- `GET /api/cep/:cep` - Buscar dados do CEP
- `POST /api/contact` - Enviar mensagem de contato

### Exemplo de Uso

```javascript
// Login
const response = await fetch('/api/login', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        email: 'usuario@email.com',
        senha: 'senha123'
    })
});

const data = await response.json();
const token = data.token;

// Usar token em requisições protegidas
const viagensResponse = await fetch('/api/rastreamento/viagens', {
    headers: {
        'Authorization': `Bearer ${token}`
    }
});
```

## 🔒 Segurança

### Medidas Implementadas

1. **Autenticação JWT**
   - Tokens com expiração de 2 horas
   - Algoritmo HS256
   - Refresh token automático

2. **Rate Limiting**
   - 100 requisições por 15 minutos (geral)
   - 50 tentativas de login por minuto
   - Bloqueio automático por IP

3. **Validação de Dados**
   - Sanitização de entradas
   - Validação de tipos e formatos
   - Proteção contra SQL Injection

4. **Headers de Segurança**
   - X-Frame-Options: DENY
   - X-Content-Type-Options: nosniff
   - X-XSS-Protection: 1; mode=block
   - Content-Security-Policy configurado

5. **Hash de Senhas**
   - bcrypt com salt rounds 12
   - Senhas nunca armazenadas em texto plano

### Boas Práticas

- Sempre use HTTPS em produção
- Mantenha as dependências atualizadas
- Configure CORS adequadamente
- Use variáveis de ambiente para secrets
- Implemente logging de segurança

## 🤝 Contribuição

### Como Contribuir

1. **Fork** o projeto
2. Crie uma **branch** para sua feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. **Push** para a branch (`git push origin feature/AmazingFeature`)
5. Abra um **Pull Request**

### Padrões de Código

- Use **ESLint** para JavaScript
- Siga as convenções de **nomenclatura**
- Adicione **comentários** explicativos
- Escreva **testes** para novas funcionalidades
- Mantenha a **documentação** atualizada

### Reportar Bugs

Use as **Issues** do GitHub para reportar bugs, incluindo:
- Descrição detalhada do problema
- Passos para reproduzir
- Comportamento esperado vs atual
- Screenshots (se aplicável)
- Informações do ambiente

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 📞 Suporte

Para suporte técnico ou dúvidas:

- **Email**: suporte@transporteescolar.com
- **Issues**: [GitHub Issues](link-para-issues)
- **Documentação**: [Wiki do Projeto](link-para-wiki)

---

**Desenvolvido com ❤️ pela Equipe de Desenvolvimento**

*Última atualização: Janeiro 2024*
