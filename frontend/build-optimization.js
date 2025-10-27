/**
 * Script de Build e Otimização - CSS/JS
 * Exemplo prático para implementar as melhorias sugeridas
 */

const fs = require('fs');
const path = require('path');

class AssetOptimizer {
    constructor() {
        this.sourceDir = './public';
        this.outputDir = './public/assets';
        this.version = Date.now(); // Simple versioning
    }

    // Criar estrutura de diretórios otimizada
    createOptimizedStructure() {
        const dirs = [
            'assets/css/core',
            'assets/css/components', 
            'assets/css/vendors',
            'assets/js/core',
            'assets/js/components',
            'assets/js/animations',
            'assets/js/api',
            'assets/js/vendors',
            'assets/fonts'
        ];

        dirs.forEach(dir => {
            const fullPath = path.join(this.sourceDir, dir);
            if (!fs.existsSync(fullPath)) {
                fs.mkdirSync(fullPath, { recursive: true });
                console.log(`✅ Criado: ${dir}`);
            }
        });
    }

    // Organizar arquivos CSS por categoria
    organizeCSSFiles() {
        const cssMapping = {
            'core': ['style.css', 'realtime-notifications.css', 'input-fix.css'],
            'components': ['formulario-multiplas-etapas.css', 'preferencias-notificacao.css'],
            'vendors': ['font-awesome.min.css']
        };

        Object.entries(cssMapping).forEach(([category, files]) => {
            files.forEach(file => {
                const sourcePath = path.join(this.sourceDir, 'css', file);
                const targetPath = path.join(this.outputDir, 'css', category, file);
                
                if (fs.existsSync(sourcePath)) {
                    this.copyFile(sourcePath, targetPath);
                    console.log(`📁 CSS: ${file} → ${category}/`);
                }
            });
        });
    }

    // Organizar arquivos JS por categoria
    organizeJSFiles() {
        const jsMapping = {
            'core': ['app.js', 'realtime-client.js', 'cache-manager.js'],
            'components': ['formulario-multiplas-etapas.js', 'mascaras.js', 'ui-utils.js'],
            'animations': ['animacoes-index.js', 'animacoes-planos.js', 'animacoes-sobre.js'],
            'api': ['rastreamento-api.js', 'mock-api.js', 'integracao-google-maps.js'],
            'vendors': ['chart.min.js']
        };

        Object.entries(jsMapping).forEach(([category, files]) => {
            files.forEach(file => {
                const sourcePath = path.join(this.sourceDir, 'js', file);
                const targetPath = path.join(this.outputDir, 'js', category, file);
                
                if (fs.existsSync(sourcePath)) {
                    this.copyFile(sourcePath, targetPath);
                    console.log(`📁 JS: ${file} → ${category}/`);
                }
            });
        });
    }

    // Concatenar e minificar CSS core
    bundleCoreCSS() {
        const coreFiles = ['style.css', 'realtime-notifications.css', 'input-fix.css'];
        const componentFiles = ['formulario-multiplas-etapas.css', 'preferencias-notificacao.css'];
        let bundledCSS = '';

        // Incluir arquivos core
        coreFiles.forEach(file => {
            const filePath = path.join(this.outputDir, 'css/core', file);
            if (fs.existsSync(filePath)) {
                bundledCSS += `/* === ${file} === */\n`;
                bundledCSS += fs.readFileSync(filePath, 'utf8');
                bundledCSS += '\n\n';
            }
        });

        // Incluir arquivos de componentes
        componentFiles.forEach(file => {
            const filePath = path.join(this.outputDir, 'css/components', file);
            console.log(`🔍 Verificando arquivo CSS: ${filePath}`);
            if (fs.existsSync(filePath)) {
                console.log(`✅ Arquivo encontrado: ${file}`);
                bundledCSS += `/* === ${file} === */\n`;
                bundledCSS += fs.readFileSync(filePath, 'utf8');
                bundledCSS += '\n\n';
            } else {
                console.log(`❌ Arquivo não encontrado: ${file}`);
            }
        });

        // Log do conteúdo antes da minificação
        console.log(`📝 Tamanho do CSS concatenado: ${bundledCSS.length} caracteres`);
        console.log(`📝 Inclui progress-container: ${bundledCSS.includes('progress-container')}`);
        
        // Criar arquivo temporário sem minificação para debug
        const tempPath = path.join(this.outputDir, 'css', `bundle-debug.css`);
        fs.writeFileSync(tempPath, bundledCSS);
        console.log(`🔍 Arquivo debug criado: bundle-debug.css`);
        
        // Minificação básica (remover comentários e espaços extras)
        const minifiedCSS = this.minifyCSS(bundledCSS);
        console.log(`📝 Tamanho do CSS minificado: ${minifiedCSS.length} caracteres`);
        console.log(`📝 CSS minificado inclui progress-container: ${minifiedCSS.includes('progress-container')}`);
        
        const bundlePath = path.join(this.outputDir, 'css', `bundle.min.css`);
        fs.writeFileSync(bundlePath, minifiedCSS);
        console.log(`📦 Bundle CSS criado: bundle.min.css`);
    }

    // Concatenar e minificar JS core
    bundleCoreJS() {
        const coreFiles = ['app.js', 'realtime-client.js', 'cache-manager.js'];
        const componentFiles = ['formulario-multiplas-etapas.js', 'mascaras.js', 'ui-utils.js'];
        let bundledJS = '';

        // Incluir arquivos core
        coreFiles.forEach(file => {
            const filePath = path.join(this.outputDir, 'js/core', file);
            if (fs.existsSync(filePath)) {
                bundledJS += `/* === ${file} === */\n`;
                bundledJS += fs.readFileSync(filePath, 'utf8');
                bundledJS += '\n\n';
            }
        });

        // Incluir arquivos de componentes
        componentFiles.forEach(file => {
            const filePath = path.join(this.outputDir, 'js/components', file);
            if (fs.existsSync(filePath)) {
                bundledJS += `/* === ${file} === */\n`;
                bundledJS += fs.readFileSync(filePath, 'utf8');
                bundledJS += '\n\n';
            }
        });

        const bundlePath = path.join(this.outputDir, 'js', `bundle.min.js`);
        fs.writeFileSync(bundlePath, bundledJS);
        console.log(`📦 Bundle JS criado: bundle.min.js`);
    }

    // Gerar arquivo de manifest com versões
    generateManifest() {
        const manifest = {
            version: this.version,
            timestamp: new Date().toISOString(),
            files: {
                css: {
                    bundle: `assets/css/bundle.min.css?v=${this.version}`,
                    components: `assets/css/components/`,
                    vendors: `assets/css/vendors/`
                },
                js: {
                    bundle: `assets/js/bundle.min.js?v=${this.version}`,
                    components: `assets/js/components/`,
                    animations: `assets/js/animations/`,
                    api: `assets/js/api/`,
                    vendors: `assets/js/vendors/`
                }
            }
        };

        const manifestPath = path.join(this.sourceDir, 'assets-manifest.json');
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
        console.log(`📋 Manifest criado: assets-manifest.json`);
    }

    // Atualizar referências HTML
    updateHTMLReferences() {
        const htmlFiles = fs.readdirSync(this.sourceDir)
            .filter(file => file.endsWith('.html'));

        htmlFiles.forEach(file => {
            const filePath = path.join(this.sourceDir, file);
            let content = fs.readFileSync(filePath, 'utf8');

            // Substituir referências CSS antigas
            content = content.replace(/href="\.\.\/css\/style\.css"/g, `href="assets/css/bundle.min.css?v=${this.version}"`);
            content = content.replace(/href="css\/style\.css"/g, `href="assets/css/bundle.min.css?v=${this.version}"`);
            
            // Substituir referências JS antigas
            content = content.replace(/src="\.\.\/js\/app\.js"/g, `src="assets/js/bundle.min.js?v=${this.version}"`);
            content = content.replace(/src="js\/app\.js"/g, `src="assets/js/bundle.min.js?v=${this.version}"`);

            // Adicionar preload para performance
            if (content.includes('<head>') && !content.includes('rel="preload"')) {
                content = content.replace('<head>', 
                    `<head>\n    <link rel="preload" href="assets/css/bundle.min.css?v=${this.version}" as="style">\n    <link rel="preload" href="assets/js/bundle.min.js?v=${this.version}" as="script">`
                );
            }

            fs.writeFileSync(filePath, content);
            console.log(`🔄 Atualizado: ${file}`);
        });
    }

    // Utilitários
    copyFile(source, target) {
        const targetDir = path.dirname(target);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        fs.copyFileSync(source, target);
    }

    minifyCSS(css) {
        return css
            .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comentários
            .replace(/\s+/g, ' ') // Remove espaços extras
            .replace(/;\s*}/g, '}') // Remove ; antes de }
            .replace(/\s*{\s*/g, '{') // Remove espaços ao redor de {
            .replace(/;\s*/g, ';') // Remove espaços após ;
            .trim();
    }

    // Executar otimização completa
    async optimize() {
        console.log('🚀 Iniciando otimização de assets...\n');
        
        try {
            this.createOptimizedStructure();
            console.log('');
            
            this.organizeCSSFiles();
            console.log('');
            
            this.organizeJSFiles();
            console.log('');
            
            this.bundleCoreCSS();
            this.bundleCoreJS();
            console.log('');
            
            this.generateManifest();
            console.log('');
            
            // Comentado para não alterar arquivos automaticamente
            // this.updateHTMLReferences();
            
            console.log('✅ Otimização concluída com sucesso!');
            console.log(`📊 Versão gerada: ${this.version}`);
            
        } catch (error) {
            console.error('❌ Erro durante otimização:', error.message);
        }
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const optimizer = new AssetOptimizer();
    optimizer.optimize();
}

module.exports = AssetOptimizer;