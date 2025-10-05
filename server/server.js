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
        tipoCadastro,nomeCompleto, email, senha, celular, dataNascimento, 
        placa, renavam, lotacaoMaxima,
        razaoSocial, cnpj, nomeFantasia // Campos da empresa
    } = ctx.request.body;

    cnpjRegex = /^\d{2}\.\d{3}\.\d{3}\/\d{4}\-\d{2}$/
    if (!cnpjRegex.test(cnpj)) {
        ctx.status = 400
        ctx.body = { message: 'O CNPJ deve estar no formato XX.XXX.XXX/XXXX-XX.' }
        return
    }

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
            INSERT INTO usuarios (nome_completo, email, senha, celular, data_nascimento, tipo_cadastro) 
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`; // Adicionamos a nova coluna
        const resUsuario = await db.query(novoUsuarioQuery, [
            nomeCompleto, email, senhaCrypt, outrosDados.celular, outrosDados.dataNascimento, tipoCadastro // Passamos o valor
        ]);
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
    const { email, senha } = ctx.request.body; 
    
    try {
        // Pegamos também o tipo_cadastro do banco
        const result = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        const usuario = result.rows[0];

        if (usuario && await bcrypt.compare(senha, usuario.senha)) {
            let userRole = usuario.tipo_cadastro === 'excursao' ? 'motorista_excursao' : 'motorista_escolar';

            const token = jwt.sign(
                { id: usuario.id, nome: usuario.nome_completo, role: userRole }, // O papel agora é específico
                JWT_SECRET,
                { expiresIn: '1h' }
            );
            
            ctx.status = 200;
            ctx.body = { message: 'Login bem-sucedido!', token: token };
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
// API PARA BUSCAR DADOS DO PERFIL DO MOTORISTA
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
// Inicialização do servidor
app.use(router.routes()).use(router.allowedMethods());

const iniciarServidor = async () => {
  await db.criarTabelas(); // Garante que TODAS as tabelas existam antes de iniciar
  app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
  });
};

iniciarServidor();