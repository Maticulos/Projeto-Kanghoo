/**
 * Arquivo de máscaras para os formulários
 * Implementa máscaras para campos como CPF, CNPJ, telefone, CEP, etc.
 */

// Função para aplicar máscara genérica
function aplicarMascara(input, mascara) {
    if (!input) {
        return;
    }
    
    // Função para aplicar a máscara
    function formatarValor(valor) {
        // Remove todos os caracteres não numéricos
        let apenasNumeros = valor.replace(/\D/g, '');
        let valorMascarado = '';
        let indice = 0;
        
        // Aplica a máscara
        for (let i = 0; i < mascara.length && indice < apenasNumeros.length; i++) {
            if (mascara[i] === '#') {
                valorMascarado += apenasNumeros[indice++];
            } else {
                valorMascarado += mascara[i];
            }
        }
        
        return valorMascarado;
    }
    
    // Evento de input
    input.addEventListener('input', function(e) {
        const valorAtual = e.target.value;
        const valorFormatado = formatarValor(valorAtual);
        
        if (valorAtual !== valorFormatado) {
            e.target.value = valorFormatado;
        }
    });
    
    // Evento de paste
    input.addEventListener('paste', function(e) {
        setTimeout(() => {
            const valorAtual = e.target.value;
            const valorFormatado = formatarValor(valorAtual);
            e.target.value = valorFormatado;
        }, 10);
    });
    
    return input;
}

// Função para limitar o número de caracteres
function limitarCaracteres(input, maxLength) {
    if (!input) return;
    
    input.addEventListener('input', function(e) {
        const valorAtual = e.target.value;
        if (valorAtual.length > maxLength) {
            const novoValor = valorAtual.slice(0, maxLength);
            if (e.target.value !== novoValor) {
                e.target.value = novoValor;
            }
        }
    });
}

// Função para aplicar máscara de telefone
function mascaraTelefone(input) {
    if (!input) return;
    aplicarMascara(input, '(##) #####-####');
}

// Função para aplicar máscara de CEP
function mascaraCEP(input) {
    if (!input) return;
    aplicarMascara(input, '#####-###');
}

// Função para aplicar máscara de CPF
function mascaraCPF(input) {
    if (!input) return;
    aplicarMascara(input, '###.###.###-##');
}

// Função para aplicar máscara de CNPJ
function mascaraCNPJ(input) {
    if (!input) return;
    aplicarMascara(input, '##.###.###/####-##');
}

// Máscara para nomes (apenas letras, espaços e acentos)
function mascaraNome(input) {
    if (!input) return;
    
    input.addEventListener('input', function(e) {
        let valor = e.target.value;
        
        // Remove números e caracteres especiais, mantém apenas letras, espaços e acentos
        valor = valor.replace(/[^a-zA-ZÀ-ÿ\s]/g, '');
        
        // Remove espaços múltiplos
        valor = valor.replace(/\s+/g, ' ');
        
        // Capitaliza primeira letra de cada palavra
        valor = valor.replace(/\b\w/g, l => l.toUpperCase());
        
        if (e.target.value !== valor) {
            e.target.value = valor;
        }
    });
}

// Máscara para campos de endereço (rua, bairro, cidade) com formatação inteligente
function mascaraEndereco(input) {
    if (!input) return;
    
    input.addEventListener('input', function(e) {
        let valor = e.target.value;
        
        // Remove caracteres especiais indesejados, mantém letras, números, espaços, acentos e alguns símbolos comuns em endereços
        valor = valor.replace(/[^a-zA-ZÀ-ÿ0-9\s\-\.\,\/]/g, '');
        
        // Remove espaços múltiplos
        valor = valor.replace(/\s+/g, ' ');
        
        // Aplica formatação de nome próprio
        valor = formatarNomeProprio(valor);
        
        if (e.target.value !== valor) {
            e.target.value = valor;
        }
    });
}

// Máscara para números (apenas dígitos)
function mascaraNumero(input) {
    if (!input) return;
    
    input.addEventListener('input', function(e) {
        let valor = e.target.value.replace(/\D/g, '');
        
        if (e.target.value !== valor) {
            e.target.value = valor;
        }
    });
}

// Máscara para cor do veículo (apenas letras e espaços)
function mascaraCor(input) {
    if (!input) return;
    
    input.addEventListener('input', function(e) {
        let valor = e.target.value;
        
        // Remove números e caracteres especiais, mantém apenas letras, espaços e acentos
        valor = valor.replace(/[^a-zA-ZÀ-ÿ\s]/g, '');
        
        // Remove espaços múltiplos
        valor = valor.replace(/\s+/g, ' ');
        
        // Capitaliza primeira letra de cada palavra
        valor = valor.replace(/\b\w/g, l => l.toUpperCase());
        
        if (e.target.value !== valor) {
            e.target.value = valor;
        }
    });
}

// Função para aplicar máscara de placa de veículo (formato novo Mercosul)
function mascaraPlaca(input) {
    if (!input) return;
    
    input.addEventListener('input', function(e) {
        const valorAtual = e.target.value;
        let valor = valorAtual.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        
        if (valor.length > 0) {
            // Formato Mercosul: ABC1D23 ou ABC1234
            if (valor.length <= 3) {
                // Primeiros 3 caracteres são letras
                valor = valor.replace(/[^A-Z]/g, '');
            } else if (valor.length === 4) {
                // Quarto caractere é número
                valor = valor.slice(0, 3) + valor.slice(3).replace(/[^0-9]/g, '');
            } else if (valor.length === 5) {
                // Quinto caractere pode ser letra (Mercosul) ou número (tradicional)
                valor = valor.slice(0, 4) + valor.slice(4);
            } else {
                // Últimos caracteres são números
                valor = valor.slice(0, 5) + valor.slice(5).replace(/[^0-9]/g, '');
            }
        }
        
        // Limitar ao tamanho máximo
        if (valor.length > 7) {
            valor = valor.slice(0, 7);
        }
        
        if (e.target.value !== valor) {
            e.target.value = valor;
        }
    });
}

// Função para aplicar máscara de RENAVAM (11 dígitos)
function mascaraRENAVAM(input) {
    if (!input) return;
    
    input.addEventListener('input', function(e) {
        const valorAtual = e.target.value;
        let valor = valorAtual.replace(/\D/g, '');
        
        // Limitar a 11 dígitos
        if (valor.length > 11) {
            valor = valor.slice(0, 11);
        }
        
        if (e.target.value !== valor) {
            e.target.value = valor;
        }
    });
}

// Função para aplicar máscara de CNH (11 dígitos)
function mascaraCNH(input) {
    if (!input) return;
    
    input.addEventListener('input', function(e) {
        const valorAtual = e.target.value;
        let valor = valorAtual.replace(/\D/g, '');
        
        // Limitar a 11 dígitos
        if (valor.length > 11) {
            valor = valor.slice(0, 11);
        }
        
        if (e.target.value !== valor) {
            e.target.value = valor;
        }
    });
}

// Função para aplicar máscara de número de apólice
function mascaraApolice(input) {
    if (!input) return;
    
    input.addEventListener('input', function(e) {
        const valorAtual = e.target.value;
        let valor = valorAtual.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        
        // Limitar a 20 caracteres
        if (valor.length > 20) {
            valor = valor.slice(0, 20);
        }
        
        if (e.target.value !== valor) {
            e.target.value = valor;
        }
    });
}

// Função para aplicar máscara de email
function mascaraEmail(input) {
    if (!input) return;
    
    input.addEventListener('input', function(e) {
        let valor = e.target.value;
        
        // Remove caracteres inválidos para email (mantém apenas letras, números, @, ., -, _)
        valor = valor.replace(/[^a-zA-Z0-9@._-]/g, '');
        
        // Converte para minúsculas
        valor = valor.toLowerCase();
        
        // Evita múltiplos @ consecutivos
        valor = valor.replace(/@+/g, '@');
        
        // Evita múltiplos pontos consecutivos
        valor = valor.replace(/\.+/g, '.');
        
        if (e.target.value !== valor) {
            e.target.value = valor;
        }
        
        // Validação em tempo real
        validarEmail(e.target, valor);
    });
    
    // Validação no evento blur
    input.addEventListener('blur', function(e) {
        validarEmail(e.target, e.target.value);
    });
}

// Função para validar email em tempo real
function validarEmail(input, valor) {
    // Remove avisos anteriores
    if (input.nextElementSibling && input.nextElementSibling.classList.contains('email-aviso')) {
        input.nextElementSibling.remove();
    }
    
    if (valor.length === 0) return; // Não validar campo vazio
    
    let mensagemErro = '';
    
    // Regex básico para email
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    // Verificações específicas
    if (!valor.includes('@')) {
        mensagemErro = 'E-mail deve conter @';
    } else if (valor.split('@').length > 2) {
        mensagemErro = 'E-mail deve conter apenas um @';
    } else if (valor.startsWith('@') || valor.endsWith('@')) {
        mensagemErro = 'E-mail não pode começar ou terminar com @';
    } else if (valor.includes('..')) {
        mensagemErro = 'E-mail não pode conter pontos consecutivos';
    } else if (!emailRegex.test(valor)) {
        const partes = valor.split('@');
        if (partes.length === 2) {
            if (partes[0].length === 0) {
                mensagemErro = 'E-mail deve ter texto antes do @';
            } else if (partes[1].length === 0) {
                mensagemErro = 'E-mail deve ter domínio após o @';
            } else if (!partes[1].includes('.')) {
                mensagemErro = 'Domínio deve conter pelo menos um ponto';
            } else if (partes[1].endsWith('.')) {
                mensagemErro = 'Domínio não pode terminar com ponto';
            } else if (partes[1].split('.').some(parte => parte.length < 2)) {
                mensagemErro = 'Extensão do domínio deve ter pelo menos 2 caracteres';
            }
        }
    }
    
    // Mostrar mensagem de erro se houver
    if (mensagemErro) {
        const avisoEmail = document.createElement('small');
        avisoEmail.className = 'email-aviso';
        avisoEmail.style.color = '#e74c3c';
        avisoEmail.style.fontSize = '12px';
        avisoEmail.style.marginTop = '5px';
        avisoEmail.style.display = 'block';
        avisoEmail.textContent = mensagemErro;
        input.parentNode.insertBefore(avisoEmail, input.nextSibling);
    }
}

// Função para mostrar feedback visual quando data futura é bloqueada
function mostrarFeedbackDataFutura(input, tipoDataFutura) {
    // Remove feedback anterior se existir
    if (input.nextElementSibling && input.nextElementSibling.classList.contains('data-futura-feedback')) {
        input.nextElementSibling.remove();
    }
    
    // Criar container de feedback
    const feedbackContainer = document.createElement('div');
    feedbackContainer.className = 'data-futura-feedback';
    feedbackContainer.style.cssText = `
        position: relative;
        margin-top: 8px;
        padding: 12px 16px;
        background: linear-gradient(135deg, #ff6b6b, #ee5a52);
        color: white;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
        animation: slideInFeedback 0.3s ease-out;
        border-left: 4px solid #ff4757;
        display: flex;
        align-items: center;
        gap: 10px;
    `;
    
    // Ícone de aviso
    const icone = document.createElement('span');
    icone.innerHTML = '⚠️';
    icone.style.fontSize = '16px';
    
    // Mensagem personalizada baseada no tipo
    const mensagem = document.createElement('span');
    let textoMensagem = '';
    
    switch(tipoDataFutura) {
        case 'ano':
            textoMensagem = 'Ano futuro detectado! Ajustado para o ano atual.';
            break;
        case 'mês':
            textoMensagem = 'Mês futuro detectado! Ajustado para o mês atual.';
            break;
        case 'dia':
            textoMensagem = 'Data futura detectada! Ajustado para hoje.';
            break;
        default:
            textoMensagem = 'Data futura não permitida! Valor ajustado automaticamente.';
    }
    
    mensagem.textContent = textoMensagem;
    
    // Botão de fechar
    const botaoFechar = document.createElement('button');
    botaoFechar.innerHTML = '×';
    botaoFechar.style.cssText = `
        background: none;
        border: none;
        color: white;
        font-size: 18px;
        font-weight: bold;
        cursor: pointer;
        padding: 0;
        margin-left: auto;
        opacity: 0.8;
        transition: opacity 0.2s;
    `;
    
    botaoFechar.onmouseover = () => botaoFechar.style.opacity = '1';
    botaoFechar.onmouseout = () => botaoFechar.style.opacity = '0.8';
    botaoFechar.onclick = () => feedbackContainer.remove();
    
    // Montar o feedback
    feedbackContainer.appendChild(icone);
    feedbackContainer.appendChild(mensagem);
    feedbackContainer.appendChild(botaoFechar);
    
    // Inserir após o campo
    input.parentNode.insertBefore(feedbackContainer, input.nextSibling);
    
    // Adicionar animação de entrada
    feedbackContainer.style.transform = 'translateY(-10px)';
    feedbackContainer.style.opacity = '0';
    
    setTimeout(() => {
        feedbackContainer.style.transition = 'all 0.3s ease-out';
        feedbackContainer.style.transform = 'translateY(0)';
        feedbackContainer.style.opacity = '1';
    }, 10);
    
    // Remover automaticamente após 4 segundos
    setTimeout(() => {
        if (feedbackContainer.parentNode) {
            feedbackContainer.style.transition = 'all 0.3s ease-in';
            feedbackContainer.style.transform = 'translateY(-10px)';
            feedbackContainer.style.opacity = '0';
            setTimeout(() => {
                if (feedbackContainer.parentNode) {
                    feedbackContainer.remove();
                }
            }, 300);
        }
    }, 4000);
    
    // Adicionar efeito de shake no campo
    input.style.animation = 'shakeField 0.5s ease-in-out';
    setTimeout(() => {
        input.style.animation = '';
    }, 500);
}

// Função para adicionar tooltips informativos aos campos
function adicionarTooltipInformativo(input, tipo) {
    // Remove tooltip anterior se existir
    const tooltipExistente = input.parentNode.querySelector('.tooltip-info');
    if (tooltipExistente) {
        tooltipExistente.remove();
    }
    
    // Criar ícone de informação
    const iconeInfo = document.createElement('span');
    iconeInfo.className = 'tooltip-info';
    iconeInfo.innerHTML = 'ℹ️';
    iconeInfo.style.cssText = `
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        cursor: help;
        font-size: 16px;
        z-index: 10;
        opacity: 0.7;
        transition: opacity 0.2s;
    `;
    
    // Criar tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip-content';
    tooltip.style.cssText = `
        position: absolute;
        bottom: 100%;
        right: 0;
        margin-bottom: 8px;
        padding: 12px 16px;
        background: #2c3e50;
        color: white;
        border-radius: 8px;
        font-size: 13px;
        line-height: 1.4;
        white-space: nowrap;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
        z-index: 1000;
        max-width: 300px;
        white-space: normal;
    `;
    
    // Seta do tooltip
    const seta = document.createElement('div');
    seta.style.cssText = `
        position: absolute;
        top: 100%;
        right: 20px;
        width: 0;
        height: 0;
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-top: 6px solid #2c3e50;
    `;
    
    // Definir conteúdo baseado no tipo
    let conteudoTooltip = '';
    
    switch(tipo) {
        case 'dataNascimento':
            conteudoTooltip = `
                <strong>📅 Data de Nascimento</strong><br>
                • Não pode ser data futura<br>
                • Motorista deve ter pelo menos 18 anos<br>
                • Formato: DD/MM/AAAA<br>
                • Valores são ajustados automaticamente
            `;
            break;
        case 'validadeCNH':
            conteudoTooltip = `
                <strong>🪪 Validade da CNH</strong><br>
                • CNH não pode estar vencida<br>
                • Data deve ser futura ou atual<br>
                • Formato: DD/MM/AAAA<br>
                • Ajustado automaticamente se vencida
            `;
            break;
        case 'validadeSeguro':
            conteudoTooltip = `
                <strong>🛡️ Validade do Seguro</strong><br>
                • Seguro não pode estar vencido<br>
                • Data deve ser futura ou atual<br>
                • Formato: DD/MM/AAAA<br>
                • Ajustado automaticamente se vencido
            `;
            break;
        case 'email':
            conteudoTooltip = `
                <strong>📧 E-mail</strong><br>
                • Deve conter @ e domínio válido<br>
                • Exemplo: usuario@dominio.com<br>
                • Validação em tempo real<br>
                • Caracteres especiais são removidos
            `;
            break;
        case 'telefone':
            conteudoTooltip = `
                <strong>📞 Telefone</strong><br>
                • Formato: (XX) XXXXX-XXXX<br>
                • Apenas números são aceitos<br>
                • Máscara aplicada automaticamente
            `;
            break;
        case 'cpf':
            conteudoTooltip = `
                <strong>🆔 CPF</strong><br>
                • Formato: XXX.XXX.XXX-XX<br>
                • Apenas números são aceitos<br>
                • Máscara aplicada automaticamente
            `;
            break;
        case 'cep':
            conteudoTooltip = `
                <strong>📍 CEP</strong><br>
                • Formato: XXXXX-XXX<br>
                • Apenas números são aceitos<br>
                • Máscara aplicada automaticamente
            `;
            break;
        default:
            conteudoTooltip = `
                <strong>ℹ️ Campo com validação</strong><br>
                • Este campo possui validações especiais<br>
                • Siga o formato indicado<br>
                • Valores são ajustados automaticamente
            `;
    }
    
    tooltip.innerHTML = conteudoTooltip + seta.outerHTML;
    
    // Posicionar o container do input como relativo
    if (input.parentNode.style.position !== 'relative') {
        input.parentNode.style.position = 'relative';
    }
    
    // Eventos de hover
    iconeInfo.addEventListener('mouseenter', () => {
        iconeInfo.style.opacity = '1';
        tooltip.style.opacity = '1';
        tooltip.style.visibility = 'visible';
        tooltip.style.transform = 'translateY(-5px)';
    });
    
    iconeInfo.addEventListener('mouseleave', () => {
        iconeInfo.style.opacity = '0.7';
        tooltip.style.opacity = '0';
        tooltip.style.visibility = 'hidden';
        tooltip.style.transform = 'translateY(0)';
    });
    
    // Adicionar elementos
    iconeInfo.appendChild(tooltip);
    input.parentNode.appendChild(iconeInfo);
}

// Função para adicionar indicadores visuais de campos obrigatórios vs opcionais
function adicionarIndicadoresCampos() {
    // Selecionar todos os inputs, selects e textareas
    const todosOsCampos = document.querySelectorAll('input, select, textarea');
    
    todosOsCampos.forEach(campo => {
        // Pular campos que não são visíveis ou são do tipo hidden/submit/button
        if (campo.type === 'hidden' || campo.type === 'submit' || campo.type === 'button' || 
            campo.style.display === 'none' || !campo.offsetParent) {
            return;
        }
        
        // Encontrar o label associado
        let label = null;
        
        // Tentar encontrar label por 'for' attribute
        if (campo.id) {
            label = document.querySelector(`label[for="${campo.id}"]`);
        }
        
        // Se não encontrou, tentar encontrar label pai
        if (!label) {
            label = campo.closest('label');
        }
        
        // Se ainda não encontrou, tentar encontrar label irmão anterior
        if (!label) {
            let elemento = campo.previousElementSibling;
            while (elemento) {
                if (elemento.tagName === 'LABEL') {
                    label = elemento;
                    break;
                }
                elemento = elemento.previousElementSibling;
            }
        }
        
        // Se ainda não encontrou, criar um container para o indicador
        if (!label) {
            // Verificar se já existe um indicador
            const indicadorExistente = campo.parentNode.querySelector('.campo-indicador');
            if (indicadorExistente) return;
            
            // Criar container para o indicador
            const container = document.createElement('div');
            container.className = 'campo-indicador';
            container.style.cssText = `
                position: relative;
                display: inline-block;
                width: 100%;
            `;
            
            // Mover o campo para dentro do container
            campo.parentNode.insertBefore(container, campo);
            container.appendChild(campo);
            
            // Adicionar indicador no container
            adicionarIndicadorAoCampo(campo, container, campo.hasAttribute('required'));
        } else {
            // Adicionar indicador ao label existente
            adicionarIndicadorAoLabel(label, campo.hasAttribute('required'));
        }
        
        // Adicionar estilos ao campo baseado no status
        if (campo.hasAttribute('required')) {
            campo.style.borderLeft = '3px solid #e74c3c';
            campo.classList.add('campo-obrigatorio');
        } else {
            campo.style.borderLeft = '3px solid #95a5a6';
            campo.classList.add('campo-opcional');
        }
    });
}

// Função para adicionar indicador ao label
function adicionarIndicadorAoLabel(label, isRequired) {
    // Verificar se já existe indicador
    const indicadorExistente = label.querySelector('.indicador-campo');
    if (indicadorExistente) return;
    
    const indicador = document.createElement('span');
    indicador.className = 'indicador-campo';
    
    if (isRequired) {
        indicador.innerHTML = ' <span style="color: #e74c3c; font-weight: bold;">*</span>';
        indicador.title = 'Campo obrigatório';
    } else {
        indicador.innerHTML = ' <span style="color: #95a5a6; font-size: 12px;">(opcional)</span>';
        indicador.title = 'Campo opcional';
    }
    
    label.appendChild(indicador);
}

// Função para adicionar indicador ao campo (quando não há label)
function adicionarIndicadorAoCampo(campo, container, isRequired) {
    // Verificar se já existe indicador
    const indicadorExistente = container.querySelector('.indicador-campo-direto');
    if (indicadorExistente) return;
    
    const indicador = document.createElement('span');
    indicador.className = 'indicador-campo-direto';
    indicador.style.cssText = `
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 14px;
        font-weight: bold;
        z-index: 5;
        pointer-events: none;
    `;
    
    if (isRequired) {
        indicador.innerHTML = '*';
        indicador.style.color = '#e74c3c';
        indicador.title = 'Campo obrigatório';
    } else {
        indicador.innerHTML = '?';
        indicador.style.color = '#95a5a6';
        indicador.title = 'Campo opcional';
    }
    
    container.appendChild(indicador);
}

// Função para aplicar máscara de complemento (endereço)
function mascaraComplemento(input) {
    if (!input) return;
    
    input.addEventListener('input', function(e) {
        let valor = e.target.value;
        
        // Remove caracteres especiais perigosos, mantém letras, números, espaços e alguns símbolos comuns
        valor = valor.replace(/[^a-zA-ZÀ-ÿ0-9\s.,\-\/°ºª]/g, '');
        
        // Remove espaços múltiplos
        valor = valor.replace(/\s+/g, ' ');
        
        // Capitaliza primeira letra de cada palavra
        valor = valor.replace(/\b\w/g, l => l.toUpperCase());
        
        if (e.target.value !== valor) {
            e.target.value = valor;
        }
    });
}

// Função para verificar se um ano é bissexto
function isAnoBissexto(ano) {
    return (ano % 4 === 0 && ano % 100 !== 0) || (ano % 400 === 0);
}

// Função para obter o número máximo de dias em um mês
function getDiasMaximosMes(mes, ano) {
    const diasPorMes = {
        1: 31,  // Janeiro
        2: isAnoBissexto(ano) ? 29 : 28,  // Fevereiro
        3: 31,  // Março
        4: 30,  // Abril
        5: 31,  // Maio
        6: 30,  // Junho
        7: 31,  // Julho
        8: 31,  // Agosto
        9: 30,  // Setembro
        10: 31, // Outubro
        11: 30, // Novembro
        12: 31  // Dezembro
    };
    return diasPorMes[mes] || 31;
}

// Função para aplicar máscara de data (formato DD/MM/AAAA)
function mascaraData(input) {
    if (!input) return;
    
    // Verificar se é campo de data de nascimento, validade de CNH ou validade de seguro
    const isDataNascimento = input.id === 'dataNascimento';
    const isValidadeCNH = input.id === 'validadeCNH';
    const isValidadeSeguro = input.id === 'validadeSeguro';
    
    input.addEventListener('input', function(e) {
        const valorAtual = e.target.value;
        let valor = valorAtual.replace(/\D/g, '');
        
        // Validar dia (01-31)
        if (valor.length >= 2) {
            let dia = parseInt(valor.substring(0, 2));
            if (dia > 31) {
                dia = 31;
            } else if (dia === 0) {
                dia = 1;
            }
            valor = String(dia).padStart(2, '0') + valor.substring(2);
        }
        
        // Validar mês (01-12)
        if (valor.length >= 4) {
            let mes = parseInt(valor.substring(2, 4));
            if (mes > 12) {
                mes = 12;
            } else if (mes === 0) {
                mes = 1;
            }
            valor = valor.substring(0, 2) + String(mes).padStart(2, '0') + valor.substring(4);
        }
        
        // Validar dia conforme o mês e ano (se ano estiver disponível)
        if (valor.length >= 8) {
            const dia = parseInt(valor.substring(0, 2));
            const mes = parseInt(valor.substring(2, 4));
            const ano = parseInt(valor.substring(4, 8));
            
            if (ano >= 1900 && ano <= 2100) { // Validar ano razoável
                const diasMaximos = getDiasMaximosMes(mes, ano);
                if (dia > diasMaximos) {
                    valor = String(diasMaximos).padStart(2, '0') + valor.substring(2);
                }
            }
        }
        
        if (valor.length > 0) {
            // Formata como DD/MM/AAAA
            if (valor.length <= 2) {
                // Apenas dia
                valor = valor;
            } else if (valor.length <= 4) {
                // Dia e mês
                valor = valor.substring(0, 2) + '/' + valor.substring(2);
            } else {
                // Dia, mês e ano
                valor = valor.substring(0, 2) + '/' + valor.substring(2, 4) + '/' + valor.substring(4);
            }
        }
        
        // Limitar a 10 caracteres (DD/MM/AAAA)
        if (valor.length > 10) {
            valor = valor.slice(0, 10);
        }
        
        // Validar data futura para campo de data de nascimento em tempo real
        if (isDataNascimento) {
            const dataAtual = new Date();
            const anoAtual = dataAtual.getFullYear();
            let dataFuturaDetectada = false;
            let tipoDataFutura = '';
            
            // Validar apenas ano se tiver 4 dígitos (não validar mês nem dia)
            if (valor.length >= 8) {
                const anoDigitado = parseInt(valor.substring(4, 8));
                if (anoDigitado > anoAtual) {
                    // Se o ano for futuro, usar o ano atual
                    valor = valor.substring(0, 4) + anoAtual;
                    dataFuturaDetectada = true;
                    tipoDataFutura = 'ano';
                }
            }
            
            // Mostrar feedback visual se data futura foi detectada
            if (dataFuturaDetectada) {
                mostrarFeedbackDataFutura(e.target, tipoDataFutura);
            }
            
            // Validação final para data completa
            if (valor.length === 10) {
                const partes = valor.split('/');
                if (partes.length === 3) {
                    const dia = parseInt(partes[0]);
                    const mes = parseInt(partes[1]);
                    const ano = parseInt(partes[2]);
                    
                    // Criar objeto de data
                    const dataDigitada = new Date(ano, mes - 1, dia);
                    
                    // Validar apenas se o ano for futuro (permitir qualquer dia/mês)
                    if (ano > dataAtual.getFullYear()) {
                        // Se o ano for futuro, usar o ano atual mantendo dia e mês
                        valor = `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${dataAtual.getFullYear()}`;
                    }
                    
                    // Validação de idade mínima de 18 anos (maioridade penal brasileira)
                    const dataMinima = new Date();
                    dataMinima.setFullYear(dataMinima.getFullYear() - 18);
                    
                    if (dataDigitada > dataMinima) {
                        // Se a pessoa for menor de 18 anos, usar a data mínima (18 anos atrás)
                        const diaMinimo = String(dataMinima.getDate()).padStart(2, '0');
                        const mesMinimo = String(dataMinima.getMonth() + 1).padStart(2, '0');
                        const anoMinimo = dataMinima.getFullYear();
                        valor = `${diaMinimo}/${mesMinimo}/${anoMinimo}`;
                        
                        // Mostrar mensagem de aviso (opcional)
                        if (input.nextElementSibling && input.nextElementSibling.classList.contains('idade-aviso')) {
                            input.nextElementSibling.remove();
                        }
                        const avisoIdade = document.createElement('small');
                        avisoIdade.className = 'idade-aviso';
                        avisoIdade.style.color = '#e74c3c';
                        avisoIdade.style.fontSize = '12px';
                        avisoIdade.style.marginTop = '5px';
                        avisoIdade.style.display = 'block';
                        avisoIdade.textContent = 'Idade mínima: 18 anos (maioridade penal)';
                        input.parentNode.insertBefore(avisoIdade, input.nextSibling);
                        
                        // Remover aviso após 3 segundos
                        setTimeout(() => {
                            if (avisoIdade.parentNode) {
                                avisoIdade.remove();
                            }
                        }, 3000);
                    }
                }
            }
        }
        
        // Validação para CNH vencida (não permitir datas passadas)
        if (isValidadeCNH && valor.length === 10) {
            const partes = valor.split('/');
            if (partes.length === 3) {
                const dia = parseInt(partes[0]);
                const mes = parseInt(partes[1]);
                const ano = parseInt(partes[2]);
                
                // Criar objeto de data
                const dataDigitada = new Date(ano, mes - 1, dia);
                const dataAtual = new Date();
                
                // Se a data digitada for menor que a data atual (CNH vencida)
                if (dataDigitada < dataAtual) {
                    // Usar a data atual como valor mínimo
                    const diaAtual = String(dataAtual.getDate()).padStart(2, '0');
                    const mesAtual = String(dataAtual.getMonth() + 1).padStart(2, '0');
                    const anoAtual = dataAtual.getFullYear();
                    valor = `${diaAtual}/${mesAtual}/${anoAtual}`;
                    
                    // Mostrar mensagem de aviso
                    if (input.nextElementSibling && input.nextElementSibling.classList.contains('cnh-aviso')) {
                        input.nextElementSibling.remove();
                    }
                    const avisoCNH = document.createElement('small');
                    avisoCNH.className = 'cnh-aviso';
                    avisoCNH.style.color = '#e74c3c';
                    avisoCNH.style.fontSize = '12px';
                    avisoCNH.style.marginTop = '5px';
                    avisoCNH.style.display = 'block';
                    avisoCNH.textContent = 'CNH não pode estar vencida';
                    input.parentNode.insertBefore(avisoCNH, input.nextSibling);
                    
                    // Remover aviso após 3 segundos
                    setTimeout(() => {
                        if (avisoCNH.parentNode) {
                            avisoCNH.remove();
                        }
                    }, 3000);
                }
            }
            
            // Validar seguro vencido para campo de validade do seguro
            if (isValidadeSeguro) {
                const dataDigitada = new Date(ano, mes - 1, dia);
                const dataAtual = new Date();
                
                // Se a data digitada for menor que a data atual (seguro vencido)
                if (dataDigitada < dataAtual) {
                    // Usar a data atual como valor mínimo
                    const diaAtual = String(dataAtual.getDate()).padStart(2, '0');
                    const mesAtual = String(dataAtual.getMonth() + 1).padStart(2, '0');
                    const anoAtual = dataAtual.getFullYear();
                    valor = `${diaAtual}/${mesAtual}/${anoAtual}`;
                    
                    // Mostrar mensagem de aviso
                    if (e.target.nextElementSibling && e.target.nextElementSibling.classList.contains('seguro-aviso')) {
                        e.target.nextElementSibling.remove();
                    }
                    const avisoSeguro = document.createElement('small');
                    avisoSeguro.className = 'seguro-aviso';
                    avisoSeguro.style.color = '#e74c3c';
                    avisoSeguro.style.fontSize = '12px';
                    avisoSeguro.style.marginTop = '5px';
                    avisoSeguro.style.display = 'block';
                    avisoSeguro.textContent = 'Seguro não pode estar vencido';
                    e.target.parentNode.insertBefore(avisoSeguro, e.target.nextSibling);
                    
                    // Remover aviso após 3 segundos
                    setTimeout(() => {
                        if (avisoSeguro.parentNode) {
                            avisoSeguro.remove();
                        }
                    }, 3000);
                }
            }
        }
        
        if (e.target.value !== valor) {
            e.target.value = valor;
        }
    });
    
    // Adicionar validação no evento keydown para campos de data de nascimento
    if (isDataNascimento) {
        input.addEventListener('keydown', function(e) {
            // Permitir teclas de controle (backspace, delete, tab, etc.)
            if (e.key === 'Backspace' || e.key === 'Delete' || e.key === 'Tab' || 
                e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home' || e.key === 'End') {
                return;
            }
            
            // Verificar se é um número
            if (!/^\d$/.test(e.key)) {
                e.preventDefault();
                return;
            }
            
            const valorAtual = e.target.value.replace(/\D/g, '');
            const posicaoCursor = e.target.selectionStart;
            const novoDigito = e.key;
            
            // Simular o valor após a digitação
            let novoValor = valorAtual.slice(0, posicaoCursor) + novoDigito + valorAtual.slice(posicaoCursor);
            
            const dataAtual = new Date();
            const anoAtual = dataAtual.getFullYear();
            const mesAtual = dataAtual.getMonth() + 1;
            const diaAtual = dataAtual.getDate();
            
            // Validar apenas ano futuro (permitir qualquer dia e mês)
            if (posicaoCursor >= 4 && posicaoCursor <= 7) {
                // Digitando o ano
                if (novoValor.length >= 8) {
                    const anoDigitado = parseInt(novoValor.substring(4, 8));
                    if (anoDigitado > anoAtual) {
                        e.preventDefault();
                        return;
                    }
                }
            }
        });
    }
    
    // Adicionar validação no evento blur para verificar a data completa
    input.addEventListener('blur', function(e) {
        const valor = e.target.value;
        if (valor.length === 10) {
            const partes = valor.split('/');
            if (partes.length === 3) {
                const dia = parseInt(partes[0]);
                const mes = parseInt(partes[1]);
                const ano = parseInt(partes[2]);
                
                // Validar se a data é válida
                const diasMaximos = getDiasMaximosMes(mes, ano);
                if (dia > diasMaximos) {
                    const diaCorrigido = String(diasMaximos).padStart(2, '0');
                    e.target.value = `${diaCorrigido}/${String(mes).padStart(2, '0')}/${ano}`;
                }
                
                // Validar data futura para campo de data de nascimento
                if (isDataNascimento) {
                    const dataDigitada = new Date(ano, mes - 1, dia);
                    const dataAtual = new Date();
                    
                    // Validar apenas se o ano for futuro (permitir qualquer dia/mês)
                    if (ano > dataAtual.getFullYear()) {
                        // Se o ano for futuro, usar o ano atual mantendo dia e mês
                        e.target.value = `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${dataAtual.getFullYear()}`;
                    }
                    
                    // Validação de idade mínima de 18 anos (maioridade penal brasileira)
                    const dataMinima = new Date();
                    dataMinima.setFullYear(dataMinima.getFullYear() - 18);
                    
                    if (dataDigitada > dataMinima) {
                        // Se a pessoa for menor de 18 anos, usar a data mínima (18 anos atrás)
                        const diaMinimo = String(dataMinima.getDate()).padStart(2, '0');
                        const mesMinimo = String(dataMinima.getMonth() + 1).padStart(2, '0');
                        const anoMinimo = dataMinima.getFullYear();
                        e.target.value = `${diaMinimo}/${mesMinimo}/${anoMinimo}`;
                        
                        // Mostrar mensagem de aviso
                        if (e.target.nextElementSibling && e.target.nextElementSibling.classList.contains('idade-aviso')) {
                            e.target.nextElementSibling.remove();
                        }
                        const avisoIdade = document.createElement('small');
                        avisoIdade.className = 'idade-aviso';
                        avisoIdade.style.color = '#e74c3c';
                        avisoIdade.style.fontSize = '12px';
                        avisoIdade.style.marginTop = '5px';
                        avisoIdade.style.display = 'block';
                        avisoIdade.textContent = 'Idade mínima: 18 anos (maioridade penal)';
                        e.target.parentNode.insertBefore(avisoIdade, e.target.nextSibling);
                        
                        // Remover aviso após 3 segundos
                        setTimeout(() => {
                            if (avisoIdade.parentNode) {
                                avisoIdade.remove();
                            }
                        }, 3000);
                    }
                }
                
                // Validar CNH vencida para campo de validade da CNH
                if (isValidadeCNH) {
                    const dataDigitada = new Date(ano, mes - 1, dia);
                    const dataAtual = new Date();
                    
                    // Se a data digitada for menor que a data atual (CNH vencida)
                    if (dataDigitada < dataAtual) {
                        // Usar a data atual como valor mínimo
                        const diaAtual = String(dataAtual.getDate()).padStart(2, '0');
                        const mesAtual = String(dataAtual.getMonth() + 1).padStart(2, '0');
                        const anoAtual = dataAtual.getFullYear();
                        e.target.value = `${diaAtual}/${mesAtual}/${anoAtual}`;
                        
                        // Mostrar mensagem de aviso
                        if (e.target.nextElementSibling && e.target.nextElementSibling.classList.contains('cnh-aviso')) {
                            e.target.nextElementSibling.remove();
                        }
                        const avisoCNH = document.createElement('small');
                        avisoCNH.className = 'cnh-aviso';
                        avisoCNH.style.color = '#e74c3c';
                        avisoCNH.style.fontSize = '12px';
                        avisoCNH.style.marginTop = '5px';
                        avisoCNH.style.display = 'block';
                        avisoCNH.textContent = 'CNH não pode estar vencida';
                        e.target.parentNode.insertBefore(avisoCNH, e.target.nextSibling);
                        
                        // Remover aviso após 3 segundos
                        setTimeout(() => {
                            if (avisoCNH.parentNode) {
                                avisoCNH.remove();
                            }
                        }, 3000);
                    }
                }
                
                // Validar seguro vencido para campo de validade do seguro
                if (isValidadeSeguro) {
                    const dataDigitada = new Date(ano, mes - 1, dia);
                    const dataAtual = new Date();
                    
                    // Se a data digitada for menor que a data atual (seguro vencido)
                    if (dataDigitada < dataAtual) {
                        // Usar a data atual como valor mínimo
                        const diaAtual = String(dataAtual.getDate()).padStart(2, '0');
                        const mesAtual = String(dataAtual.getMonth() + 1).padStart(2, '0');
                        const anoAtual = dataAtual.getFullYear();
                        e.target.value = `${diaAtual}/${mesAtual}/${anoAtual}`;
                        
                        // Mostrar mensagem de aviso
                        if (e.target.nextElementSibling && e.target.nextElementSibling.classList.contains('seguro-aviso')) {
                            e.target.nextElementSibling.remove();
                        }
                        const avisoSeguro = document.createElement('small');
                        avisoSeguro.className = 'seguro-aviso';
                        avisoSeguro.style.color = '#e74c3c';
                        avisoSeguro.style.fontSize = '12px';
                        avisoSeguro.style.marginTop = '5px';
                        avisoSeguro.style.display = 'block';
                        avisoSeguro.textContent = 'Seguro não pode estar vencido';
                        e.target.parentNode.insertBefore(avisoSeguro, e.target.nextSibling);
                        
                        // Remover aviso após 3 segundos
                        setTimeout(() => {
                            if (avisoSeguro.parentNode) {
                                avisoSeguro.remove();
                            }
                        }, 3000);
                    }
                }
            }
        }
    });
}

/**
 * Validação de CNPJ em tempo real
 * @param {string} cnpj - CNPJ para validar
 * @returns {Object} - {valid: boolean, message: string}
 */
function validarCNPJ(cnpj) {
    // Remove caracteres não numéricos
    cnpj = cnpj.replace(/[^\d]/g, '');
    
    // Verifica se tem 14 dígitos
    if (cnpj.length !== 14) {
        return { valid: false, message: 'CNPJ deve ter 14 dígitos' };
    }
    
    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1{13}$/.test(cnpj)) {
        return { valid: false, message: 'CNPJ inválido - todos os dígitos são iguais' };
    }
    
    // Validação do primeiro dígito verificador
    let soma = 0;
    let peso = 5;
    
    for (let i = 0; i < 12; i++) {
        soma += parseInt(cnpj.charAt(i)) * peso;
        peso = peso === 2 ? 9 : peso - 1;
    }
    
    let resto = soma % 11;
    let digito1 = resto < 2 ? 0 : 11 - resto;
    
    if (parseInt(cnpj.charAt(12)) !== digito1) {
        return { valid: false, message: 'CNPJ inválido - primeiro dígito verificador incorreto' };
    }
    
    // Validação do segundo dígito verificador
    soma = 0;
    peso = 6;
    
    for (let i = 0; i < 13; i++) {
        soma += parseInt(cnpj.charAt(i)) * peso;
        peso = peso === 2 ? 9 : peso - 1;
    }
    
    resto = soma % 11;
    let digito2 = resto < 2 ? 0 : 11 - resto;
    
    if (parseInt(cnpj.charAt(13)) !== digito2) {
        return { valid: false, message: 'CNPJ inválido - segundo dígito verificador incorreto' };
    }
    
    return { valid: true, message: 'CNPJ válido' };
}

/**
 * Validação de placa de veículo (Mercosul e formato antigo)
 * @param {string} placa - Placa para validar
 * @returns {Object} - {valid: boolean, message: string, format: string}
 */
function validarPlaca(placa) {
    // Remove espaços e converte para maiúsculo
    placa = placa.replace(/\s/g, '').toUpperCase();
    
    // Formato antigo: ABC1234
    const formatoAntigo = /^[A-Z]{3}[0-9]{4}$/;
    
    // Formato Mercosul: ABC1D23
    const formatoMercosul = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;
    
    if (formatoAntigo.test(placa)) {
        return { 
            valid: true, 
            message: 'Placa válida (formato antigo)', 
            format: 'antigo' 
        };
    }
    
    if (formatoMercosul.test(placa)) {
        return { 
            valid: true, 
            message: 'Placa válida (formato Mercosul)', 
            format: 'mercosul' 
        };
    }
    
    // Verificar se está no formato parcial para dar feedback específico
    if (placa.length < 7) {
        return { 
            valid: false, 
            message: 'Placa incompleta. Formato: ABC1234 (antigo) ou ABC1D23 (Mercosul)', 
            format: 'incompleto' 
        };
    }
    
    if (placa.length > 7) {
        return { 
            valid: false, 
            message: 'Placa muito longa. Máximo 7 caracteres', 
            format: 'invalido' 
        };
    }
    
    return { 
        valid: false, 
        message: 'Formato de placa inválido. Use ABC1234 (antigo) ou ABC1D23 (Mercosul)', 
        format: 'invalido' 
    };
}

/**
 * Aplica máscara de CNPJ e validação em tempo real
 * @param {HTMLElement} elemento - Campo de input
 */
function aplicarMascaraCNPJ(elemento) {
    if (!elemento) return;
    
    // Aplicar máscara
    elemento.addEventListener('input', function(e) {
        let valor = e.target.value.replace(/[^\d]/g, '');
        
        // Aplicar máscara: 00.000.000/0000-00
        if (valor.length <= 14) {
            valor = valor.replace(/^(\d{2})(\d)/, '$1.$2');
            valor = valor.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
            valor = valor.replace(/\.(\d{3})(\d)/, '.$1/$2');
            valor = valor.replace(/(\d{4})(\d)/, '$1-$2');
        }
        
        e.target.value = valor;
        
        // Validar em tempo real se tiver 14 dígitos
        const apenasNumeros = valor.replace(/[^\d]/g, '');
        if (apenasNumeros.length === 14) {
            const validacao = validarCNPJ(apenasNumeros);
            mostrarFeedbackValidacao(elemento, validacao.valid, validacao.message);
        } else if (apenasNumeros.length > 0) {
            mostrarFeedbackValidacao(elemento, null, 'Digite o CNPJ completo para validar');
        } else {
            removerFeedbackValidacao(elemento);
        }
    });
}

/**
 * Aplica máscara de placa e validação em tempo real
 * @param {HTMLElement} elemento - Campo de input
 */
function aplicarMascaraPlaca(elemento) {
    if (!elemento) return;
    
    elemento.addEventListener('input', function(e) {
        let valor = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        
        // Limitar a 7 caracteres
        if (valor.length > 7) {
            valor = valor.substring(0, 7);
        }
        
        // Aplicar máscara baseada no formato
        if (valor.length >= 4) {
            // Detectar se é formato Mercosul ou antigo baseado no 5º caractere
            if (valor.length >= 5 && /[A-Z]/.test(valor.charAt(4))) {
                // Formato Mercosul: ABC1D23
                valor = valor.replace(/^([A-Z]{3})([0-9])([A-Z])([0-9]{0,2})/, '$1$2$3$4');
            } else {
                // Formato antigo: ABC1234
                valor = valor.replace(/^([A-Z]{3})([0-9]{0,4})/, '$1$2');
            }
        }
        
        e.target.value = valor;
        
        // Validar em tempo real
        if (valor.length >= 3) {
            const validacao = validarPlaca(valor);
            if (valor.length === 7) {
                mostrarFeedbackValidacao(elemento, validacao.valid, validacao.message);
            } else {
                mostrarFeedbackValidacao(elemento, null, 'Digite a placa completa para validar');
            }
        } else {
            removerFeedbackValidacao(elemento);
        }
    });
}

/**
 * Mostra feedback de validação para um campo
 * @param {HTMLElement} elemento - Campo de input
 * @param {boolean|null} isValid - true=válido, false=inválido, null=neutro
 * @param {string} message - Mensagem de feedback
 */
function mostrarFeedbackValidacao(elemento, isValid, message) {
    // Remove feedback anterior
    removerFeedbackValidacao(elemento);
    
    // Criar container de feedback
    const feedback = document.createElement('div');
    feedback.className = 'validacao-feedback';
    feedback.textContent = message;
    
    // Aplicar estilo baseado na validação
    if (isValid === true) {
        feedback.classList.add('valido');
        elemento.classList.add('campo-valido');
        elemento.classList.remove('campo-invalido');
    } else if (isValid === false) {
        feedback.classList.add('invalido');
        elemento.classList.add('campo-invalido');
        elemento.classList.remove('campo-valido');
    } else {
        feedback.classList.add('neutro');
        elemento.classList.remove('campo-valido', 'campo-invalido');
    }
    
    // Inserir feedback após o elemento
    elemento.parentNode.insertBefore(feedback, elemento.nextSibling);
}

/**
 * Remove feedback de validação de um campo
 * @param {HTMLElement} elemento - Campo de input
 */
function removerFeedbackValidacao(elemento) {
    const feedbackExistente = elemento.parentNode.querySelector('.validacao-feedback');
    if (feedbackExistente) {
        feedbackExistente.remove();
    }
    elemento.classList.remove('campo-valido', 'campo-invalido');
}

// ===== FUNCIONALIDADES AVANÇADAS =====

// Auto-preenchimento de endereço via CEP usando rota do backend
async function buscarEnderecoPorCEP(cep, sufixo = '', tentativa = 1) {
    try {
        // Remove caracteres não numéricos
        const cepLimpo = cep.replace(/\D/g, '');
        
        // Verifica se o CEP tem 8 dígitos
        if (cepLimpo.length !== 8) {
            throw new Error('CEP deve ter 8 dígitos');
        }
        
        // Validação básica de CEP (não pode ser 00000000 ou todos os dígitos iguais)
        if (cepLimpo === '00000000' || 
            cepLimpo === '11111111' || 
            cepLimpo === '22222222' || 
            cepLimpo === '33333333' || 
            cepLimpo === '44444444' || 
            cepLimpo === '55555555' || 
            cepLimpo === '66666666' || 
            cepLimpo === '77777777' || 
            cepLimpo === '88888888' || 
            cepLimpo === '99999999') {
            throw new Error('CEP inválido');
        }
        
        // Mostra feedback de carregamento
        const mensagemCarregamento = tentativa > 1 ? 
            `Buscando CEP... (tentativa ${tentativa})` : 
            'Buscando CEP...';
        mostrarFeedbackCEP(cep, 'loading', mensagemCarregamento, sufixo);
        
        // Faz requisição para a rota do backend com timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos
        
        const response = await fetch(`/api/cep/${cepLimpo}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.details || errorData.error || `Erro HTTP ${response.status}`;
            
            // Se for erro 404 (CEP não encontrado), não tenta novamente
            if (response.status === 404) {
                throw new Error(errorMessage);
            }
            
            // Para outros erros, permite retry
            if (tentativa < 3) {
                console.warn(`Tentativa ${tentativa} falhou, tentando novamente...`);
                await new Promise(resolve => setTimeout(resolve, 1000 * tentativa)); // Delay progressivo
                return buscarEnderecoPorCEP(cep, sufixo, tentativa + 1);
            }
            
            throw new Error(errorMessage);
        }
        
        const dados = await response.json();
        
        // Validação dos dados essenciais (localidade e UF são obrigatórios)
        if (!dados || !dados.localidade || !dados.uf) {
            throw new Error('CEP não encontrado ou dados incompletos');
        }
        
        // Preenche os campos automaticamente
        preencherCamposEndereco(dados, sufixo);
        
        // Mostra feedback de sucesso
        mostrarFeedbackCEP(cep, 'success', 'CEP encontrado! Endereço preenchido automaticamente.', sufixo);
        
        return dados;
    } catch (error) {
        console.error('Erro ao buscar CEP:', error);
        
        let mensagemErro = 'Erro ao buscar CEP';
        
        if (error.name === 'AbortError') {
            mensagemErro = 'Timeout: Verifique sua conexão e tente novamente';
        } else if (error.message.includes('CEP não encontrado')) {
            mensagemErro = 'CEP não encontrado. Verifique se está correto';
        } else if (error.message.includes('CEP inválido')) {
            mensagemErro = 'CEP inválido. Digite um CEP válido';
        } else if (error.message.includes('8 dígitos')) {
            mensagemErro = 'CEP deve ter 8 dígitos';
        } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            mensagemErro = 'Erro de conexão. Verifique sua internet';
        } else {
            mensagemErro = `${error.message}`;
        }
        
        mostrarFeedbackCEP(cep, 'error', mensagemErro, sufixo);
        return null;
    }
}


// Função para formatar nomes próprios (capitalizar primeira letra de cada palavra)
function formatarNomeProprio(texto) {
    if (!texto) return '';
    
    return texto
        .toLowerCase()
        .split(' ')
        .map(palavra => {
            // Lista de preposições e artigos que devem ficar em minúsculo
            const preposicoes = ['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'na', 'no', 'nas', 'nos', 'a', 'o', 'as', 'os'];
            
            // Se a palavra está na lista de preposições e não é a primeira palavra
            if (preposicoes.includes(palavra.toLowerCase()) && texto.split(' ').indexOf(palavra) !== 0) {
                return palavra.toLowerCase();
            }
            
            // Capitaliza a primeira letra
            return palavra.charAt(0).toUpperCase() + palavra.slice(1);
        })
        .join(' ');
}

function preencherCamposEndereco(dados, sufixo = '') {
    const campos = {
        rua: formatarNomeProprio(dados.logradouro),
        bairro: formatarNomeProprio(dados.bairro),
        cidade: formatarNomeProprio(dados.localidade),
        estado: dados.uf ? dados.uf.toUpperCase() : ''
    };
    
    Object.entries(campos).forEach(([campo, valor]) => {
        const elemento = document.getElementById(campo + sufixo);
        if (elemento && valor) {
            elemento.value = valor;
            // Dispara evento de input para atualizar validações
            elemento.dispatchEvent(new Event('input', { bubbles: true }));
        }
    });
}

function mostrarFeedbackCEP(cep, tipo, mensagem, sufixo = '') {
    const campoCEP = document.getElementById('cep' + sufixo);
    if (!campoCEP) return;
    
    // Remove feedback anterior
    removerFeedbackValidacao(campoCEP);
    
    // Determina o estado de validação baseado no tipo
    let isValid = null;
    if (tipo === 'success') {
        isValid = true;
    } else if (tipo === 'error') {
        isValid = false;
    } else if (tipo === 'loading') {
        isValid = null; // Estado neutro para loading
    }
    
    // Adiciona novo feedback
    mostrarFeedbackValidacao(campoCEP, isValid, mensagem);
    
    // Adiciona classe especial para loading
    if (tipo === 'loading') {
        const feedback = campoCEP.parentNode.querySelector('.validacao-feedback');
        if (feedback) {
            feedback.classList.add('loading');
        }
    }
}

function aplicarAutoPreenchimentoCEP(campo) {
    let timeoutId;
    let ultimoCepBuscado = '';
    let buscandoCEP = false;
    
    campo.addEventListener('input', function() {
        clearTimeout(timeoutId);
        
        const cep = this.value.replace(/\D/g, '');
        
        // Limpar feedback se CEP incompleto
        if (cep.length < 8) {
            const sufixo = this.id.replace('cep', '');
            const campoCEP = document.getElementById('cep' + sufixo);
            if (campoCEP) {
                removerFeedbackValidacao(campoCEP);
            }
            return;
        }
        
        // Se o CEP tem 8 dígitos e é diferente do último buscado
        if (cep.length === 8 && cep !== ultimoCepBuscado && !buscandoCEP) {
            timeoutId = setTimeout(() => {
                const sufixo = this.id.replace('cep', '');
                ultimoCepBuscado = cep;
                buscandoCEP = true;
                
                buscarEnderecoPorCEP(cep, sufixo).finally(() => {
                    buscandoCEP = false;
                });
            }, 800); // Aguarda 800ms após parar de digitar
        }
    });
    
    // Também permite busca manual ao sair do campo
    campo.addEventListener('blur', function() {
        clearTimeout(timeoutId);
        
        const cep = this.value.replace(/\D/g, '');
        if (cep.length === 8 && cep !== ultimoCepBuscado && !buscandoCEP) {
            const sufixo = this.id.replace('cep', '');
            ultimoCepBuscado = cep;
            buscandoCEP = true;
            
            buscarEnderecoPorCEP(cep, sufixo).finally(() => {
                buscandoCEP = false;
            });
        }
    });
    
    // Adicionar indicador visual quando estiver buscando
    campo.addEventListener('focus', function() {
        const cep = this.value.replace(/\D/g, '');
        if (cep.length === 8 && buscandoCEP) {
            const sufixo = this.id.replace('cep', '');
            mostrarFeedbackCEP(cep, 'loading', 'Buscando CEP...', sufixo);
        }
    });
}

// Validação avançada de telefone
function validarTelefone(telefone) {
    // Remove caracteres não numéricos
    const numeroLimpo = telefone.replace(/\D/g, '');
    
    // Verifica se é um número válido
    if (numeroLimpo.length < 10 || numeroLimpo.length > 11) {
        return {
            valido: false,
            mensagem: 'Telefone deve ter 10 ou 11 dígitos',
            tipo: 'fixo'
        };
    }
    
    // Verifica se é celular (9 dígitos após DDD) ou fixo (8 dígitos após DDD)
    const ddd = numeroLimpo.substring(0, 2);
    const numero = numeroLimpo.substring(2);
    
    // Lista de DDDs válidos no Brasil
    const dddsValidos = [
        '11', '12', '13', '14', '15', '16', '17', '18', '19', // SP
        '21', '22', '24', // RJ
        '27', '28', // ES
        '31', '32', '33', '34', '35', '37', '38', // MG
        '41', '42', '43', '44', '45', '46', // PR
        '47', '48', '49', // SC
        '51', '53', '54', '55', // RS
        '61', // DF
        '62', '64', // GO
        '63', // TO
        '65', '66', // MT
        '67', // MS
        '68', // AC
        '69', // RO
        '71', '73', '74', '75', '77', // BA
        '79', // SE
        '81', '87', // PE
        '82', // AL
        '83', // PB
        '84', // RN
        '85', '88', // CE
        '86', '89', // PI
        '91', '93', '94', // PA
        '92', '97', // AM
        '95', // RR
        '96', // AP
        '98', '99' // MA
    ];
    
    if (!dddsValidos.includes(ddd)) {
        return {
            valido: false,
            mensagem: 'DDD inválido',
            tipo: 'fixo'
        };
    }
    
    // Determina se é celular ou fixo
    const isCelular = numero.length === 9 && numero.startsWith('9');
    const isFixo = numero.length === 8 && !numero.startsWith('9');
    
    if (!isCelular && !isFixo) {
        return {
            valido: false,
            mensagem: isCelular ? 'Número de celular inválido' : 'Número de telefone inválido',
            tipo: numero.length === 9 ? 'celular' : 'fixo'
        };
    }
    
    return {
        valido: true,
        mensagem: `${isCelular ? 'Celular' : 'Telefone fixo'} válido`,
        tipo: isCelular ? 'celular' : 'fixo'
    };
}

// Máscara inteligente de telefone que detecta celular vs fixo
function aplicarMascaraTelefoneInteligente(campo) {
    campo.addEventListener('input', function() {
        let valor = this.value.replace(/\D/g, '');
        
        // Limita a 11 dígitos
        if (valor.length > 11) {
            valor = valor.substring(0, 11);
        }
        
        let valorFormatado = '';
        
        if (valor.length > 0) {
            // Adiciona parênteses no DDD
            if (valor.length <= 2) {
                valorFormatado = `(${valor}`;
            } else if (valor.length <= 6) {
                // Formato: (XX) XXXX
                valorFormatado = `(${valor.substring(0, 2)}) ${valor.substring(2)}`;
            } else if (valor.length <= 10) {
                // Formato: (XX) XXXX-XXXX (telefone fixo)
                valorFormatado = `(${valor.substring(0, 2)}) ${valor.substring(2, 6)}-${valor.substring(6)}`;
            } else {
                // Formato: (XX) 9XXXX-XXXX (celular)
                valorFormatado = `(${valor.substring(0, 2)}) ${valor.substring(2, 7)}-${valor.substring(7)}`;
            }
        }
        
        this.value = valorFormatado;
        
        // Valida o telefone em tempo real
        if (valor.length >= 10) {
            const validacao = validarTelefone(valor);
            mostrarFeedbackValidacao(this, validacao.valido, validacao.mensagem);
        } else {
            removerFeedbackValidacao(this);
        }
    });
}

// Validação avançada de CPF
function validarCPFCompleto(cpf) {
    // Remove caracteres não numéricos
    const cpfLimpo = cpf.replace(/\D/g, '');
    
    // Verifica se tem 11 dígitos
    if (cpfLimpo.length !== 11) {
        return { valido: false, mensagem: 'CPF deve ter 11 dígitos' };
    }
    
    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1{10}$/.test(cpfLimpo)) {
        return { valido: false, mensagem: 'CPF não pode ter todos os dígitos iguais' };
    }
    
    // Calcula o primeiro dígito verificador
    let soma = 0;
    for (let i = 0; i < 9; i++) {
        soma += parseInt(cpfLimpo.charAt(i)) * (10 - i);
    }
    let resto = 11 - (soma % 11);
    let digitoVerificador1 = resto < 2 ? 0 : resto;
    
    if (parseInt(cpfLimpo.charAt(9)) !== digitoVerificador1) {
        return { valido: false, mensagem: 'CPF inválido - primeiro dígito verificador incorreto' };
    }
    
    // Calcula o segundo dígito verificador
    soma = 0;
    for (let i = 0; i < 10; i++) {
        soma += parseInt(cpfLimpo.charAt(i)) * (11 - i);
    }
    resto = 11 - (soma % 11);
    let digitoVerificador2 = resto < 2 ? 0 : resto;
    
    if (parseInt(cpfLimpo.charAt(10)) !== digitoVerificador2) {
        return { valido: false, mensagem: 'CPF inválido - segundo dígito verificador incorreto' };
    }
    
    return { valido: true, mensagem: 'CPF válido' };
}

// Validação avançada de CNH
function validarCNH(cnh) {
    // Remove caracteres não numéricos
    const cnhLimpa = cnh.replace(/\D/g, '');
    
    // Verifica se tem 11 dígitos
    if (cnhLimpa.length !== 11) {
        return { valido: false, mensagem: 'CNH deve ter 11 dígitos' };
    }
    
    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1{10}$/.test(cnhLimpa)) {
        return { valido: false, mensagem: 'CNH não pode ter todos os dígitos iguais' };
    }
    
    // Algoritmo de validação da CNH
    let soma = 0;
    let sequencia = 0;
    
    // Calcula o primeiro dígito verificador
    for (let i = 0; i < 9; i++) {
        soma += parseInt(cnhLimpa.charAt(i)) * (9 - i);
    }
    
    let digitoVerificador1 = soma % 11;
    if (digitoVerificador1 >= 2) {
        digitoVerificador1 = 11 - digitoVerificador1;
    } else {
        digitoVerificador1 = 0;
    }
    
    if (parseInt(cnhLimpa.charAt(9)) !== digitoVerificador1) {
        return { valido: false, mensagem: 'CNH inválida - primeiro dígito verificador incorreto' };
    }
    
    // Calcula o segundo dígito verificador
    soma = 0;
    for (let i = 0; i < 9; i++) {
        soma += parseInt(cnhLimpa.charAt(i)) * (1 + i);
    }
    soma += digitoVerificador1 * 10;
    
    let digitoVerificador2 = soma % 11;
    if (digitoVerificador2 >= 2) {
        digitoVerificador2 = 11 - digitoVerificador2;
    } else {
        digitoVerificador2 = 0;
    }
    
    if (parseInt(cnhLimpa.charAt(10)) !== digitoVerificador2) {
        return { valido: false, mensagem: 'CNH inválida - segundo dígito verificador incorreto' };
    }
    
    return { valido: true, mensagem: 'CNH válida' };
}

// Aplicar máscara e validação de CNH
function aplicarMascaraCNH(campo) {
    campo.addEventListener('input', function() {
        let valor = this.value.replace(/\D/g, '');
        
        // Limita a 11 dígitos
        if (valor.length > 11) {
            valor = valor.substring(0, 11);
        }
        
        // Aplica a máscara: XXXXXXXXXXX
        this.value = valor;
        
        // Valida em tempo real
        if (valor.length === 11) {
            const validacao = validarCNH(valor);
            mostrarFeedbackValidacao(this, validacao.valido, validacao.mensagem);
        } else if (valor.length > 0) {
            mostrarFeedbackValidacao(this, false, `CNH deve ter 11 dígitos (${valor.length}/11)`);
        } else {
            removerFeedbackValidacao(this);
        }
    });
}

// Aplicar validação completa de CPF
function aplicarValidacaoCPFCompleta(campo) {
    campo.addEventListener('input', function() {
        const cpf = this.value.replace(/\D/g, '');
        
        if (cpf.length === 11) {
            const validacao = validarCPFCompleto(cpf);
            mostrarFeedbackValidacao(this, validacao.valido, validacao.mensagem);
        } else if (cpf.length > 0) {
            mostrarFeedbackValidacao(this, false, `CPF deve ter 11 dígitos (${cpf.length}/11)`);
        } else {
            removerFeedbackValidacao(this);
        }
    });
}

// Função principal para inicializar todas as máscaras
function inicializarMascaras() {
    try {
        // Aplicar máscaras para campos de telefone
        const camposTelefone = document.querySelectorAll('#celular, #telefone, #telefoneEmergencia, #telefoneEmpresa');
        camposTelefone.forEach(campo => {
            mascaraTelefone(campo);
        });
        
        // Aplicar máscaras para campos de CEP
        const camposCEP = document.querySelectorAll('#cep, #cepEmpresa');
        camposCEP.forEach(campo => {
            mascaraCEP(campo);
        });
        
        // Aplicar máscara para campo de CNPJ com validação em tempo real
        const camposCNPJ = document.querySelectorAll('#cnpj, #cnpjEmpresa');
        camposCNPJ.forEach(campo => {
            aplicarMascaraCNPJ(campo);
        });
        
        // Aplicar máscara para campo de placa com validação em tempo real
        const camposPlaca = document.querySelectorAll('#placa, #placaVeiculo');
        camposPlaca.forEach(campo => {
            aplicarMascaraPlaca(campo);
        });
        
        // Aplicar máscara para campo de RENAVAM
        const campoRENAVAM = document.querySelector('#renavam');
        if (campoRENAVAM) {
            mascaraRENAVAM(campoRENAVAM);
        }
        
        // Aplicar máscara para campo de CNH
        const campoCNH = document.querySelector('#cnhMotorista');
        if (campoCNH) {
            mascaraCNH(campoCNH);
        }
        
        // Aplicar máscara para campo de número de apólice
        const campoApolice = document.querySelector('#numeroApolice');
        if (campoApolice) {
            mascaraApolice(campoApolice);
        }
        
        // Aplicar máscara para campo de CPF
        const campoCPF = document.querySelector('#cpf');
        if (campoCPF) {
            mascaraCPF(campoCPF);
        }
        
        // Aplicar máscara para campos de email
        const camposEmail = document.querySelectorAll('#email, input[type="email"]');
        camposEmail.forEach(campo => {
            mascaraEmail(campo);
        });
        
        // Aplicar máscara para campos de complemento
        const camposComplemento = document.querySelectorAll('#complemento, #complementoEmpresa');
        camposComplemento.forEach(campo => {
            mascaraComplemento(campo);
        });
        
        // Aplicar máscaras para campos de endereço (rua, bairro, cidade)
        const camposEndereco = document.querySelectorAll('#rua, #bairro, #cidade, #ruaEmpresa, #bairroEmpresa, #cidadeEmpresa');
        camposEndereco.forEach(campo => {
            mascaraEndereco(campo);
        });
        
        // Aplicar máscaras para campos de nome
        const camposNome = document.querySelectorAll('#nome, #nomeMotorista, #nomeEmpresa, #nomeResponsavel, #nomeCompleto, #nomeEmergencia, #nomeSeguradora, #razaoSocial, #nomeFantasia');
        camposNome.forEach(campo => {
            mascaraNome(campo);
        });
        
        // Aplicar máscaras para campos numéricos
        const camposNumero = document.querySelectorAll('#numero, #numeroEmpresa, #anoFabricacao, #anoModelo, #capacidadePassageiros, #lotacaoMaxima');
        camposNumero.forEach(campo => {
            mascaraNumero(campo);
        });
        
        // Aplicar máscara para campo de cor
        const camposCor = document.querySelectorAll('#cor, #corVeiculo');
        camposCor.forEach(campo => {
            mascaraCor(campo);
        });
        
        // Aplicar máscaras para campos de data
        const camposData = document.querySelectorAll('input[type="date"], #dataNascimento, #validadeApolice, #validadeCNH, #validadeSeguro');
        camposData.forEach(campo => {
            // Alterar o tipo para text para permitir a aplicação da máscara
            campo.type = 'text';
            mascaraData(campo);
            
            // Adicionar placeholder para indicar o formato
            campo.placeholder = 'DD/MM/AAAA';
        });
        
        // Limitar caracteres para campos específicos
        const camposLimitados = [
            { selector: '#numero', maxLength: 10 },
            { selector: '#numeroEmpresa', maxLength: 10 },
            { selector: '#placa', maxLength: 7 },
            { selector: '#renavam', maxLength: 11 },
            { selector: '#cnhMotorista', maxLength: 11 },
            { selector: '#numeroApolice', maxLength: 20 },
            { selector: '#anoFabricacao', maxLength: 4 },
            { selector: '#anoModelo', maxLength: 4 },
            { selector: '#lotacaoMaxima', maxLength: 3 },
            { selector: '#nomeCompleto', maxLength: 100 },
            { selector: '#nomeEmergencia', maxLength: 100 },
            { selector: '#nomeSeguradora', maxLength: 100 },
            { selector: '#razaoSocial', maxLength: 100 },
            { selector: '#nomeFantasia', maxLength: 100 },
            { selector: '#rua', maxLength: 100 },
            { selector: '#bairro', maxLength: 50 },
            { selector: '#ruaEmpresa', maxLength: 100 },
            { selector: '#bairroEmpresa', maxLength: 50 },
            { selector: '#complemento', maxLength: 50 },
            { selector: '#complementoEmpresa', maxLength: 50 },
            { selector: '#corVeiculo', maxLength: 30 },
            { selector: '#email', maxLength: 100 }
        ];
        
        camposLimitados.forEach(campo => {
            const elementos = document.querySelectorAll(campo.selector);
            elementos.forEach(elemento => {
                limitarCaracteres(elemento, campo.maxLength);
            });
        });
        
        // Inicializar tooltips informativos para campos com validações especiais
        const camposComTooltips = [
            { selector: '#dataNascimento', tipo: 'dataNascimento' },
            { selector: '#validadeCNH', tipo: 'validadeCNH' },
            { selector: '#validadeSeguro', tipo: 'validadeSeguro' },
            { selector: '#email', tipo: 'email' },
            { selector: '#telefone', tipo: 'telefone' },
            { selector: '#telefoneEmergencia', tipo: 'telefone' },
            { selector: '#telefoneEmpresa', tipo: 'telefone' },
            { selector: '#cpf', tipo: 'cpf' },
            { selector: '#cpfMotorista', tipo: 'cpf' },
            { selector: '#cep', tipo: 'cep' },
            { selector: '#cepEmpresa', tipo: 'cep' }
        ];
        
        camposComTooltips.forEach(campo => {
             const elementos = document.querySelectorAll(campo.selector);
             elementos.forEach(elemento => {
                 adicionarTooltipInformativo(elemento, campo.tipo);
             });
         });
         
         // Inicializar indicadores visuais de campos obrigatórios vs opcionais
         adicionarIndicadoresCampos();
         
         // ===== INICIALIZAR FUNCIONALIDADES AVANÇADAS =====
         
         // Auto-preenchimento de CEP
         camposCEP.forEach(campo => {
             aplicarAutoPreenchimentoCEP(campo);
         });
         
         // Máscara inteligente de telefone
         camposTelefone.forEach(campo => {
             aplicarMascaraTelefoneInteligente(campo);
         });
         
         // Validação completa de CPF
         const camposCPF = document.querySelectorAll('#cpf, #cpfMotorista');
         camposCPF.forEach(campo => {
             aplicarValidacaoCPFCompleta(campo);
         });
         
         // Validação de CNH
         const camposCNH = document.querySelectorAll('#cnhMotorista, #cnh');
         camposCNH.forEach(campo => {
             aplicarMascaraCNH(campo);
         });
    } catch (erro) {
        console.error("Erro ao inicializar máscaras:", erro);
    }
}

// Inicializar as máscaras quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    // Aguardar um pouco para garantir que todos os elementos estejam prontos
    setTimeout(inicializarMascaras, 100);
});

// Também tentar inicializar quando a página estiver completamente carregada
window.addEventListener('load', function() {
    setTimeout(inicializarMascaras, 100);
});