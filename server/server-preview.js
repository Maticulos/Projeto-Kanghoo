const Koa = require('koa');
const KoaRouter = require('koa-router');
const json = require('koa-json');
const path = require('path');
const koaBody = require('koa-bodyparser');
const serve = require('koa-static');

const app = new Koa();
const router = new KoaRouter();
const PORT = process.env.PORT || 3002;

// Serve static files from parent directory
app.use(serve(path.join(__dirname, '..')));
app.use(koaBody());
app.use(json());

// Basic routes for preview
router.get('/', ctx => {
    ctx.body = 'Server running - visit /index.html';
});

router.post('/cadastrar', async ctx => {
    ctx.status = 201;
    ctx.body = { message: 'Cadastro simulado (preview mode)' };
});

router.post('/login', async ctx => {
    ctx.status = 200;
    ctx.body = { 
        message: 'Login simulado (preview mode)', 
        token: 'preview-token-123' 
    };
});

router.get('/api/dashboard', async ctx => {
    ctx.status = 200;
    ctx.body = {
        message: "Preview mode - dados simulados",
        usuario: { nome: "Usuário Demo" }
    };
});

router.get('/api/motorista/profile', async ctx => {
    ctx.status = 200;
    ctx.body = {
        usuario: { nome_completo: "Motorista Demo", email: "demo@example.com" },
        veiculo: { placa: "ABC-1234", renavam: "12345678901" },
        empresa: null
    };
});

app.use(router.routes()).use(router.allowedMethods());

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Preview server running on port ${PORT}`);
});
