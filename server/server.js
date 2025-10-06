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

// CHAVE KOA-SESSION.
app.keys = ['chave']

app.use(session(app))
app.use(koaBody())
app.use(views(path.join(__dirname, 'views'), { extension: 'ejs' }))
app.use(json())

// TODO: IMPLEMENTAR DB DE POSTGRES.
const usuarios = []

const autenticou = async (ctx, next) => {
    if (ctx.session.usuario) {
        await next()
    } else {
        ctx.redirect('/login')
    }
}


// ROTAS TESTE.
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