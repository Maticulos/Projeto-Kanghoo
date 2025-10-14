const Koa = require('koa');
const KoaRouter = require('koa-router');
const json = require('koa-json');
const path = require('path');
const bcrypt = require('bcryptjs');
const koaBody = require('koa-bodyparser');
const jwt = require('jsonwebtoken');
const db = require('./db');
const serve = require('koa-static');

const app = new Koa();
const router = new KoaRouter();
const PORT = 5000;
const JWT_SECRET = 'sua_chave_secreta_super_segura';

// --- MIDDLEWARES ---
// A ordem é importante.

// 1. Servir arquivos da subpasta 'public' primeiro.
// O Koa vai procurar o index.html aqui e vai encontrá-lo na raiz.
app.use(serve(path.join(__dirname, '../frontend/public')));

// 2. Servir outros arquivos (css, js, imagens) da pasta 'frontend' principal.
// Se um arquivo não for encontrado em 'public', ele procura aqui.
app.use(serve(path.join(__dirname, '../frontend')));

// 3. Processar o corpo da requisição (para rotas de API como /login, /cadastrar)
app.use(koaBody());

// 4. Formatar a saída JSON de forma legível (pretty-print)
app.use(json());

// --- MIDDLEWARE DE AUTENTICAÇÃO ---
const autenticar = async (ctx, next) => {
    const authHeader = ctx.headers.authorization;
    if (!authHeader) {
        ctx.status = 401;
        ctx.body = { message: 'Token de autenticação não fornecido.' };
        return;
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        ctx.state.usuario = decoded;
        await next();
    } catch (err) {
        ctx.status = 401;
        ctx.body = { message: 'Token inválido ou expirado.' };
    }
};

// --- ROTAS DA API ---

router.post('/cadastrar', async ctx => {
    const { 
        tipoCadastro, nomeCompleto, email, senha, celular, dataNascimento, 
        placa, renavam, lotacaoMaxima,
        razaoSocial, cnpj, nomeFantasia
    } = ctx.request.body;

    if (!nomeCompleto || !email || !senha) {
        ctx.status = 400;
        ctx.body = { message: 'Nome, e-mail e senha são obrigatórios.' };
        return;
    }

    await db.query('BEGIN');
    try {
        const userExists = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            ctx.status = 409;
            ctx.body = { message: 'Este e-mail já está em uso.' };
            await db.query('ROLLBACK');
            return;
        }

        const senhaCrypt = await bcrypt.hash(senha, 10);
        const novoUsuarioQuery = `
            INSERT INTO usuarios (nome_completo, email, senha, celular, data_nascimento, tipo_cadastro) 
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`;
        const resUsuario = await db.query(novoUsuarioQuery, [
            nomeCompleto, email, senhaCrypt, celular, dataNascimento, tipoCadastro
        ]);
        const novoUsuarioId = resUsuario.rows[0].id;

        if (placa && renavam) {
            const novoVeiculoQuery = `
                INSERT INTO veiculos (usuario_id, placa, renavam, lotacao_maxima) 
                VALUES ($1, $2, $3, $4)`;
            await db.query(novoVeiculoQuery, [novoUsuarioId, placa, renavam, lotacaoMaxima]);
        }

        if (razaoSocial && cnpj) {
            const novaEmpresaQuery = `
                INSERT INTO empresas (usuario_id, razao_social, nome_fantasia, cnpj)
                VALUES ($1, $2, $3, $4)`;
            await db.query(novaEmpresaQuery, [novoUsuarioId, razaoSocial, nomeFantasia, cnpj]);
        }

        await db.query('COMMIT');
        ctx.status = 201;
        ctx.body = { message: 'Usuário cadastrado com sucesso!' };

    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Erro no cadastro:', error);
        ctx.status = 500;
        ctx.body = { message: 'Erro interno do servidor.' };
    }
});

router.post('/login', async ctx => {
    const { email, senha } = ctx.request.body;
    try {
        const result = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        const usuario = result.rows[0];

        if (usuario && await bcrypt.compare(senha, usuario.senha)) {
            let userRole = usuario.tipo_cadastro === 'excursao' ? 'motorista_excursao' : 'motorista_escolar';
            const token = jwt.sign(
                { id: usuario.id, nome: usuario.nome_completo, role: userRole },
                JWT_SECRET,
                { expiresIn: '1h' }
            );
            ctx.status = 200;
            ctx.body = { message: 'Login bem-sucedido!', token: token };
        } else {
            ctx.status = 401;
            ctx.body = { message: 'Usuário ou senha inválidos.' };
        }
    } catch (error) {
        console.error('Erro no login:', error);
        ctx.status = 500;
        ctx.body = { message: 'Erro interno do servidor.' };
    }
});

router.get('/api/dashboard', autenticar, async ctx => {
    ctx.status = 200;
    ctx.body = {
        message: "Dados do usuário carregados com sucesso!",
        usuario: { nome: ctx.state.usuario.nome }
    };
});

router.get('/api/motorista/profile', autenticar, async ctx => {
    try {
        const userId = ctx.state.usuario.id;
        const usuarioQuery = 'SELECT * FROM usuarios WHERE id = $1';
        const veiculoQuery = 'SELECT * FROM veiculos WHERE usuario_id = $1';
        const empresaQuery = 'SELECT * FROM empresas WHERE usuario_id = $1';

        const usuarioResult = await db.query(usuarioQuery, [userId]);
        const veiculoResult = await db.query(veiculoQuery, [userId]);
        const empresaResult = await db.query(empresaQuery, [userId]);

        if (usuarioResult.rows.length === 0) {
            ctx.status = 404;
            ctx.body = { message: "Usuário não encontrado." };
            return;
        }

        ctx.status = 200;
        ctx.body = {
            usuario: usuarioResult.rows[0],
            veiculo: veiculoResult.rows.length > 0 ? veiculoResult.rows[0] : null,
            empresa: empresaResult.rows.length > 0 ? empresaResult.rows[0] : null
        };

    } catch (error) {
        console.error("Erro ao buscar dados do perfil:", error);
        ctx.status = 500;
        ctx.body = { message: "Erro interno do servidor." };
    }
});

// --- INICIALIZAÇÃO DO SERVIDOR ---
app.use(router.routes()).use(router.allowedMethods());

const iniciarServidor = async () => {
    try {
        await db.criarTabelas();
        app.listen(PORT, () => {
            console.log(`Servidor rodando na porta ${PORT}`);
            console.log(`Acesse a aplicação em http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Erro ao iniciar o servidor:", error);
    }
};

iniciarServidor();