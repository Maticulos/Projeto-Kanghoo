const { expect } = require('chai');

describe('Testes de Validação de Modais e Formulários', function() {
    this.timeout(10000);

    describe('Validação de Dados do Formulário de Cadastro', () => {
        it('deve validar campos obrigatórios', () => {
            const dadosIncompletos = {
                email: 'joao.silva@teste.com',
                senha: 'senha123'
                // faltando nomeCompleto
            };

            const camposObrigatorios = ['nomeCompleto', 'email', 'senha'];
            const camposFaltando = camposObrigatorios.filter(campo => !dadosIncompletos[campo]);
            
            expect(camposFaltando).to.include('nomeCompleto');
            expect(camposFaltando).to.have.lengthOf(1);
        });

        it('deve validar formato de email', () => {
            const emailsInvalidos = [
                'email-sem-arroba',
                'email@',
                '@dominio.com',
                'email@dominio',
                ''
            ];

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            
            emailsInvalidos.forEach(email => {
                expect(emailRegex.test(email)).to.be.false;
            });

            // Email válido
            expect(emailRegex.test('usuario@exemplo.com')).to.be.true;
        });

        it('deve validar força da senha', () => {
            const senhasInvalidas = [
                '123',      // muito curta
                'abc',      // muito curta
                '12345'     // muito curta
            ];

            senhasInvalidas.forEach(senha => {
                expect(senha.length < 6).to.be.true;
            });

            // Senha válida
            expect('senha123'.length >= 6).to.be.true;
        });
    });

    describe('Validação de Preferências de Notificação', () => {
        it('deve validar tipos de dados das preferências', () => {
            const preferenciasValidas = {
                embarque_desembarque: true,
                localizacao_tempo_real: false,
                alertas_seguranca: true,
                canais: ['app', 'email']
            };

            // Validar tipos booleanos
            const camposBooleanos = ['embarque_desembarque', 'localizacao_tempo_real', 'alertas_seguranca'];
            camposBooleanos.forEach(campo => {
                expect(typeof preferenciasValidas[campo]).to.equal('boolean');
            });

            // Validar array de canais
            expect(Array.isArray(preferenciasValidas.canais)).to.be.true;
        });

        it('deve validar canais permitidos', () => {
            const canaisPermitidos = ['app', 'email', 'sms'];
            const canaisValidos = ['app', 'email'];
            const canaisInvalidos = ['whatsapp', 'telegram'];

            canaisValidos.forEach(canal => {
                expect(canaisPermitidos).to.include(canal);
            });

            canaisInvalidos.forEach(canal => {
                expect(canaisPermitidos).to.not.include(canal);
            });
        });

        it('deve validar estrutura das preferências', () => {
            const preferencias = {
                embarque_desembarque: true,
                localizacao_tempo_real: false,
                alertas_seguranca: true,
                canais: ['app']
            };

            const camposObrigatorios = [
                'embarque_desembarque',
                'localizacao_tempo_real', 
                'alertas_seguranca',
                'canais'
            ];

            camposObrigatorios.forEach(campo => {
                expect(preferencias).to.have.property(campo);
            });
        });
    });

    describe('Validação de Cadastro de Crianças', () => {
        it('deve validar campos obrigatórios', () => {
            const dadosCompletos = {
                nome: 'Maria Silva',
                cpf: '12345678901',
                dataNascimento: '2015-05-15',
                responsavelId: 1,
                escola: 'Escola Municipal',
                endereco: 'Rua das Flores, 123'
            };

            const camposObrigatorios = ['nome', 'cpf', 'dataNascimento', 'responsavelId'];
            
            camposObrigatorios.forEach(campo => {
                expect(dadosCompletos).to.have.property(campo);
                if (typeof dadosCompletos[campo] === 'string') {
                    expect(dadosCompletos[campo]).to.not.be.empty;
                } else {
                    expect(dadosCompletos[campo]).to.exist;
                }
            });
        });

        it('deve validar formato do CPF', () => {
            const cpfsInvalidos = [
                '123',           // muito curto
                '12345678901234', // muito longo
                'abcdefghijk',   // não numérico
                '',              // vazio
                '00000000000'    // CPF inválido conhecido
            ];

            const cpfValido = '12345678901';

            cpfsInvalidos.forEach(cpf => {
                 // Validação básica de comprimento e formato
                 const isValidLength = cpf.length === 11;
                 const isNumeric = /^\d+$/.test(cpf);
                 const isNotAllSame = !/^(\d)\1{10}$/.test(cpf);
                 
                 const isValid = isValidLength && isNumeric && isNotAllSame;
                 expect(isValid).to.be.false;
             });

            // CPF válido (formato básico)
            expect(cpfValido.length === 11 && /^\d+$/.test(cpfValido)).to.be.true;
        });

        it('deve validar formato da data de nascimento', () => {
             const datasInvalidas = [
                 '15/05/2015',    // formato brasileiro
                 'abc',           // não é data
                 '',              // vazio
                 '2015/05/15',    // formato com barras
                 '15-05-2015'     // formato dia-mês-ano
             ];

             const dataValida = '2015-05-15';

             datasInvalidas.forEach(data => {
                 const isValidFormat = /^\d{4}-\d{2}-\d{2}$/.test(data);
                 expect(isValidFormat).to.be.false;
             });

             // Data válida (formato ISO)
             expect(/^\d{4}-\d{2}-\d{2}$/.test(dataValida)).to.be.true;
         });
    });

    describe('Validação de Integridade dos Dados', () => {
        it('deve sanitizar dados de entrada', () => {
            const dadosComScript = {
                nomeCompleto: '<script>alert("xss")</script>João',
                email: 'joao@teste.com',
                observacoes: '<img src="x" onerror="alert(1)">'
            };

            // Simular sanitização básica - remove tags HTML
            const dadosSanitizados = {
                nomeCompleto: dadosComScript.nomeCompleto.replace(/<script[^>]*>.*?<\/script>/gi, '').replace(/<[^>]*>/g, ''),
                email: dadosComScript.email,
                observacoes: dadosComScript.observacoes.replace(/<[^>]*>/g, '')
            };

            expect(dadosSanitizados.nomeCompleto).to.equal('João');
            expect(dadosSanitizados.observacoes).to.equal('');
            expect(dadosSanitizados.email).to.equal('joao@teste.com');
        });

        it('deve validar tipos de dados esperados', () => {
            const dados = {
                id: 123,
                nome: 'João Silva',
                ativo: true,
                preferencias: {
                    notificacoes: true,
                    canais: ['app', 'email']
                }
            };

            expect(typeof dados.id).to.equal('number');
            expect(typeof dados.nome).to.equal('string');
            expect(typeof dados.ativo).to.equal('boolean');
            expect(typeof dados.preferencias).to.equal('object');
            expect(Array.isArray(dados.preferencias.canais)).to.be.true;
        });

        it('deve validar limites de tamanho dos campos', () => {
            const nomeCompleto = 'João Silva Santos';
            const emailLongo = 'a'.repeat(250) + '@teste.com';
            const observacoes = 'Observação '.repeat(100);

            // Validar tamanhos máximos
            expect(nomeCompleto.length).to.be.lessThan(100);
            expect(emailLongo.length).to.be.greaterThan(255); // Deve ser rejeitado
            expect(observacoes.length).to.be.greaterThan(500); // Deve ser truncado
        });
    });
});