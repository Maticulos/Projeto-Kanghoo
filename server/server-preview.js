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

// Basic routes
router.get('/', ctx => {
    ctx.body = 'Server is running';
});

router.get('/api/health', ctx => {
    ctx.body = { status: 'ok', message: 'Server is running' };
});

// Mock endpoints for development
router.post('/cadastrar', async ctx => {
    ctx.status = 200;
    ctx.body = { message: 'Cadastro em modo preview - banco de dados não conectado' };
});

router.post('/login', async ctx => {
    ctx.status = 200;
    ctx.body = { 
        message: 'Login em modo preview',
        token: 'preview-token-123'
    };
});

router.get('/api/dashboard', async ctx => {
    ctx.status = 200;
    ctx.body = {
        message: "Preview mode - dados mockados",
        usuario: {
            nome: "Usuário Demo"
        }
    };
});

router.get('/api/motorista/profile', async ctx => {
    ctx.status = 200;
    ctx.body = {
        usuario: { nome_completo: "Demo User", email: "demo@example.com" },
        veiculo: { placa: "ABC-1234", renavam: "12345678901" },
        empresa: { razao_social: "Empresa Demo", cnpj: "12.345.678/0001-90" }
    };
});

app.use(router.routes()).use(router.allowedMethods());

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Preview server running on port ${PORT}`);
});
