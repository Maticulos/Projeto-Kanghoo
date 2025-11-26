/**
 * Script para popular as tabelas do sistema de conferência com dados de teste
 * relacionando aos usuários e rotas existentes
 */

require('dotenv').config();
const db = require('../config/db');

async function popularSistemaConferencia() {
  console.log('🌱 Populando sistema de conferência com dados de teste...\n');
  
  try {
    // 1. Buscar usuários de teste (motoristas escolares)
    const usuarios = await db.query(`
      SELECT id, nome_completo, email
      FROM usuarios
      WHERE email IN (
        'joao.silva.teste@email.com',
        'maria.santos.teste@email.com',
        'pedro.alves.teste@email.com'
      )
      AND tipo_usuario IN ('motorista_escolar', 'motorista_escolar_excursao')
    `);
    
    if (usuarios.rows.length === 0) {
      console.log('⚠️  Nenhum usuário de teste encontrado. Execute o seed de usuários primeiro.');
      return;
    }
    
    console.log(`📋 Encontrados ${usuarios.rows.length} motoristas de teste:\n`);
    usuarios.rows.forEach(u => {
      console.log(`   - ${u.nome_completo} (${u.email})`);
    });
    console.log('');
    
    // 2. Para cada motorista, buscar suas rotas e criar dados de teste
    for (const motorista of usuarios.rows) {
      console.log(`🔧 Processando dados para ${motorista.nome_completo}...`);
      
      // Buscar rotas do motorista
      const rotas = await db.query(`
        SELECT id, nome_rota, escola_destino, capacidade_maxima
        FROM rotas_escolares
        WHERE usuario_id = $1 AND ativa = true
        ORDER BY id
        LIMIT 2
      `, [motorista.id]);
      
      if (rotas.rows.length === 0) {
        console.log(`   ⚠️  Nenhuma rota encontrada para ${motorista.nome_completo}`);
        continue;
      }
      
      for (const rota of rotas.rows) {
        console.log(`   📍 Processando rota: ${rota.nome_rota}`);
        
        // 3. Criar paradas da rota
        const paradas = [
          {
            ordem: 1,
            endereco: 'Ponto de partida - Rua Principal, 100',
            latitude: -23.5505,
            longitude: -46.6333,
            horario: '07:00',
            tipo: 'embarque'
          },
          {
            ordem: 2,
            endereco: rota.escola_destino,
            latitude: -23.5615,
            longitude: -46.6565,
            horario: '07:30',
            tipo: 'escola'
          },
          {
            ordem: 3,
            endereco: 'Ponto de retorno - Rua Secundária, 200',
            latitude: -23.5505,
            longitude: -46.6333,
            horario: '12:00',
            tipo: 'desembarque'
          }
        ];
        
        for (const parada of paradas) {
          const paradaExistente = await db.query(`
            SELECT id FROM paradas_rota 
            WHERE rota_id = $1 AND ordem_parada = $2
          `, [rota.id, parada.ordem]);
          
          if (paradaExistente.rows.length === 0) {
            await db.query(`
              INSERT INTO paradas_rota (
                rota_id, ordem_parada, endereco, latitude, longitude,
                horario_previsto, raio_deteccao, tipo_parada, ativo
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [
              rota.id, parada.ordem, parada.endereco,
              parada.latitude, parada.longitude, parada.horario,
              50, parada.tipo, true
            ]);
          }
        }
        console.log(`      ✅ ${paradas.length} paradas criadas`);
        
        // 4. Criar viagem ativa (uma por rota)
        const hoje = new Date();
        const horarioInicio = new Date(hoje);
        horarioInicio.setHours(7, 0, 0, 0);
        
        const viagemExistente = await db.query(`
          SELECT id FROM viagens_ativas 
          WHERE rota_id = $1 AND data_viagem = CURRENT_DATE
        `, [rota.id]);
        
        let viagemId;
        if (viagemExistente.rows.length === 0) {
          const viagemResult = await db.query(`
            INSERT INTO viagens_ativas (
              rota_id, motorista_id, tipo_viagem, data_viagem,
              horario_inicio, status, quilometragem_inicial,
              total_criancas_esperadas, total_criancas_embarcadas
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id
          `, [
            rota.id, motorista.id, 'ida', hoje,
            horarioInicio, 'em_andamento',
            15000.00, // odômetro inicial
            Math.min(rota.capacidade_maxima, 5), // crianças esperadas
            Math.min(rota.capacidade_maxima, 3)  // crianças embarcadas
          ]);
          
          viagemId = viagemResult.rows[0].id;
          console.log(`      ✅ Viagem ativa criada (ID: ${viagemId})`);
        } else {
          viagemId = viagemExistente.rows[0].id;
          console.log(`      ℹ️  Viagem já existe (ID: ${viagemId})`);
        }
        
        // 5. Buscar crianças relacionadas à rota
        // Primeiro tentar pela tabela criancas_rotas, depois pela coluna rota_id em criancas
        let criancasRota = [];
        try {
          const criancasResult = await db.query(`
            SELECT cr.crianca_id, c.nome_completo
            FROM criancas_rotas cr
            JOIN criancas c ON c.id = cr.crianca_id
            WHERE cr.rota_id = $1 AND cr.ativo = true
            LIMIT 5
          `, [rota.id]);
          criancasRota = criancasResult.rows;
        } catch (error) {
          // Tabela não existe, buscar pela coluna rota_id em criancas
          try {
            const criancasResult = await db.query(`
              SELECT id as crianca_id, nome_completo
              FROM criancas
              WHERE rota_id = $1 AND ativo = true
              LIMIT 5
            `, [rota.id]);
            criancasRota = criancasResult.rows;
          } catch (error2) {
            // Se não encontrar, buscar crianças da mesma escola
            const criancasResult = await db.query(`
              SELECT id as crianca_id, nome_completo
              FROM criancas
              WHERE escola = $1 AND ativo = true
              LIMIT 5
            `, [rota.escola_destino]);
            criancasRota = criancasResult.rows;
          }
        }
        
        // Se não houver crianças encontradas, buscar qualquer criança ativa
        if (criancasRota.length === 0) {
          console.log(`      ⚠️  Nenhuma criança encontrada para a rota. Buscando crianças ativas...`);
          const criancasAtivas = await db.query(`
            SELECT id as crianca_id, nome_completo
            FROM criancas
            WHERE ativo = true
            LIMIT 5
          `);
          criancasRota = criancasAtivas.rows;
        }
        
        // Criar conferências para as crianças encontradas
        if (criancasRota.length > 0) {
          // Criar conferências para as crianças reais
          for (const crianca of criancasRota) {
            const horarioEmbarque = new Date(horarioInicio);
            horarioEmbarque.setMinutes(horarioEmbarque.getMinutes() + Math.floor(Math.random() * 15));
            
            // Embarque
            const embarqueExistente = await db.query(`
              SELECT id FROM conferencia_criancas
              WHERE viagem_id = $1 AND crianca_id = $2 AND tipo_evento = 'embarque'
            `, [viagemId, crianca.crianca_id]);
            
            if (embarqueExistente.rows.length === 0) {
              await db.query(`
                INSERT INTO conferencia_criancas (
                  viagem_id, crianca_id, tipo_evento,
                  horario_previsto, horario_real, latitude, longitude,
                  endereco, confirmado, notificacao_enviada
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
              `, [
                viagemId, crianca.crianca_id, 'embarque',
                horarioEmbarque, horarioEmbarque,
                -23.5505, -46.6333,
                'Ponto de embarque - Rua Principal',
                true, true
              ]);
            }
            
            // Desembarque
            const horarioDesembarque = new Date(horarioInicio);
            horarioDesembarque.setHours(12, 30, 0, 0);
            
            const desembarqueExistente = await db.query(`
              SELECT id FROM conferencia_criancas
              WHERE viagem_id = $1 AND crianca_id = $2 AND tipo_evento = 'desembarque'
            `, [viagemId, crianca.crianca_id]);
            
            if (desembarqueExistente.rows.length === 0) {
              await db.query(`
                INSERT INTO conferencia_criancas (
                  viagem_id, crianca_id, tipo_evento,
                  horario_previsto, horario_real, latitude, longitude,
                  endereco, confirmado, notificacao_enviada
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
              `, [
                viagemId, crianca.crianca_id, 'desembarque',
                horarioDesembarque, horarioDesembarque,
                -23.5615, -46.6565,
                rota.escola_destino,
                true, true
              ]);
            }
          }
          console.log(`      ✅ ${criancasRota.length * 2} conferências criadas para crianças reais`);
        }
        
        // 6. Criar rastreamento GPS (pontos de localização durante a viagem)
        const pontosGPS = [
          { lat: -23.5505, lng: -46.6333, tempo: 0 },   // Início
          { lat: -23.5520, lng: -46.6350, tempo: 5 },   // 5 min
          { lat: -23.5550, lng: -46.6400, tempo: 10 },  // 10 min
          { lat: -23.5580, lng: -46.6450, tempo: 15 },  // 15 min
          { lat: -23.5615, lng: -46.6565, tempo: 20 }   // Chegada (escola)
        ];
        
        for (const ponto of pontosGPS) {
          const timestampGPS = new Date(horarioInicio);
          timestampGPS.setMinutes(timestampGPS.getMinutes() + ponto.tempo);
          
          const gpsExistente = await db.query(`
            SELECT id FROM rastreamento_gps
            WHERE viagem_id = $1 AND timestamp_gps = $2
          `, [viagemId, timestampGPS]);
          
          if (gpsExistente.rows.length === 0) {
            await db.query(`
              INSERT INTO rastreamento_gps (
                viagem_id, latitude, longitude, velocidade,
                direcao, precisao, timestamp_gps
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [
              viagemId, ponto.lat, ponto.lng,
              40 + Math.random() * 20, // velocidade entre 40-60 km/h
              Math.floor(Math.random() * 360), // direção 0-360 graus
              10.0, // precisão em metros
              timestampGPS
            ]);
          }
        }
        console.log(`      ✅ ${pontosGPS.length} pontos GPS criados`);
      }
      
      console.log('');
    }
    
    // Verificação final
    console.log('📊 Verificação final:\n');
    
    const viagens = await db.query('SELECT COUNT(*) as total FROM viagens_ativas');
    const conferencias = await db.query('SELECT COUNT(*) as total FROM conferencia_criancas');
    const gps = await db.query('SELECT COUNT(*) as total FROM rastreamento_gps');
    const paradas = await db.query('SELECT COUNT(*) as total FROM paradas_rota');
    
    console.log(`  🚌 Viagens ativas: ${viagens.rows[0].total}`);
    console.log(`  👶 Conferências: ${conferencias.rows[0].total}`);
    console.log(`  📍 Pontos GPS: ${gps.rows[0].total}`);
    console.log(`  🛑 Paradas de rota: ${paradas.rows[0].total}`);
    console.log('');
    console.log('✅ Sistema de conferência populado com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error.stack);
    throw error;
  }
}

async function main() {
  try {
    await popularSistemaConferencia();
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  } finally {
    await db.pool.end();
  }
}

main();

