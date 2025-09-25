const Koa = require('koa')
const KoaRouter = require('koa-router')
const json = require('koa-json')
const views = require('koa-views')
const path = require('path')
const bcrypt = require('bcryptjs')
const koaBody = require('koa-bodyparser')
const session = require('koa-session')

const app = new Koa()
const router = new KoaRouter()
const PORT = 5000
const nome = 'Joao'

app.keys = ['chave']

app.use(session(app))
app.use(koaBody())
app.use(views(path.join(__dirname, 'views'), { extension: 'ejs' }))
app.use(json())

// Simulação de banco de dados
const usuarios = []

const autenticou = async (ctx, next) => {
    if (ctx.session.usuario) {
        await next()
    } else {
        ctx.redirect('/login')
    }
}

// Middleware para Mocks
const useMocks = process.env.USE_MOCKS === 'true';

const mockMiddleware = async (ctx, next) => {
    if (useMocks) {
        const mockFilePath = path.join(__dirname, 'mocks', `${ctx.path.substring(1)}.json`);
        try {
            const mockData = await fs.promises.readFile(mockFilePath, 'utf8');
            ctx.status = 200; // Simula sucesso, ou você pode definir um status code no mock
            ctx.body = JSON.parse(mockData);
            console.log(`[MOCK] Responding to ${ctx.path} with mock data.`);
            return; // Interrompe a cadeia de middleware para usar o mock
        } catch (error) {
            console.error(`[MOCK] Mock file not found for ${ctx.path}:`, error);
        }
    }
    await next(); // Continua para as rotas reais se não estiver usando mocks ou se o arquivo mock não for encontrado
};

// Adiciona o middleware de mock antes das rotas principais
if (useMocks) {
    console.log("Servidor em modo de Mocks. Use `USE_MOCKS=false npm start` para desativar.");
    app.use(mockMiddleware);
}

// Rotas principais
router.get('/', ctx => {
    ctx.body = 'Bem-vindo ao servidor'
})
router.get('/ola', ctx => {
    ctx.body = `Ola, ${nome}`
})

router.get('/test', async ctx => {
    await ctx.render('test', {
        nome: nome
    })
})

// ROTAS PRINCIPAIS.
router.get('/cadastrar', async ctx => {
    await ctx.render('cadastrar')
})
router.get('/login', async ctx => {
    await ctx.render('login')
})
router.get('/dashboard', autenticou, async ctx => {
    await ctx.render('dashboard', { nome: ctx.session.usuario.nome })
})


router.post('/cadastrar', async ctx => {
    const { nome, senha } = ctx.request.body

    if (!nome || !senha) {
        ctx.status = 400
        ctx.body = 'Nome e senha obrigatorios'
        return
    }

    if (usuarios.find(u => u.nome === nome)) {
        ctx.status = 409
        ctx.body = 'Nome existente.'
        return
    }

    const senhaCrypt = await bcrypt.hash(senha, 10)
    usuarios.push({ nome, senha: senhaCrypt})
    console.log('Usuario cadastrado: ', nome)
    ctx.redirect('/login')
})

router.post('/login', async ctx => {
    const { nome, senha } = ctx.request.body
    const usuario = usuarios.find(u => u.nome === nome)

    if (usuario && await bcrypt.compare(senha, usuario.senha)) {
        ctx.session.usuario = { nome: usuario.nome  }
        ctx.redirect('/dashboard')
    } else {
        ctx.status = 401
        ctx.body = 'Usuario ou senha invalidos.'
    }
})

router.get('/logout', ctx => {
    ctx.session = null
    ctx.redirect ('/login')
})

app.use(router.routes()).use(router.allowedMethods())

app.listen(PORT, () => {
    console.log(`Server na porta ${PORT}`)
})