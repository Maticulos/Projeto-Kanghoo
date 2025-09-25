const Koa = require('koa')
const KoaRouter = require('koa-router')
const json = require('koa-json')
const views = require('koa-views')
const path = require('path')
const bcrypt = require('bcryptjs')
const koaBody = require('koa-bodyparser')
const session = require('koa-session')
const serve = require('koa-static')

const app = new Koa()
const router = new KoaRouter()
const PORT = 5000

// CHAVE KOA-SESSION.
app.keys = ['chave']

app.use(session(app))
app.use(koaBody())
app.use(views(path.join(__dirname, 'views'), { extension: 'ejs' }))
app.use(json())
app.use(serve(path.join(__dirname, 'public')))

// TODO: IMPLEMENTAR DB DE POSTGRES.
const usuarios = []
const cadEscolar = []

const autenticou = async (ctx, next) => {
    if (ctx.session.usuario) {
        await next()
    } else {
        ctx.redirect('/cadastro-escolar')
    }
}


// ROTA TESTE.
router.get('/', ctx => {
    ctx.body = 'Bem-vindo ao servidor'
})

// ROTAS PRINCIPAIS.
router.get('/cadastro-escolar', async ctx => {
    await ctx.render('cadastro-escolar')
})
router.get('/area-motorista', autenticou, async ctx => {
    const email = ctx.session.usuario.email
    const dados = cadEscolar.find(c => c.email === email)
    await ctx.render('area-motorista', { 
        dados: dados,
        nome: ctx.session.usuario.nome
    })
})

router.post('/cadastro-escolar', async ctx => {
    const { nome, senha, email, ...dados } = ctx.request.body
    
    const emailExistente = usuarios.find(u => u.email === email)
    if (emailExistente) {
        ctx.status = 409
    }
    
    const senhaCrypt = await bcrypt.hash(senha, 10)
    const novoUsuario = { nome, senha: senhaCrypt, email }
    
    usuarios.push(novoUsuario)

    cadEscolar.push({ ...dados, nome, email })
    const usuario = usuarios.find(u => u.email === email)
    if (usuario && await bcrypt.compare(senha, usuario.senha)) {
        ctx.session.usuario = { nome: novoUsuario.nome, email: novoUsuario.email  }
        ctx.redirect('/area-motorista')
    } else {
        ctx.status = 401
        ctx.body = 'Usuario ou senha invalidos.'
    }
})

router.get('/logout', ctx => {
    ctx.session = null
    ctx.redirect ('/cadastro-escolar')
})

app.use(router.routes()).use(router.allowedMethods())

app.listen(PORT, () => {
    console.log(`Server na porta ${PORT}`)
})