/**
 * Arquivo de máscaras para os formulários
 * Implementa máscaras para campos como CPF, CNPJ, telefone, CEP, etc.
 */

// Função para aplicar máscara genérica
function aplicarMascara(input, mascara) {
    if (!input) {
        console.log("ERRO: Input não encontrado para máscara:", mascara);
        return;
    }
    
    console.log("Aplicando máscara", mascara, "para input:", input.id || input.name || "sem id");
    
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
    });
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

// Função para aplicar máscara de data (formato DD/MM/AAAA)
function mascaraData(input) {
    if (!input) return;
    
    // Verificar se é campo de data de nascimento
    const isDataNascimento = input.id === 'dataNascimento';
    
    input.addEventListener('input', function(e) {
        const valorAtual = e.target.value;
        let valor = valorAtual.replace(/\D/g, '');
        
        // Validar e corrigir o mês (entre 01 e 12)
        if (valor.length > 2) {
            const mes = parseInt(valor.substring(2, 4));
            if (mes > 12) {
                valor = valor.substring(0, 2) + '12' + valor.substring(4);
            } else if (mes === 0) {
                valor = valor.substring(0, 2) + '01' + valor.substring(4);
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
        
        // Validar data futura para campo de data de nascimento
        if (isDataNascimento && valor.length === 10) {
            const partes = valor.split('/');
            if (partes.length === 3) {
                const dia = parseInt(partes[0]);
                const mes = parseInt(partes[1]);
                const ano = parseInt(partes[2]);
                
                // Criar objeto de data
                const dataDigitada = new Date(ano, mes - 1, dia);
                const dataAtual = new Date();
                
                // Se a data digitada for maior que a data atual (data futura)
                if (dataDigitada > dataAtual) {
                    // Usar a data atual como valor máximo
                    const diaAtual = String(dataAtual.getDate()).padStart(2, '0');
                    const mesAtual = String(dataAtual.getMonth() + 1).padStart(2, '0');
                    const anoAtual = dataAtual.getFullYear();
                    valor = `${diaAtual}/${mesAtual}/${anoAtual}`;
                }
            }
        }
        
        if (e.target.value !== valor) {
            e.target.value = valor;
        }
    });
    
    // Adicionar validação no evento blur para verificar a data completa
    input.addEventListener('blur', function(e) {
        const valor = e.target.value;
        if (valor.length === 10 && isDataNascimento) {
            const partes = valor.split('/');
            if (partes.length === 3) {
                const dia = parseInt(partes[0]);
                const mes = parseInt(partes[1]);
                const ano = parseInt(partes[2]);
                
                // Criar objeto de data
                const dataDigitada = new Date(ano, mes - 1, dia);
                const dataAtual = new Date();
                
                // Se a data digitada for maior que a data atual (data futura)
                if (dataDigitada > dataAtual) {
                    // Usar a data atual como valor máximo
                    const diaAtual = String(dataAtual.getDate()).padStart(2, '0');
                    const mesAtual = String(dataAtual.getMonth() + 1).padStart(2, '0');
                    const anoAtual = dataAtual.getFullYear();
                    e.target.value = `${diaAtual}/${mesAtual}/${anoAtual}`;
                }
            }
        }
    });
}

// Função para inicializar todas as máscaras
function inicializarMascaras() {
    try {
        console.log("=== INICIANDO MÁSCARAS ===");
        console.log("DOM carregado:", document.readyState);
        
        // Verificar se existem campos na página
        const todosCampos = document.querySelectorAll('input[type="text"], input[type="tel"], input[type="email"]');
        console.log("Total de campos encontrados:", todosCampos.length);
        
        // Aplicar máscaras para campos de telefone
        const camposTelefone = document.querySelectorAll('#celular, #telefone, #telefoneEmergencia, #telefoneEmpresa');
        console.log("Campos de telefone encontrados:", camposTelefone.length);
        camposTelefone.forEach(campo => {
            console.log("Aplicando máscara de telefone para:", campo.id, campo);
            mascaraTelefone(campo);
        });
        
        // Aplicar máscaras para campos de CEP
        const camposCEP = document.querySelectorAll('#cep, #cepEmpresa');
        camposCEP.forEach(campo => {
            console.log("Aplicando máscara de CEP para:", campo.id);
            mascaraCEP(campo);
        });
        
        // Aplicar máscara para campo de CNPJ
        const campoCNPJ = document.querySelector('#cnpj');
        if (campoCNPJ) {
            console.log("Aplicando máscara de CNPJ");
            mascaraCNPJ(campoCNPJ);
        }
        
        // Aplicar máscara para campo de placa
        const campoPlaca = document.querySelector('#placa');
        if (campoPlaca) {
            console.log("Aplicando máscara de placa");
            mascaraPlaca(campoPlaca);
        }
        
        // Aplicar máscara para campo de RENAVAM
        const campoRENAVAM = document.querySelector('#renavam');
        if (campoRENAVAM) {
            console.log("Aplicando máscara de RENAVAM");
            mascaraRENAVAM(campoRENAVAM);
        }
        
        // Aplicar máscara para campo de CNH
        const campoCNH = document.querySelector('#cnhMotorista');
        if (campoCNH) {
            console.log("Aplicando máscara de CNH");
            mascaraCNH(campoCNH);
        }
        
        // Aplicar máscara para campo de número de apólice
        const campoApolice = document.querySelector('#numeroApolice');
        if (campoApolice) {
            console.log("Aplicando máscara de apólice");
            mascaraApolice(campoApolice);
        }
        
        // Aplicar máscara para campo de CPF
        const campoCPF = document.querySelector('#cpf');
        if (campoCPF) {
            console.log("Aplicando máscara de CPF");
            mascaraCPF(campoCPF);
        }
        
        // Aplicar máscara para campos de email
        const camposEmail = document.querySelectorAll('#email, input[type="email"]');
        camposEmail.forEach(campo => {
            console.log("Aplicando máscara de email para:", campo.id);
            mascaraEmail(campo);
        });
        
        // Aplicar máscara para campos de complemento
        const camposComplemento = document.querySelectorAll('#complemento, #complementoEmpresa');
        camposComplemento.forEach(campo => {
            console.log("Aplicando máscara de complemento para:", campo.id);
            mascaraComplemento(campo);
        });
        
        // Aplicar máscaras para campos de nome
        const camposNome = document.querySelectorAll('#nome, #nomeMotorista, #nomeEmpresa, #nomeResponsavel, #nomeCompleto, #nomeEmergencia, #rua, #bairro, #ruaEmpresa, #bairroEmpresa, #nomeSeguradora, #razaoSocial, #nomeFantasia');
        camposNome.forEach(campo => {
            console.log("Aplicando máscara de nome para:", campo.id);
            mascaraNome(campo);
        });
        
        // Aplicar máscaras para campos numéricos
        const camposNumero = document.querySelectorAll('#numero, #numeroEmpresa, #anoFabricacao, #anoModelo, #capacidadePassageiros, #lotacaoMaxima');
        camposNumero.forEach(campo => {
            console.log("Aplicando máscara de número para:", campo.id);
            mascaraNumero(campo);
        });
        
        // Aplicar máscara para campo de cor
        const camposCor = document.querySelectorAll('#cor, #corVeiculo');
        camposCor.forEach(campo => {
            console.log("Aplicando máscara de cor para:", campo.id);
            mascaraCor(campo);
        });
        
        // Aplicar máscaras para campos de data
        const camposData = document.querySelectorAll('input[type="date"], #dataNascimento, #validadeApolice, #validadeCNH, #validadeSeguro');
        camposData.forEach(campo => {
            // Alterar o tipo para text para permitir a aplicação da máscara
            campo.type = 'text';
            console.log("Aplicando máscara de data para:", campo.id);
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
                console.log("Limitando caracteres para:", elemento.id, "max:", campo.maxLength);
                limitarCaracteres(elemento, campo.maxLength);
            });
        });
        
        console.log("Máscaras inicializadas com sucesso!");
    } catch (erro) {
        console.error("Erro ao inicializar máscaras:", erro);
    }
}

// Inicializar as máscaras quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOMContentLoaded disparado");
    // Aguardar um pouco para garantir que todos os elementos estejam prontos
    setTimeout(inicializarMascaras, 100);
});

// Também tentar inicializar quando a página estiver completamente carregada
window.addEventListener('load', function() {
    console.log("Window load disparado");
    setTimeout(inicializarMascaras, 100);
});