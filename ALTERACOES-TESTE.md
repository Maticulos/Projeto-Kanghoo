# Alterações na Branch Teste

## Data: 2025-10-15

### Máscaras de Caracteres Implementadas

Foi criado o arquivo `mascaras.js` com máscaras automáticas para os seguintes campos:

#### 1. **CPF**
- Formato: `000.000.000-00`
- Limite: 11 dígitos
- Aplicação: Campos com name="cpf"

#### 2. **CNPJ**
- Formato: `00.000.000/0000-00`
- Limite: 14 dígitos
- Aplicação: Campos com name="cnpj"

#### 3. **Celular**
- Formato: `(00) 00000-0000`
- Limite: 11 dígitos
- Aplicação: Campos com name="celular", "telefoneEmergencia", "telefoneEmpresa"

#### 4. **CEP**
- Formato: `00000-000`
- Limite: 8 dígitos
- Aplicação: Campos com name="cep", "cepEmpresa"

#### 5. **Placa de Veículo**
- Formato: `ABC-1234` (padrão Mercosul)
- Limite: 7 caracteres (3 letras + 4 números)
- Aplicação: Campos com name="placa"

#### 6. **RENAVAM**
- Formato: Apenas números
- Limite: 11 dígitos
- Aplicação: Campos com name="renavam"

#### 7. **CNH**
- Formato: Apenas números
- Limite: 11 dígitos
- Aplicação: Campos com name="cnhMotorista"

#### 8. **Número de Apólice**
- Formato: Apenas números
- Limite: 20 dígitos
- Aplicação: Campos com name="numeroApolice"

### Visualizador de Senha no Login

#### Funcionalidade Implementada:
- Adicionado botão com ícone de olho ao lado do campo de senha
- Permite alternar entre visualização oculta (password) e visível (text)
- Ícones SVG responsivos que mudam de acordo com o estado
- Estilos CSS dedicados para posicionamento e hover

#### Arquivos Modificados:
1. **login.html**
   - Adicionado wrapper `.password-wrapper` ao campo de senha
   - Inserido botão `.toggle-password` com ícones SVG
   - JavaScript para alternar tipo do input e visibilidade dos ícones

2. **style.css**
   - Estilos para `.password-wrapper`
   - Estilos para `.toggle-password`
   - Efeitos de hover e focus
   - Responsividade do ícone

#### Arquivos Envolvidos:
- `cadastro-escolar.html` - Integrado com mascaras.js
- `cadastro-excursao.html` - Integrado com mascaras.js
- `login.html` - Visualizador de senha implementado
- `mascaras.js` - Novo arquivo com todas as funções de máscara
- `style.css` - Estilos para visualizador de senha

### Backend
- Revisado o código do servidor (server.js) - Sem alterações necessárias
- Revisado o código do banco de dados (db.js) - Sem alterações necessárias
- Backend mantém compatibilidade com as máscaras do frontend

### Observações Importantes:
1. As máscaras são aplicadas automaticamente ao digitar nos campos
2. As máscaras não alteram os dados enviados ao backend (apenas formatação visual)
3. O visualizador de senha é totalmente acessível (aria-label incluído)
4. Todos os arquivos foram validados quanto à sintaxe
5. Nenhuma tecnologia foi alterada - apenas adições ao código existente
6. Todas as alterações foram feitas na branch "teste" conforme solicitado
