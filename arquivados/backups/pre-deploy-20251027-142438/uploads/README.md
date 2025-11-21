# 📁 Estrutura de Uploads Otimizada

Esta pasta contém todos os arquivos enviados pelos usuários, organizados por categoria e tipo para facilitar manutenção e backup.

## 📂 Estrutura de Pastas

### 🧑‍💼 `/users/` - Arquivos de Usuários
- **`/users/profiles/`** - Fotos de perfil dos usuários
- **`/users/documents/`** - Documentos pessoais (RG, CPF, CNH)
- **`/users/certificates/`** - Certificados e comprovantes

### 🚌 `/vehicles/` - Arquivos de Veículos
- **`/vehicles/photos/`** - Fotos dos veículos
- **`/vehicles/documents/`** - Documentos dos veículos (CRLV, seguro)
- **`/vehicles/inspections/`** - Laudos de vistoria e inspeção

### 👶 `/children/` - Arquivos de Crianças
- **`/children/photos/`** - Fotos das crianças
- **`/children/documents/`** - Documentos das crianças
- **`/children/medical/`** - Atestados médicos e receitas

### 🎫 `/events/` - Arquivos de Eventos
- **`/events/banners/`** - Banners e imagens promocionais
- **`/events/documents/`** - Contratos e documentos do evento
- **`/events/photos/`** - Fotos do evento

### 🗂️ `/system/` - Arquivos do Sistema
- **`/system/backups/`** - Backups de arquivos
- **`/system/logs/`** - Logs de upload em formato de arquivo
- **`/system/temp/`** - Arquivos temporários (limpeza automática)

### 📊 `/reports/` - Relatórios Gerados
- **`/reports/pdf/`** - Relatórios em PDF
- **`/reports/excel/`** - Planilhas exportadas
- **`/reports/images/`** - Gráficos e imagens de relatórios

## 🔧 Configurações

### Tipos de Arquivo Permitidos
- **Imagens**: jpg, jpeg, png, gif, webp, svg
- **Documentos**: pdf, doc, docx, txt
- **Planilhas**: xls, xlsx, csv
- **Comprimidos**: zip, rar (apenas para backups)

### Limites de Tamanho
- **Fotos de perfil**: 2MB máximo
- **Documentos**: 10MB máximo
- **Fotos de veículos**: 5MB máximo
- **Banners de eventos**: 8MB máximo

### Política de Retenção
- **Arquivos temporários**: 24 horas
- **Logs de upload**: 30 dias
- **Backups**: 90 dias
- **Documentos de usuários**: Permanente (até exclusão da conta)

## 🛡️ Segurança

### Validações Implementadas
- Verificação de tipo MIME
- Scan de vírus (em produção)
- Validação de extensão
- Limite de tamanho por categoria
- Sanitização de nomes de arquivo

### Controle de Acesso
- Arquivos privados por usuário
- URLs assinadas para acesso temporário
- Logs de acesso para auditoria

## 🔄 Manutenção

### Limpeza Automática
- Arquivos temporários: Diária às 02:00
- Logs antigos: Semanal aos domingos
- Backups expirados: Mensal no dia 1

### Monitoramento
- Espaço em disco utilizado
- Número de arquivos por categoria
- Arquivos órfãos (sem referência no BD)

## 📝 Uso nos Controllers

```javascript
const { uploadConfig } = require('../config/upload-config');

// Upload de foto de perfil
const profilePath = uploadConfig.getUserProfilePath(userId);

// Upload de documento de veículo
const vehiclePath = uploadConfig.getVehicleDocumentPath(vehicleId);
```

## 🚨 Troubleshooting

### Problemas Comuns
1. **Erro de permissão**: Verificar permissões da pasta
2. **Espaço insuficiente**: Executar limpeza manual
3. **Arquivo corrompido**: Verificar logs de upload

### Comandos Úteis
```bash
# Verificar espaço usado
du -sh uploads/

# Limpar arquivos temporários
find uploads/system/temp -type f -mtime +1 -delete

# Verificar arquivos órfãos
node scripts/maintenance/check-orphaned-files.js
```