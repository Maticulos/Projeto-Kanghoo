const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');
const serve = require('koa-static');
const path = require('path');
const db = require('./db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = new Koa();
const router = new Router();
const SECRET_KEY = 'seu_segredo_super_secreto';

// Middlewares
app.use(bodyParser());
app.use(serve(path.join(__dirname, '..', 'frontend')));

// Rota de login
router.post('/login', async (ctx) => {
    const { email, senha } = ctx.request.body;

    if (!email || !senha) {
        ctx.status = 400;
        ctx.body = { message: 'E-mail e senha são obrigatórios.' };
        return;
    }

    try {
        const result = await db.query('SELECT id, nome_completo, senha, tipo_usuario FROM usuarios WHERE email = $1', [email]);
        const usuario = result.rows[0];

        // Se o usuário não for encontrado
        if (!usuario) {
            ctx.status = 401;
            // --- MENSAGEM ALTERADA AQUI ---
            ctx.body = { message: 'E-mail ou senha incorreta.' };
            return;
        }

        const senhaValida = await bcrypt.compare(senha, usuario.senha);
        // Se a senha for inválida
        if (!senhaValida) {
            ctx.status = 401;
            // --- MENSAGEM ALTERADA AQUI ---
            ctx.body = { message: 'E-mail ou senha incorreta.' };
            return;
        }

        const token = jwt.sign(
            { id: usuario.id, nome: usuario.nome_completo, role: usuario.tipo_usuario },
            SECRET_KEY,
            { expiresIn: '1h' }
        );

        ctx.body = { token };

    } catch (error) {
        console.error('Erro no login:', error);
        ctx.status = 500;
        ctx.body = { message: 'Erro interno do servidor.' };
    }
});

// (O restante do seu código server.js continua igual...)


// Rota de cadastro
router.post('/cadastrar', async (ctx) => {
    const dados = ctx.request.body;
    const { nomeCompleto, email, senha, tipoCadastro } = dados;

    if (!nomeCompleto || !email || !senha || !tipoCadastro) {
        ctx.status = 400;
        ctx.body = { message: "Campos essenciais não preenchidos." };
        return;
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const hashSenha = await bcrypt.hash(senha, salt);
        const tipoUsuario = tipoCadastro === 'escolar' ? 'motorista_escolar' : 'motorista_excursao';

        const result = await db.query(
            'INSERT INTO usuarios (nome_completo, email, senha, tipo_usuario) VALUES ($1, $2, $3, $4) RETURNING id',
            [nomeCompleto, email, hashSenha, tipoUsuario]
        );
        const usuarioId = result.rows[0].id;

        // Aqui você adicionaria a lógica para inserir os dados do veículo, etc.

        ctx.status = 201;
        ctx.body = { message: 'Cadastro realizado com sucesso!', usuarioId };

    } catch (error) {
        console.error('Erro ao cadastrar:', error);
        if (error.code === '23505') { // Código de erro para violação de unicidade (ex: email duplicado)
            ctx.status = 409;
            ctx.body = { message: 'Este e-mail já está em uso.' };
        } else {
            ctx.status = 500;
            ctx.body = { message: 'Erro interno ao realizar o cadastro.' };
        }
    }
});

// Middleware de verificação de JWT
const authenticateJWT = async (ctx, next) => {
    const authHeader = ctx.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        try {
            ctx.state.user = jwt.verify(token, SECRET_KEY);
            await next();
        } catch (err) {
            ctx.status = 401;
            ctx.body = { message: 'Token inválido ou expirado.' };
        }
    } else {
        ctx.status = 401;
        ctx.body = { message: 'Token de autenticação não fornecido.' };
    }
};


// Rota protegida de exemplo
router.get('/api/dashboard', authenticateJWT, async (ctx) => {
    // Se chegou até aqui, o token é válido.
    // ctx.state.user contém o payload do token (id, nome, role)
    ctx.body = {
        message: 'Bem-vindo ao Dashboard!',
        usuario: {
            id: ctx.state.user.id,
            nome: ctx.state.user.nome
        }
    };
});

// Rota para perfil do motorista
router.get('/api/motorista/profile', authenticateJWT, async (ctx) => {
    try {
        const usuarioId = ctx.state.user.id;
        
        // Busca dados do usuário
        const userResult = await db.query('SELECT nome_completo, email, celular FROM usuarios WHERE id = $1', [usuarioId]);
        if (userResult.rows.length === 0) {
            ctx.status = 404;
            ctx.body = { message: 'Usuário não encontrado.' };
            return;
        }
        
        // Busca dados do veículo associado ao usuário
        const vehicleResult = await db.query('SELECT placa, renavam, lotacao_maxima FROM veiculos WHERE motorista_id = $1', [usuarioId]);
        
        const profileData = {
            usuario: userResult.rows[0],
            veiculo: vehicleResult.rows.length > 0 ? vehicleResult.rows[0] : null
        };

        ctx.body = profileData;

    } catch (error) {
        console.error('Erro ao buscar perfil:', error);
        ctx.status = 500;
        ctx.body = { message: 'Erro interno ao buscar dados do perfil.' };
    }
});


// Redireciona para o local correto do index.html
router.get('/', (ctx) => {
    ctx.redirect('/public/index.html');
});

app.use(router.routes()).use(router.allowedMethods());

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});