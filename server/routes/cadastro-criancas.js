const Router = require('koa-router');
const db = require('../config/db');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

const router = new Router();

// Função para validar CPF
function validarCPF(cpf) {
    cpf = cpf.replace(/[^\d]+/g, '');
    
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
        return false;
    }
    
    let soma = 0;
    for (let i = 0; i < 9; i++) {
        soma += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let resto = 11 - (soma % 11);
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.charAt(9))) return false;
    
    soma = 0;
    for (let i = 0; i < 10; i++) {
        soma += parseInt(cpf.charAt(i)) * (11 - i);
    }
    resto = 11 - (soma % 11);
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.charAt(10))) return false;
    
    return true;
}

// Função para gerar senha aleatória
function gerarSenha() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let senha = '';
    for (let i = 0; i < 8; i++) {
        senha += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return senha;
}

// Função para calcular idade
function calcularIdade(dataNascimento) {
    const hoje = new Date();
    const nascimento = new Date(dataNascimento);
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const mes = hoje.getMonth() - nascimento.getMonth();
    
    if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
        idade--;
    }
    
    return idade;
}

// Configuração do nodemailer (simulação)
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: 'sistema@transporteescolar.com',
        pass: 'senha_do_email'
    }
});

// Função para enviar email de boas-vindas
async function enviarEmailBoasVindas(emailResponsavel, nomeResponsavel, nomeCrianca, email, senha) {
    const htmlEmail = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .credentials { background: #fff; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🚌 Bem-vindo ao Transporte Escolar!</h1>
                <p>Cadastro realizado com sucesso</p>
            </div>
            <div class="content">
                <h2>Olá, ${nomeResponsavel}!</h2>
                <p>É com grande alegria que informamos que o cadastro de <strong>${nomeCrianca}</strong> foi realizado com sucesso em nosso sistema de transporte escolar!</p>
                
                <div class="credentials">
                    <h3>🔐 Seus dados de acesso:</h3>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Senha:</strong> ${senha}</p>
                    <p><em>Por favor, guarde essas informações em local seguro.</em></p>
                </div>
                
                <p>Com essas credenciais, você poderá:</p>
                <ul>
                    <li>📍 Acompanhar a localização do transporte em tempo real</li>
                    <li>📋 Visualizar o histórico de viagens</li>
                    <li>📞 Entrar em contato com o motorista</li>
                    <li>📊 Acessar relatórios de frequência</li>
                    <li>⚙️ Gerenciar informações do seu filho(a)</li>
                </ul>
                
                <a href="file:///C:/Users/Mateus/Desktop/Teste%20Backend%20Koa/teste/frontend/auth/area-responsavel.html" class="button">
                    Acessar Área do Responsável
                </a>
                
                <p><strong>Importante:</strong> Recomendamos que você altere sua senha no primeiro acesso para maior segurança.</p>
                
                <div class="footer">
                    <p>Em caso de dúvidas, entre em contato conosco:</p>
                    <p>📧 suporte@transporteescolar.com | 📱 (11) 99999-9999</p>
                    <p><em>Este é um email automático, não responda.</em></p>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;

    try {
        // Simulação de envio de email (em produção, descomente as linhas abaixo)
        /*
        await transporter.sendMail({
            from: '"Transporte Escolar" <sistema@transporteescolar.com>',
            to: emailResponsavel,
            subject: `🚌 Bem-vindo! Cadastro de ${nomeCrianca} realizado com sucesso`,
            html: htmlEmail
        });
        */
        
        console.log(`📧 Email enviado para: ${emailResponsavel}`);
        console.log(`👤 Responsável: ${nomeResponsavel}`);
        console.log(`👶 Criança: ${nomeCrianca}`);
        console.log(`🔐 Credenciais: ${email} / ${senha}`);
        
        return true;
    } catch (error) {
        console.error('Erro ao enviar email:', error);
        return false;
    }
}

// Função para enviar mensagem WhatsApp (simulação)
async function enviarWhatsApp(telefone, nomeResponsavel, nomeCrianca, email, senha) {
    const mensagem = `
🚌 *TRANSPORTE ESCOLAR* 🚌

Olá, ${nomeResponsavel}! 

✅ O cadastro de *${nomeCrianca}* foi realizado com sucesso!

🔐 *Seus dados de acesso:*
📧 Email: ${email}
🔑 Senha: ${senha}

🌐 Acesse sua área: 
https://transporteescolar.com/area-responsavel

📱 Com o acesso você poderá:
• Acompanhar localização em tempo real
• Ver histórico de viagens  
• Contatar o motorista
• Acessar relatórios

⚠️ *Importante:* Altere sua senha no primeiro acesso!

Em caso de dúvidas: (11) 99999-9999
    `.trim();

    try {
        // Simulação de envio WhatsApp (em produção, integrar com API do WhatsApp)
        console.log(`📱 WhatsApp enviado para: ${telefone}`);
        console.log(`Mensagem: ${mensagem}`);
        
        return true;
    } catch (error) {
        console.error('Erro ao enviar WhatsApp:', error);
        return false;
    }
}

// Rota para cadastrar criança
router.post('/api/criancas/cadastrar', async (ctx) => {
    try {
        const {
            nome_completo,
            data_nascimento,
            cpf,
            endereco_residencial,
            escola,
            endereco_escola,
            nome_responsavel,
            telefone_responsavel,
            telefone_responsavel_secundario,
            email_responsavel,
            foto_url,
            observacoes_medicas,
            contato_emergencia_nome,
            contato_emergencia_telefone,
            motorista_id,
            rota_id
        } = ctx.request.body;

        // Validações obrigatórias
        if (!nome_completo || !data_nascimento || !cpf || !nome_responsavel || 
            !telefone_responsavel || !email_responsavel || !endereco_residencial || 
            !escola || !endereco_escola) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                message: 'Campos obrigatórios: nome_completo, data_nascimento, cpf, nome_responsavel, telefone_responsavel, email_responsavel, endereco_residencial, escola, endereco_escola'
            };
            return;
        }

        // Validar CPF
        if (!validarCPF(cpf)) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                message: 'CPF inválido. O CPF é obrigatório e deve ser válido.'
            };
            return;
        }

        // Verificar se CPF já existe
        const cpfExistente = await db.query('SELECT id FROM criancas WHERE cpf = $1', [cpf.replace(/[^\d]+/g, '')]);
        if (cpfExistente.rows.length > 0) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                message: 'CPF já cadastrado no sistema.'
            };
            return;
        }

        // Verificar se email já existe
        const emailExistente = await db.query('SELECT id FROM criancas WHERE email_responsavel = $1', [email_responsavel]);
        if (emailExistente.rows.length > 0) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                message: 'Email do responsável já cadastrado no sistema.'
            };
            return;
        }

        // Calcular idade
        const idade = calcularIdade(data_nascimento);

        // Gerar senha para o responsável
        const senhaGerada = gerarSenha();
        const senhaHash = await bcrypt.hash(senhaGerada, 10);

        // Inserir criança no banco
        const resultado = await db.query(`
            INSERT INTO criancas (
                nome_completo, data_nascimento, cpf, idade, endereco_residencial, 
                escola, endereco_escola, nome_responsavel, telefone_responsavel, 
                telefone_responsavel_secundario, email_responsavel, foto_url, 
                observacoes_medicas, contato_emergencia_nome, contato_emergencia_telefone,
                senha_responsavel, motorista_id, rota_id, ativo, criado_em, atualizado_em
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, true, NOW(), NOW()
            ) RETURNING *
        `, [
            nome_completo, data_nascimento, cpf.replace(/[^\d]+/g, ''), idade, 
            endereco_residencial, escola, endereco_escola, nome_responsavel, 
            telefone_responsavel, telefone_responsavel_secundario, email_responsavel, 
            foto_url, observacoes_medicas, contato_emergencia_nome, 
            contato_emergencia_telefone, senhaHash, motorista_id, rota_id
        ]);

        const criancaCadastrada = resultado.rows[0];

        // Enviar notificações
        const emailEnviado = await enviarEmailBoasVindas(
            email_responsavel, 
            nome_responsavel, 
            nome_completo, 
            email_responsavel, 
            senhaGerada
        );

        const whatsappEnviado = await enviarWhatsApp(
            telefone_responsavel, 
            nome_responsavel, 
            nome_completo, 
            email_responsavel, 
            senhaGerada
        );

        ctx.status = 201;
        ctx.body = {
            success: true,
            message: 'Criança cadastrada com sucesso!',
            data: {
                id: criancaCadastrada.id,
                nome_completo: criancaCadastrada.nome_completo,
                cpf: criancaCadastrada.cpf,
                idade: criancaCadastrada.idade,
                responsavel: {
                    nome: criancaCadastrada.nome_responsavel,
                    email: criancaCadastrada.email_responsavel,
                    telefone: criancaCadastrada.telefone_responsavel
                },
                credenciais_enviadas: {
                    email: emailEnviado,
                    whatsapp: whatsappEnviado
                },
                criado_em: criancaCadastrada.criado_em
            }
        };

    } catch (error) {
        console.error('Erro ao cadastrar criança:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        };
    }
});

// Rota para listar crianças
router.get('/api/criancas', async (ctx) => {
    try {
        const resultado = await db.query(`
            SELECT 
                id, nome_completo, cpf, idade, escola, nome_responsavel, 
                telefone_responsavel, email_responsavel, ativo, criado_em
            FROM criancas 
            ORDER BY criado_em DESC
        `);

        ctx.body = {
            success: true,
            data: resultado.rows,
            total: resultado.rows.length
        };
    } catch (error) {
        console.error('Erro ao listar crianças:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: 'Erro ao listar crianças',
            error: error.message
        };
    }
});

// Rota para buscar criança por CPF
router.get('/api/criancas/cpf/:cpf', async (ctx) => {
    try {
        const { cpf } = ctx.params;
        const cpfLimpo = cpf.replace(/[^\d]+/g, '');

        const resultado = await db.query('SELECT * FROM criancas WHERE cpf = $1', [cpfLimpo]);

        if (resultado.rows.length === 0) {
            ctx.status = 404;
            ctx.body = {
                success: false,
                message: 'Criança não encontrada'
            };
            return;
        }

        const crianca = resultado.rows[0];
        // Não retornar a senha hash por segurança
        delete crianca.senha_responsavel;

        ctx.body = {
            success: true,
            data: crianca
        };
    } catch (error) {
        console.error('Erro ao buscar criança:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: 'Erro ao buscar criança',
            error: error.message
        };
    }
});

module.exports = router;