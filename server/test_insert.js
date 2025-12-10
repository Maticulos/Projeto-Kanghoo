const db = require('./config/db');

async function test() {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        console.log('Testing usuarios insert...');
        const userResult = await client.query(`
            INSERT INTO usuarios (
                nome_completo, email, senha, celular, 
                tipo_cadastro, tipo_usuario, 
                data_nascimento, endereco_completo,
                cidade, estado, cep, bairro,
                tipo_pessoa, foto_perfil, nome_emergencia, telefone_emergencia,
                cnh, categoria_cnh, validade_cnh, foto_cnh, foto_antecedentes, foto_curso,
                rua, numero, complemento,
                criado_em, atualizado_em
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, NOW(), NOW())
            RETURNING id
        `, [
            'Teste', 'teste@teste.com', 'hash', '11999999999', 'excursao', 'motorista_excursao',
            '1990-01-01', 'Rua Teste, 123', 'Sao Paulo', 'SP', '01000000', 'Centro',
            'fisica', null, 'Emergencia', '11988888888',
            '12345678901', 'B', '2030-01-01', null, null, null,
            'Rua Teste', '123', 'Apt 1'
        ]);
        console.log('Usuarios insert OK. ID:', userResult.rows[0].id);
        const userId = userResult.rows[0].id;

        console.log('Testing empresas insert...');
        await client.query(`
            INSERT INTO empresas (
                usuario_id, razao_social, nome_fantasia, cnpj, 
                telefone, cep, rua, numero, complemento, bairro, cidade, estado,
                foto_representante,
                criado_em
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
        `, [
            userId, 'Razao Social', 'Fantasia', '12345678000199',
            '1133333333', '01000000', 'Rua Empresa', '100', 'Sala 1', 'Centro', 'Sao Paulo', 'SP',
            null
        ]);
        console.log('Empresas insert OK.');

        console.log('Testing veiculos insert...');
        const veiculoResult = await client.query(`
            INSERT INTO veiculos (
                motorista_id, placa, 
                capacidade, ano, 
                modelo, 
                ano_modelo, seguradora, apolice, validade_seguro, foto_crlv,
                criado_em
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
            RETURNING id
        `, [
            userId, 'ABC1234', 10, 2020, 'Modelo Teste', 2020, 'Seguradora', '123456', '2025-01-01', null
        ]);
        console.log('Veiculos insert OK. ID:', veiculoResult.rows[0].id);
        const veiculoId = veiculoResult.rows[0].id;

        console.log('Testing caracteristicas_veiculos insert...');
        await client.query(`
            INSERT INTO caracteristicas_veiculos (
                veiculo_id, ar_condicionado, wifi, acessibilidade_pcd, criado_em
            ) VALUES ($1, $2, $3, $4, NOW())
        `, [
            veiculoId, true, true, false
        ]);
        console.log('Caracteristicas insert OK.');

        await client.query('ROLLBACK');
        console.log('All tests passed (rolled back).');

    } catch (err) {
        console.error('Error during test:', err);
        await client.query('ROLLBACK');
    } finally {
        client.release();
        process.exit();
    }
}

test();
