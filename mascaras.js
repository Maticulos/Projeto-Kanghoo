// Arquivo de máscaras para campos de formulário

// Função genérica para aplicar máscaras
function aplicarMascara(input, mascara) {
    let valor = input.value.replace(/\D/g, ''); // Remove tudo que não é dígito
    let resultado = '';
    let index = 0;

    for (let i = 0; i < mascara.length && index < valor.length; i++) {
        if (mascara[i] === '#') {
            resultado += valor[index];
            index++;
        } else {
            resultado += mascara[i];
        }
    }

    input.value = resultado;
}

// Máscara para CPF: 000.000.000-00
function mascaraCPF(input) {
    let valor = input.value.replace(/\D/g, '');
    valor = valor.substring(0, 11); // Limita a 11 dígitos
    
    if (valor.length <= 11) {
        valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
        valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
        valor = valor.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    
    input.value = valor;
}

// Máscara para CNPJ: 00.000.000/0000-00
function mascaraCNPJ(input) {
    let valor = input.value.replace(/\D/g, '');
    valor = valor.substring(0, 14); // Limita a 14 dígitos
    
    if (valor.length <= 14) {
        valor = valor.replace(/^(\d{2})(\d)/, '$1.$2');
        valor = valor.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
        valor = valor.replace(/\.(\d{3})(\d)/, '.$1/$2');
        valor = valor.replace(/(\d{4})(\d)/, '$1-$2');
    }
    
    input.value = valor;
}

// Máscara para Celular: (00) 00000-0000
function mascaraCelular(input) {
    let valor = input.value.replace(/\D/g, '');
    valor = valor.substring(0, 11); // Limita a 11 dígitos
    
    if (valor.length <= 11) {
        valor = valor.replace(/^(\d{2})(\d)/, '($1) $2');
        valor = valor.replace(/(\d{5})(\d)/, '$1-$2');
    }
    
    input.value = valor;
}

// Máscara para Telefone Fixo: (00) 0000-0000
function mascaraTelefone(input) {
    let valor = input.value.replace(/\D/g, '');
    valor = valor.substring(0, 10); // Limita a 10 dígitos
    
    if (valor.length <= 10) {
        valor = valor.replace(/^(\d{2})(\d)/, '($1) $2');
        valor = valor.replace(/(\d{4})(\d)/, '$1-$2');
    }
    
    input.value = valor;
}

// Máscara para CEP: 00000-000
function mascaraCEP(input) {
    let valor = input.value.replace(/\D/g, '');
    valor = valor.substring(0, 8); // Limita a 8 dígitos
    
    if (valor.length <= 8) {
        valor = valor.replace(/^(\d{5})(\d)/, '$1-$2');
    }
    
    input.value = valor;
}

// Máscara para Placa (Mercosul): ABC1D23 ou ABC-1D23
function mascaraPlaca(input) {
    let valor = input.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    valor = valor.substring(0, 7); // Limita a 7 caracteres
    
    if (valor.length > 3) {
        valor = valor.replace(/^([A-Z]{3})([0-9])/, '$1-$2');
    }
    
    input.value = valor;
}

// Máscara para RENAVAM: 00000000000 (11 dígitos)
function mascaraRENAVAM(input) {
    let valor = input.value.replace(/\D/g, '');
    valor = valor.substring(0, 11); // Limita a 11 dígitos
    input.value = valor;
}

// Máscara para CNH: 00000000000 (11 dígitos)
function mascaraCNH(input) {
    let valor = input.value.replace(/\D/g, '');
    valor = valor.substring(0, 11); // Limita a 11 dígitos
    input.value = valor;
}

// Máscara para número de apólice (apenas números, até 20 dígitos)
function mascaraApolice(input) {
    let valor = input.value.replace(/\D/g, '');
    valor = valor.substring(0, 20); // Limita a 20 dígitos
    input.value = valor;
}

// Função para inicializar todas as máscaras
function inicializarMascaras() {
    // CPF
    const cpfInputs = document.querySelectorAll('input[name="cpf"]');
    cpfInputs.forEach(input => {
        input.addEventListener('input', () => mascaraCPF(input));
        input.setAttribute('maxlength', '14');
        input.setAttribute('placeholder', '000.000.000-00');
    });

    // CNPJ
    const cnpjInputs = document.querySelectorAll('input[name="cnpj"]');
    cnpjInputs.forEach(input => {
        input.addEventListener('input', () => mascaraCNPJ(input));
        input.setAttribute('maxlength', '18');
        input.setAttribute('placeholder', '00.000.000/0000-00');
    });

    // Celular
    const celularInputs = document.querySelectorAll('input[name="celular"], input[name="telefoneEmergencia"], input[name="telefoneEmpresa"]');
    celularInputs.forEach(input => {
        input.addEventListener('input', () => mascaraCelular(input));
        input.setAttribute('maxlength', '15');
        input.setAttribute('placeholder', '(00) 00000-0000');
    });

    // CEP
    const cepInputs = document.querySelectorAll('input[name="cep"], input[name="cepEmpresa"]');
    cepInputs.forEach(input => {
        input.addEventListener('input', () => mascaraCEP(input));
        input.setAttribute('maxlength', '9');
        input.setAttribute('placeholder', '00000-000');
    });

    // Placa
    const placaInputs = document.querySelectorAll('input[name="placa"]');
    placaInputs.forEach(input => {
        input.addEventListener('input', () => mascaraPlaca(input));
        input.setAttribute('maxlength', '8');
        input.setAttribute('placeholder', 'ABC-1234');
    });

    // RENAVAM
    const renavamInputs = document.querySelectorAll('input[name="renavam"]');
    renavamInputs.forEach(input => {
        input.addEventListener('input', () => mascaraRENAVAM(input));
        input.setAttribute('maxlength', '11');
        input.setAttribute('placeholder', '00000000000');
    });

    // CNH
    const cnhInputs = document.querySelectorAll('input[name="cnhMotorista"]');
    cnhInputs.forEach(input => {
        input.addEventListener('input', () => mascaraCNH(input));
        input.setAttribute('maxlength', '11');
        input.setAttribute('placeholder', '00000000000');
    });

    // Apólice
    const apoliceInputs = document.querySelectorAll('input[name="numeroApolice"]');
    apoliceInputs.forEach(input => {
        input.addEventListener('input', () => mascaraApolice(input));
        input.setAttribute('maxlength', '20');
    });
}

// Inicializa as máscaras quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarMascaras);
} else {
    inicializarMascaras();
}
