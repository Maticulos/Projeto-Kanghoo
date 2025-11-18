# Especificação de Requisitos - Otimização do Sistema Kanghoo

## Introdução

O Sistema Kanghoo é uma plataforma completa de transporte escolar que necessita de otimização e padronização em sua arquitetura. O sistema atual possui funcionalidades distribuídas em múltiplos arquivos sem padronização clara, código JavaScript inline extenso, e inconsistências na estrutura de autenticação e comunicação entre frontend e backend. Esta especificação define os requisitos para modernizar e otimizar o sistema, melhorando sua manutenibilidade, performance e experiência do usuário.

## Glossário

- **Sistema_Kanghoo**: Plataforma completa de transporte escolar com rastreamento em tempo real
- **Frontend**: Interface web responsiva desenvolvida em HTML5, CSS3 e JavaScript
- **Backend**: Servidor desenvolvido em Node.js com framework Koa.js
- **API_Client**: Módulo centralizado para comunicação HTTP entre frontend e backend
- **Auth_Manager**: Sistema unificado de autenticação e autorização
- **Route_Manager**: Sistema centralizado de gerenciamento de rotas de API
- **Theme_System**: Sistema unificado de temas visuais (claro/escuro)
- **Notification_System**: Sistema centralizado de notificações para usuários
- **Form_Validator**: Sistema reutilizável de validação de formulários
- **Cache_Manager**: Sistema de cache para configurações e dados do usuário
- **Loading_Component**: Componente padronizado para estados de carregamento
- **CSS_Variables**: Variáveis CSS centralizadas para consistência visual
- **Component_Library**: Biblioteca de componentes UI reutilizáveis
- **Service_Layer**: Camada de serviços no backend para lógica de negócio
- **Error_Handler**: Sistema centralizado de tratamento de erros
- **Data_Validator**: Sistema unificado de validação de dados no backend

## Requisitos

### Requisito 1

**User Story:** Como desenvolvedor do sistema, eu quero centralizar todas as rotas de API em um arquivo de configuração, para que eu possa manter URLs consistentes e facilitar a manutenção.

#### Acceptance Criteria

1. WHEN o sistema inicializa, THE Sistema_Kanghoo SHALL carregar todas as URLs de API de um arquivo centralizado de configuração
2. THE Route_Manager SHALL padronizar todas as rotas para usar o prefixo /api/v1/
3. THE API_Client SHALL abstrair todas as chamadas HTTP usando as rotas centralizadas
4. THE Sistema_Kanghoo SHALL substituir URLs hardcoded por referências ao arquivo de configuração
5. THE Route_Manager SHALL validar a existência de todas as rotas antes da inicialização

### Requisito 2

**User Story:** Como desenvolvedor do sistema, eu quero unificar a lógica de autenticação em um módulo compartilhado, para que eu possa eliminar código duplicado e garantir consistência.

#### Acceptance Criteria

1. THE Auth_Manager SHALL centralizar todas as funções de autenticação em um módulo único
2. WHEN um usuário acessa uma página protegida, THE Auth_Manager SHALL verificar automaticamente a autenticação
3. THE Auth_Manager SHALL implementar verificação contínua de token a cada 30 segundos
4. THE Auth_Manager SHALL gerenciar eventos de foco, visibilidade e carregamento de página
5. THE Auth_Manager SHALL fornecer função unificada de redirecionamento baseada no tipo de usuário

### Requisito 3

**User Story:** Como desenvolvedor do sistema, eu quero configurar dinamicamente a URL base da API, para que o sistema funcione corretamente em diferentes ambientes.

#### Acceptance Criteria

1. THE API_Client SHALL determinar automaticamente a URL base usando window.location.hostname
2. THE Sistema_Kanghoo SHALL substituir todas as URLs hardcoded por configuração dinâmica
3. WHEN o ambiente muda, THE API_Client SHALL adaptar automaticamente as chamadas de API
4. THE API_Client SHALL manter compatibilidade com desenvolvimento local e produção
5. THE Sistema_Kanghoo SHALL validar a conectividade com a API antes de realizar chamadas

### Requisito 4

**User Story:** Como desenvolvedor do sistema, eu quero padronizar todos os redirecionamentos de usuário, para que eu possa garantir que todas as rotas sejam válidas e funcionais.

#### Acceptance Criteria

1. THE Auth_Manager SHALL centralizar a função getRedirectUrlByUserType em um módulo compartilhado
2. THE Sistema_Kanghoo SHALL validar todas as rotas antes de executar redirecionamentos
3. WHEN um redirecionamento falha, THE Auth_Manager SHALL implementar fallback para login.html
4. THE Auth_Manager SHALL tratar motorista_escolar_excursao com modal de seleção
5. THE Sistema_Kanghoo SHALL registrar logs de erro para redirecionamentos inválidos

### Requisito 5

**User Story:** Como desenvolvedor do sistema, eu quero implementar um sistema unificado de notificações, para que eu possa manter consistência visual e funcional em todas as páginas.

#### Acceptance Criteria

1. THE Notification_System SHALL fornecer métodos padronizados: success(), error(), info(), warning()
2. THE Notification_System SHALL substituir todas as funções inline showSuccess() e showError()
3. THE Notification_System SHALL implementar persistência opcional usando localStorage
4. WHEN uma notificação é exibida, THE Notification_System SHALL aplicar estilos consistentes
5. THE Notification_System SHALL permitir configuração de duração e posicionamento

### Requisito 6

**User Story:** Como desenvolvedor do sistema, eu quero expandir o cache manager para incluir preferências do usuário, para que eu possa sincronizar configurações entre todas as páginas.

#### Acceptance Criteria

1. THE Cache_Manager SHALL implementar métodos getUserPreferences() e setUserPreference()
2. THE Cache_Manager SHALL sincronizar tema entre todas as páginas automaticamente
3. THE Cache_Manager SHALL implementar listener de mudanças de preferências
4. WHEN uma preferência é alterada, THE Cache_Manager SHALL notificar todas as páginas abertas
5. THE Cache_Manager SHALL persistir preferências no localStorage

### Requisito 7

**User Story:** Como desenvolvedor do sistema, eu quero criar um sistema de validação de formulários reutilizável, para que eu possa eliminar validação duplicada e garantir consistência.

#### Acceptance Criteria

1. THE Form_Validator SHALL implementar regras de validação para email, CPF, telefone e campos obrigatórios
2. THE Form_Validator SHALL fornecer validação em tempo real durante a digitação
3. THE Form_Validator SHALL exibir mensagens de erro padronizadas
4. THE Form_Validator SHALL integrar com formulários de cadastro e login
5. THE Form_Validator SHALL permitir configuração de regras customizadas

### Requisito 8

**User Story:** Como desenvolvedor do sistema, eu quero padronizar estados de loading em todas as páginas, para que eu possa melhorar a experiência do usuário.

#### Acceptance Criteria

1. THE Loading_Component SHALL fornecer componente reutilizável de loading spinner
2. THE Loading_Component SHALL aplicar estilos consistentes em todas as páginas
3. THE Loading_Component SHALL implementar timeout automático para evitar loading infinito
4. WHEN um botão de submit é clicado, THE Loading_Component SHALL mostrar estado de carregamento
5. THE Loading_Component SHALL desabilitar interações durante o carregamento

### Requisito 9

**User Story:** Como desenvolvedor do sistema, eu quero unificar o sistema de temas usando apenas data-theme, para que eu possa eliminar inconsistências visuais.

#### Acceptance Criteria

1. THE Theme_System SHALL usar exclusivamente seletores [data-theme="dark"] e [data-theme="light"]
2. THE Sistema_Kanghoo SHALL remover todas as referências a classe .dark-theme
3. THE Theme_System SHALL atualizar todas as funções JavaScript para usar apenas data-theme
4. THE Sistema_Kanghoo SHALL remover scripts que forçam tema claro no final dos arquivos HTML
5. THE Theme_System SHALL manter consistência visual entre todas as páginas

### Requisito 10

**User Story:** Como desenvolvedor do sistema, eu quero centralizar todas as variáveis CSS, para que eu possa manter consistência visual e facilitar manutenção.

#### Acceptance Criteria

1. THE CSS_Variables SHALL consolidar todas as variáveis em um arquivo variables.css único
2. THE Sistema_Kanghoo SHALL remover definições duplicadas de variáveis CSS
3. THE CSS_Variables SHALL definir breakpoints padrão para responsividade
4. THE CSS_Variables SHALL incluir documentação de variáveis disponíveis
5. THE Sistema_Kanghoo SHALL atualizar todas as páginas para usar variáveis centralizadas

### Requisito 11

**User Story:** Como desenvolvedor do sistema, eu quero criar uma biblioteca de componentes CSS padronizados, para que eu possa manter consistência visual em botões, cards e modais.

#### Acceptance Criteria

1. THE Component_Library SHALL extrair estilos de botões para componente reutilizável
2. THE Component_Library SHALL padronizar cards com classes base: .card, .card-header, .card-body
3. THE Component_Library SHALL unificar modais com classes: .modal, .modal-overlay, .modal-content
4. THE Component_Library SHALL garantir responsividade consistente em todos os componentes
5. THE Component_Library SHALL documentar uso de cada componente

### Requisito 12

**User Story:** Como desenvolvedor do sistema, eu quero reorganizar a estrutura de arquivos JavaScript, para que eu possa eliminar duplicação e melhorar organização.

#### Acceptance Criteria

1. THE Sistema_Kanghoo SHALL consolidar arquivos duplicados como ui-utils.js
2. THE Sistema_Kanghoo SHALL organizar arquivos em pastas: core/, components/, api/, pages/, vendors/
3. THE Sistema_Kanghoo SHALL extrair lógica de páginas para arquivos JS separados
4. THE Sistema_Kanghoo SHALL mover JavaScript inline para módulos externos
5. THE Sistema_Kanghoo SHALL implementar estrutura modular ES6 com import/export

### Requisito 13

**User Story:** Como desenvolvedor do sistema, eu quero reorganizar as rotas do backend por domínio, para que eu possa melhorar a organização e manutenibilidade.

#### Acceptance Criteria

1. THE Sistema_Kanghoo SHALL agrupar rotas em pastas por domínio: auth/, motoristas/, responsaveis/, etc.
2. THE Sistema_Kanghoo SHALL manter compatibilidade com rotas existentes durante migração
3. THE Sistema_Kanghoo SHALL atualizar server.js para importar rotas agrupadas
4. THE Sistema_Kanghoo SHALL documentar nova estrutura de rotas
5. THE Sistema_Kanghoo SHALL implementar versionamento de API

### Requisito 14

**User Story:** Como desenvolvedor do sistema, eu quero extrair JavaScript inline das páginas principais, para que eu possa melhorar performance e manutenibilidade.

#### Acceptance Criteria

1. THE Sistema_Kanghoo SHALL extrair JavaScript inline de area-motorista-escolar.html (~3000 linhas)
2. THE Sistema_Kanghoo SHALL extrair JavaScript inline de area-motorista-excursao.html (~2000 linhas)
3. THE Sistema_Kanghoo SHALL extrair JavaScript inline de area-responsavel.html (~3600 linhas)
4. THE Sistema_Kanghoo SHALL manter apenas inicialização mínima nos arquivos HTML
5. THE Sistema_Kanghoo SHALL organizar código extraído em módulos lógicos

### Requisito 15

**User Story:** Como desenvolvedor do sistema, eu quero implementar uma camada de serviços no backend, para que eu possa separar lógica de negócio das rotas.

#### Acceptance Criteria

1. THE Service_Layer SHALL extrair lógica de negócio das rotas para serviços dedicados
2. THE Sistema_Kanghoo SHALL criar serviços: auth-service, motorista-service, crianca-service, etc.
3. THE Sistema_Kanghoo SHALL fazer rotas delegarem processamento para services
4. THE Service_Layer SHALL conter toda lógica de acesso a banco e processamento
5. THE Service_Layer SHALL implementar tratamento de erros padronizado

### Requisito 16

**User Story:** Como desenvolvedor do sistema, eu quero centralizar o tratamento de erros, para que eu possa manter consistência e facilitar debugging.

#### Acceptance Criteria

1. THE Error_Handler SHALL implementar middleware global de tratamento de erros
2. THE Error_Handler SHALL padronizar formato de resposta: { success: false, message: string, code: string }
3. THE Error_Handler SHALL implementar logging automático de erros
4. THE Error_Handler SHALL definir códigos de erro padronizados
5. THE Error_Handler SHALL fornecer helpers para diferentes tipos de erro

### Requisito 17

**User Story:** Como desenvolvedor do sistema, eu quero unificar a validação de dados no backend, para que eu possa eliminar validação duplicada e garantir consistência.

#### Acceptance Criteria

1. THE Data_Validator SHALL criar schemas de validação para cada tipo de dado
2. THE Data_Validator SHALL implementar funções: validateEmail(), validateCPF(), validatePhone()
3. THE Data_Validator SHALL fornecer validação automática via middleware
4. THE Data_Validator SHALL retornar erros de validação em formato padronizado
5. THE Data_Validator SHALL integrar com todas as rotas que recebem dados