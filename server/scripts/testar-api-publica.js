/**
 * Script para testar a API pública de transportes
 */

const http = require('http');

function testarAPI() {
  return new Promise((resolve, reject) => {
    const url = 'http://localhost:3000/api/public/transportes?tipo=todos&limite=10';
    
    console.log('🧪 Testando API pública de transportes...\n');
    console.log(`📡 URL: ${url}\n`);
    
    http.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          
          console.log('✅ Status:', res.statusCode);
          console.log('📊 Resposta:\n');
          console.log(JSON.stringify(json, null, 2));
          
          if (json.success && json.data) {
            const transportes = json.data.transportes || [];
            console.log(`\n📈 Total de transportes retornados: ${transportes.length}`);
            
            if (transportes.length > 0) {
              console.log('\n📋 Primeiro transporte:');
              const primeiro = transportes[0];
              console.log(`   - ID: ${primeiro.id}`);
              console.log(`   - Nome: ${primeiro.nome}`);
              console.log(`   - Tipo: ${primeiro.tipo_servico}`);
              if (primeiro.rota) {
                console.log(`   - Rota: ${primeiro.rota.nome}`);
                console.log(`   - Escola: ${primeiro.rota.escolaDestino}`);
              }
              if (primeiro.pacote) {
                console.log(`   - Pacote: ${primeiro.pacote.nome}`);
                console.log(`   - Destino: ${primeiro.pacote.destino}`);
              }
              if (primeiro.veiculo) {
                console.log(`   - Veículo: ${primeiro.veiculo.placa}`);
                console.log(`   - Capacidade: ${primeiro.veiculo.capacidade}`);
              }
            } else {
              console.log('\n⚠️  Nenhum transporte encontrado. Verifique se o seed foi executado corretamente.');
            }
          }
          
          resolve(json);
        } catch (error) {
          console.error('❌ Erro ao parsear JSON:', error.message);
          console.log('Resposta bruta:', data);
          reject(error);
        }
      });
    }).on('error', (error) => {
      console.error('❌ Erro na requisição:', error.message);
      console.error('\n💡 Certifique-se de que o servidor está rodando em http://localhost:3000');
      reject(error);
    });
  });
}

testarAPI().catch(console.error);

