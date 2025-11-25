# 🚀 Guia Rápido - Docker

## Iniciar o Projeto

### Opção 1: Script Automático (Recomendado)
```cmd
cd Projeto-Kanghoo
start-docker.cmd
```

### Opção 2: Docker Compose
```cmd
cd Projeto-Kanghoo
docker compose up
```

### Opção 3: Comandos Manuais

**1. Criar rede:**
```cmd
docker network create kanghoo-network
```

**2. Iniciar PostgreSQL:**
```cmd
docker run -d --name kanghoo-postgres --network kanghoo-network -e POSTGRES_DB=kanghoo_db_prod -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:15-alpine
```

**3. Aguardar 10-15 segundos**

**4. Iniciar aplicação:**
```cmd
docker run -it --rm --name kanghoo-app --network kanghoo-network -v "%CD%:/app" -w /app/server -p 5000:5000 -p 8080:8080 -e DB_HOST=kanghoo-postgres node:24-alpine sh -c "npm install && npm start"
```

## Acessar

- **Frontend:** http://localhost:5000
- **API:** http://localhost:5000/api
- **WebSocket:** ws://localhost:8080

## Parar

Pressione `Ctrl+C` no terminal

Para limpar tudo:
```cmd
docker stop kanghoo-postgres kanghoo-app
docker rm kanghoo-postgres kanghoo-app
docker network rm kanghoo-network
```

## Problemas Comuns

### Porta 5000 já em uso
```cmd
netstat -ano | findstr :5000
taskkill /PID <numero_do_pid> /F
```

### Arquivos não carregam
Verifique se está na pasta correta:
```cmd
cd "C:\Users\mathe\OneDrive\Área de Trabalho\Nova pasta (2)\Projeto-Kanghoo"
```
