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

const app = new Koa();
const router = new KoaRouter();
const PORT = 5000;
const JWT_SECRET = 'sua_chave_secreta_super_segura';

// ORDEM CORRETA DOS MIDDLEWARES
app.use(serve(path.join(__dirname, '..'))); // 1. Tenta servir arquivos estáticos (HTML, CSS, imagens)
app.use(koaBody()); // 2. Se não for um arquivo, processa o corpo da requisição (JSON, formulários)
app.use(views(path.join(__dirname, 'views'), { extension: 'ejs' })); // 3. Habilita a renderização de views
app.use(json()); // 4. Formata a saída JSON de forma legível



// Middleware de autenticação com JWT
const autenticar = async (ctx, next) => {
    const authHeader = ctx.headers.authorization;
    if (!authHeader) {
        ctx.status = 401;
        ctx.body = { message: 'Token de autenticação não fornecido.' };
        // Em uma aplicação real, você poderia redirecionar para o login
        // ctx.redirect('/login');
        return;
    }

    const token = authHeader.split(' ')[1]; // Formato "Bearer TOKEN"
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        ctx.state.usuario = decoded; // Adiciona os dados do usuário ao contexto
        await next();
    } catch (err) {
        ctx.status = 401;
        ctx.body = { message: 'Token inválido ou expirado.' };
    }
};

// Rotas públicas
router.get('/', ctx => {
    ctx.body = 'Bem-vindo ao servidor';
});

router.get('/cadastrar', async ctx => {
    await ctx.render('cadastrar');
});

router.get('/login', async ctx => {
    await ctx.render('login');
});

router.post('/cadastrar', async ctx => {
    // Pegamos todos os dados possíveis de ambos os formulários
    const { 
        nomeCompleto, email, senha, celular, dataNascimento, 
        placa, renavam, lotacaoMaxima,
        razaoSocial, cnpj, nomeFantasia // Campos da empresa
    } = ctx.request.body;

    if (!nomeCompleto || !email || !senha) {
        ctx.status = 400;
        ctx.body = { message: 'Nome, e-mail e senha são obrigatórios.' };
        return;
    }

    // Inicia uma transação para garantir que tudo seja salvo ou nada seja salvo
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
            INSERT INTO usuarios (nome_completo, email, senha, celular, data_nascimento) 
            VALUES ($1, $2, $3, $4, $5) RETURNING id`;
        const resUsuario = await db.query(novoUsuarioQuery, [nomeCompleto, email, senhaCrypt, celular, dataNascimento]);
        const novoUsuarioId = resUsuario.rows[0].id;
        
        // Salva o veículo, se houver
        if (placa && renavam) {
            const novoVeiculoQuery = `
                INSERT INTO veiculos (usuario_id, placa, renavam, lotacao_maxima) 
                VALUES ($1, $2, $3, $4)`;
            await db.query(novoVeiculoQuery, [novoUsuarioId, placa, renavam, lotacaoMaxima]);
        }
        
        // **NOVO:** Salva a empresa, se houver dados de CNPJ e Razão Social
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

// Rota de Login 
router.post('/login', async ctx => {
    // 1. Mudamos de 'nome' para 'email' para corresponder ao que o frontend envia
    const { email, senha } = ctx.request.body; 
    
    try {
        // 2. Corrigimos a consulta SQL para buscar por 'email'
        const result = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        const usuario = result.rows[0];

        if (usuario && await bcrypt.compare(senha, usuario.senha)) {
            // Gera o token JWT
            const token = jwt.sign(
                { id: usuario.id, nome: usuario.nome_completo }, // Usamos nome_completo para o token
                JWT_SECRET,
                { expiresIn: '1h' } // Token expira em 1 hora
            );
            
            ctx.status = 200;
            ctx.body = {
                message: 'Login bem-sucedido!',
                token: token
            };
        } else {
            ctx.status = 401;
            // É melhor enviar um objeto JSON mesmo em caso de erro
            ctx.body = { message: 'Usuário ou senha inválidos.' };
        }
    } catch (error) {
        console.error('Erro no login:', error);
        ctx.status = 500;
        ctx.body = { message: 'Erro interno do servidor.' };
    }
});

// Rota protegida
router.get('/api/dashboard', autenticar, async ctx => {
    // O middleware 'autenticar' já validou o token e colocou os dados em ctx.state.usuario
    ctx.status = 200;
    ctx.body = {
        message: "Dados do usuário carregados com sucesso!",
        usuario: {
            nome: ctx.state.usuario.nome 
        }
    };
});
// Inicialização do servidor
app.use(router.routes()).use(router.allowedMethods());

const iniciarServidor = async () => {
  await db.criarTabelas(); // Garante que TODAS as tabelas existam antes de iniciar
  app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
  });
};

iniciarServidor();