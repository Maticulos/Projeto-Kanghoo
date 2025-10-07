const Koa = require('koa');
const KoaRouter = require('koa-router'); 
const json = require('koa-json');
const views = require('koa-views');
const path = require('path');
const bcrypt = require('bcryptjs');
const koaBody = require('koa-bodyparser');
const jwt = require('jsonwebtoken');
const db = require('./db');
const serve = require('koa-static');
const send = require('koa-send'); // Importe o koa-send
const mount = require('koa-mount');

const app = new Koa();
const router = new KoaRouter();
const PORT = 5000;
const JWT_SECRET = 'sua_chave_secreta_super_segura';

// --- MIDDLEWARES ---
app.use(koaBody());
app.use(json());
app.use(views(path.join(__dirname, 'views'), { extension: 'ejs' }));

// Middleware para servir arquivos estáticos (CSS, JS, Imagens)
const frontendPath = path.join(__dirname, '..', 'frontend');

// Middleware para servir arquivos da pasta 'public' e 'auth' na raiz
app.use(serve(path.join(frontendPath, 'public')));
app.use(serve(path.join(frontendPath, 'auth')));

// Monta os diretórios de assets em seus respectivos caminhos
app.use(mount('/css', serve(path.join(frontendPath, 'css'))));
app.use(mount('/js', serve(path.join(frontendPath, 'js'))));
app.use(mount('/imagens', serve(path.join(frontendPath, 'imagens'))));

// --- ROTAS ---

// NOVA ROTA PRINCIPAL: Serve o arquivo index.html
router.get('/', async (ctx) => {
    // Pede ao 'koa-send' para encontrar e enviar o arquivo 'index.html'
    // que está dentro da pasta 'public'
    await send(ctx, 'index.html', { root: path.join(__dirname, '..', 'frontend', 'public') });
});

// Rota de Cadastro (API)
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

// Rota de Login (API)
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

// --- ROTAS PROTEGIDAS ---
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
        const [usuarioResult, veiculoResult, empresaResult] = await Promise.all([
            db.query('SELECT * FROM usuarios WHERE id = $1', [userId]),
            db.query('SELECT * FROM veiculos WHERE usuario_id = $1', [userId]),
            db.query('SELECT * FROM empresas WHERE usuario_id = $1', [userId])
        ]);

        if (usuarioResult.rows.length === 0) {
            ctx.status = 404;
            ctx.body = { message: "Usuário não encontrado."};
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

// --- INICIALIZAÇÃO ---
app.use(router.routes()).use(router.allowedMethods());

const iniciarServidor = async () => {
  try {
    await db.criarTabelas();
    app.listen(PORT, () => {
        console.log(`Servidor rodando na porta ${PORT}`);
    });
  } catch (error) {
    console.error("Erro ao iniciar o servidor ou criar tabelas:", error);
  }
};

iniciarServidor();