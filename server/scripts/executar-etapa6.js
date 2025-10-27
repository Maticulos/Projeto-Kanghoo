#!/usr/bin/env node

/**
 * Script para executar as melhorias da ETAPA 6
 * Sistema de Conferência de Crianças e Rastreamento GPS
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Configuração do banco de dados
const dbConfig = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'kanghoo_db',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
};

const pool = new Pool(dbConfig);

async function executarScript() {
    const client = await pool.connect();
    
    try {
        console.log('🚀 Iniciando execução da ETAPA 6: Sistema de Conferência e Rastreamento...\n');
        
        // Ler o arquivo SQL
        const sqlPath = path.join(__dirname, '../../database/etapa6_conferencia_rastreamento.sql');
        
        if (!fs.existsSync(sqlPath)) {
            throw new Error(`Arquivo SQL não encontrado: ${sqlPath}`);
        }
        
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');
        
        console.log('📄 Arquivo SQL carregado com sucesso');
        console.log('📊 Executando criação de tabelas e estruturas...\n');
        
        // Executar o script SQL
        await client.query('BEGIN');
        await client.query(sqlContent);
        await client.query('COMMIT');
        
        console.log('✅ Script executado com sucesso!\n');
        
        // Verificar se as tabelas foram criadas
        console.log('🔍 Verificando tabelas criadas...\n');
        
        const tabelas = [
            'viagens_ativas',
            'paradas_rota', 
            'conferencia_criancas',
            'rastreamento_gps',
            'eventos_viagem',
            'veiculos'
        ];
        
        for (const tabela of tabelas) {
            const result = await client.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = $1
                );
            `, [tabela]);
            
            const existe = result.rows[0].exists;
            console.log(`${existe ? '✅' : '❌'} Tabela ${tabela}: ${existe ? 'CRIADA' : 'NÃO ENCONTRADA'}`);
        }
        
        console.log('\n🔍 Verificando views criadas...\n');
        
        const views = [
            'v_viagens_completas',
            'v_posicoes_atuais'
        ];
        
        for (const view of views) {
            const result = await client.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.views 
                    WHERE table_schema = 'public' 
                    AND table_name = $1
                );
            `, [view]);
            
            const existe = result.rows[0].exists;
            console.log(`${existe ? '✅' : '❌'} View ${view}: ${existe ? 'CRIADA' : 'NÃO ENCONTRADA'}`);
        }
        
        console.log('\n🔍 Verificando funções criadas...\n');
        
        const funcoes = [
            'atualizar_timestamp_modificacao',
            'atualizar_estatisticas_viagem',
            'detectar_parada_proxima'
        ];
        
        for (const funcao of funcoes) {
            const result = await client.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.routines 
                    WHERE routine_schema = 'public' 
                    AND routine_name = $1
                    AND routine_type = 'FUNCTION'
                );
            `, [funcao]);
            
            const existe = result.rows[0].exists;
            console.log(`${existe ? '✅' : '❌'} Função ${funcao}: ${existe ? 'CRIADA' : 'NÃO ENCONTRADA'}`);
        }
        
        console.log('\n🎉 ETAPA 6 executada com sucesso!');
        console.log('\n📋 Resumo das funcionalidades implementadas:');
        console.log('   • Sistema de viagens ativas com rastreamento completo');
        console.log('   • Definição de paradas de rota com detecção automática');
        console.log('   • Conferência de crianças (embarque/desembarque)');
        console.log('   • Rastreamento GPS em tempo real');
        console.log('   • Histórico completo de eventos da viagem');
        console.log('   • Gerenciamento de veículos e suas configurações');
        console.log('   • Cálculos automáticos de combustível e quilometragem');
        console.log('   • Views otimizadas para consultas frequentes');
        console.log('   • Triggers para manutenção automática de dados');
        
        console.log('\n🚀 Próximos passos:');
        console.log('   1. Implementar APIs backend para rastreamento e conferência');
        console.log('   2. Criar interface frontend para motoristas');
        console.log('   3. Integrar sistema de notificações');
        console.log('   4. Conectar com APIs do Google Maps');
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Erro ao executar script:', error.message);
        console.error('\n🔧 Detalhes do erro:');
        console.error(error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

// Verificar se o script está sendo executado diretamente
if (require.main === module) {
    // Carregar variáveis de ambiente se existir arquivo .env
    const envPath = path.join(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
        require('dotenv').config({ path: envPath });
        console.log('📁 Arquivo .env carregado');
    }
    
    executarScript().catch(error => {
        console.error('💥 Erro fatal:', error);
        process.exit(1);
    });
}

module.exports = { executarScript };