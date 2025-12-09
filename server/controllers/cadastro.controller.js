const db = require('../config/db');
const bcrypt = require('bcrypt');
const logger = require('../utils/logger');
const { success, error, validationError, send } = require('../utils/api-response');
const { validateInput } = require('../config/security-config');

const SALT_ROUNDS = 10;

async function cadastrar(ctx) {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        const data = ctx.request.body;
        const files = ctx.request.files || {};

        // Helper to get file path
        const getFilePath = (fieldName) => {
            if (files[fieldName] && files[fieldName].length > 0) {
                return files[fieldName][0].path || files[fieldName][0].filename || files[fieldName][0].name;
            }
            return null;
        };

        // Validação básica
        const requiredFields = ['nomeCompleto', 'email', 'senha', 'celular', 'tipoCadastro'];
        const missingFields = requiredFields.filter(field => !data[field]);

        if (missingFields.length > 0) {
            throw { status: 400, message: `Campos obrigatórios faltando: ${missingFields.join(', ')}` };
        }

        // Verificar se usuário já existe
        const userExists = await client.query('SELECT id FROM usuarios WHERE email = $1', [data.email]);
        if (userExists.rows.length > 0) {
            throw { status: 409, message: 'E-mail já cadastrado' };
        }

        // Hash da senha
        const senhaHash = await bcrypt.hash(data.senha, SALT_ROUNDS);

        // Inserir usuário
        let tipoUsuario = 'usuario_comum';
        if (data.tipoCadastro === 'escolar') tipoUsuario = 'motorista_escolar';
        else if (data.tipoCadastro === 'excursao') tipoUsuario = 'motorista_excursao';
        else if (data.tipoCadastro === 'responsavel') tipoUsuario = 'responsavel';

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
            data.nomeCompleto,
            data.email,
            senhaHash,
            data.celular,
            data.tipoCadastro, 
            tipoUsuario,
            data.dataNascimento || null,
            data.rua ? `${data.rua}, ${data.numero} ${data.complemento || ''}` : null,
            data.cidade,
            data.estado,
            data.cep,
            data.bairro,
            data.tipoPessoa || 'fisica',
            getFilePath('fotoPerfil'),
            data.nomeEmergencia,
            data.telefoneEmergencia,
            data.cnhMotorista,
            data.categoriaCNH,
            data.validadeCNH || null,
            getFilePath('fotoCNH'),
            getFilePath('fotoAntecedentes'),
            getFilePath('fotoCurso'),
            data.rua,
            data.numero,
            data.complemento
        ]);

        const userId = userResult.rows[0].id;

        // Inserir dados da empresa (se fornecidos)
        if (data.razaoSocial && data.cnpj) {
            await client.query(`
                INSERT INTO empresas (
                    usuario_id, razao_social, nome_fantasia, cnpj, 
                    telefone, cep, rua, numero, complemento, bairro, cidade, estado,
                    foto_cnpj,
                    criado_em
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
            `, [
                userId,
                data.razaoSocial,
                data.nomeFantasia || null,
                data.cnpj,
                data.telefoneEmpresa,
                data.cepEmpresa,
                data.ruaEmpresa,
                data.numeroEmpresa,
                data.complementoEmpresa,
                data.bairroEmpresa,
                data.cidadeEmpresa,
                data.estadoEmpresa,
                getFilePath('fotoCNPJ')
            ]);
        }

        // Inserir veículo (se fornecido)
        if (data.placa && data.renavam) {
            const veiculoResult = await client.query(`
                INSERT INTO veiculos (
                    usuario_id, placa, renavam, 
                    lotacao_maxima, ano_fabricacao, 
                    cor, modelo, marca, 
                    ano_modelo, seguradora, apolice, validade_seguro, foto_crlv,
                    criado_em
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
                RETURNING id
            `, [
                userId,
                data.placa,
                data.renavam,
                parseInt(data.lotacaoMaxima) || 0,
                parseInt(data.anoFabricacao) || null,
                data.corVeiculo || null,
                null, // Modelo
                null, // Marca
                parseInt(data.anoModelo) || null,
                data.nomeSeguradora,
                data.numeroApolice,
                data.validadeSeguro || null,
                getFilePath('fotoCRLV')
            ]);
            
            const veiculoId = veiculoResult.rows[0].id;

            // Inserir características do veículo
            await client.query(`
                INSERT INTO caracteristicas_veiculos (
                    veiculo_id, ar_condicionado, wifi, acessibilidade_pcd, criado_em
                ) VALUES ($1, $2, $3, $4, NOW())
            `, [
                veiculoId,
                data.arCondicionado === 'sim',
                data.wifi === 'sim',
                data.acessibilidadePCD === 'sim'
            ]);
        }

        await client.query('COMMIT');

        logger.info(`Novo usuário cadastrado: ${data.email} (ID: ${userId})`);

        return send(ctx, success({ id: userId, email: data.email }, 'Cadastro realizado com sucesso', 201));

    } catch (err) {
        await client.query('ROLLBACK');
        logger.error('Erro no cadastro:', err);
        
        if (err.status) {
            ctx.status = err.status;
            return send(ctx, error(err.message, err.status));
        }
        
        ctx.status = 500;
        return send(ctx, error('Erro interno ao realizar cadastro', 500));
    } finally {
        client.release();
    }
}

module.exports = { cadastrar };
