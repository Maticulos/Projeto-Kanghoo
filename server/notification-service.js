const nodemailer = require('nodemailer');

// Configuração do sistema de notificações
class NotificationService {
    constructor() {
        // Configurar transporter de email (exemplo com Gmail)
        this.emailTransporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER || 'seu-email@gmail.com',
                pass: process.env.EMAIL_PASS || 'sua-senha-app'
            }
        });

        // Configuração do Twilio para WhatsApp
        this.twilioConfig = {
            accountSid: process.env.TWILIO_ACCOUNT_SID,
            authToken: process.env.TWILIO_AUTH_TOKEN,
            whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886'
        };

        // Inicializar cliente Twilio se as credenciais estiverem disponíveis
        this.twilioClient = null;
        if (this.twilioConfig.accountSid && this.twilioConfig.authToken) {
            try {
                const twilio = require('twilio');
                this.twilioClient = twilio(this.twilioConfig.accountSid, this.twilioConfig.authToken);
                console.log('[WHATSAPP] Cliente Twilio inicializado com sucesso');
            } catch (error) {
                console.warn('[WHATSAPP] Erro ao inicializar Twilio:', error.message);
            }
        } else {
            console.warn('[WHATSAPP] Credenciais do Twilio não configuradas - usando modo simulação');
        }

        // Templates de mensagem para WhatsApp
        this.whatsappTemplates = {
            embarque: (nome, timestamp, localizacao) => 
                `🚌 *Embarque Confirmado*\n\nOlá! *${nome}* embarcou no transporte escolar às ${timestamp}.\n\n📍 Localização: ${localizacao}\n\n_Kanghoo - Transporte Escolar Seguro_`,
            
            desembarque: (nome, timestamp, localizacao) => 
                `🏫 *Chegada Confirmada*\n\nOlá! *${nome}* chegou ao destino às ${timestamp}.\n\n📍 Localização: ${localizacao}\n\n_Kanghoo - Transporte Escolar Seguro_`,
            
            localizacao: (nome, timestamp, velocidade, localizacao) => 
                `📍 *Atualização de Localização*\n\n*${nome}* está em trânsito.\n\n⏰ Atualização: ${timestamp}\n🚗 Velocidade: ${velocidade} km/h\n📍 Localização: ${localizacao}\n\n_Kanghoo - Transporte Escolar Seguro_`,
            
            atraso: (nome, minutosAtraso, novoHorario) => 
                `⏰ *Aviso de Atraso*\n\nO transporte de *${nome}* está atrasado em ${minutosAtraso} minutos.\n\n🕐 Novo horário previsto: ${novoHorario}\n\n_Kanghoo - Transporte Escolar Seguro_`,
            
            emergencia: (nome, tipoEmergencia, localizacao) => 
                `🚨 *EMERGÊNCIA*\n\nSituação: ${tipoEmergencia}\nCriança: *${nome}*\n📍 Localização: ${localizacao}\n\nEntre em contato imediatamente!\n\n_Kanghoo - Transporte Escolar Seguro_`
        };
    }

    // Enviar notificação por email
    async enviarEmail(destinatario, assunto, conteudo) {
        try {
            const mailOptions = {
                from: process.env.EMAIL_USER || 'kanghoo@transporte.com',
                to: destinatario,
                subject: assunto,
                html: conteudo
            };

            const resultado = await this.emailTransporter.sendMail(mailOptions);
            console.log(`[EMAIL] Enviado para ${destinatario}: ${assunto}`);
            return { sucesso: true, messageId: resultado.messageId };
        } catch (error) {
            console.error(`[EMAIL] Erro ao enviar para ${destinatario}:`, error);
            return { sucesso: false, erro: error.message };
        }
    }

    // Validar e formatar número de telefone para WhatsApp
    formatarTelefoneWhatsApp(telefone) {
        if (!telefone) return null;
        
        // Remover caracteres não numéricos
        let numeroLimpo = telefone.replace(/\D/g, '');
        
        // Adicionar código do país se não estiver presente
        if (numeroLimpo.length === 11 && numeroLimpo.startsWith('11')) {
            numeroLimpo = '55' + numeroLimpo; // Brasil
        } else if (numeroLimpo.length === 10) {
            numeroLimpo = '5511' + numeroLimpo; // São Paulo, Brasil
        } else if (!numeroLimpo.startsWith('55') && numeroLimpo.length < 13) {
            numeroLimpo = '55' + numeroLimpo;
        }
        
        return `whatsapp:+${numeroLimpo}`;
    }

    // Enviar notificação por WhatsApp usando Twilio
    async enviarWhatsApp(telefone, mensagem, template = null) {
        try {
            const telefoneFormatado = this.formatarTelefoneWhatsApp(telefone);
            if (!telefoneFormatado) {
                throw new Error('Número de telefone inválido');
            }

            console.log(`[WHATSAPP] Enviando para ${telefoneFormatado}: ${mensagem.substring(0, 50)}...`);
            
            // Se o cliente Twilio estiver configurado, usar a API real
            if (this.twilioClient) {
                const message = await this.twilioClient.messages.create({
                    body: mensagem,
                    from: this.twilioConfig.whatsappNumber,
                    to: telefoneFormatado
                });

                console.log(`[WHATSAPP] Mensagem enviada com sucesso. SID: ${message.sid}`);
                return { 
                    sucesso: true, 
                    messageId: message.sid,
                    status: message.status,
                    telefone: telefoneFormatado
                };
            } else {
                // Modo simulação melhorado para desenvolvimento
                console.log(`[WHATSAPP] SIMULAÇÃO - Mensagem para ${telefoneFormatado}`);
                console.log(`[WHATSAPP] SIMULAÇÃO - Conteúdo: ${mensagem}`);
                
                // Simular diferentes cenários
                const random = Math.random();
                if (random > 0.95) {
                    throw new Error('Número não registrado no WhatsApp');
                } else if (random > 0.9) {
                    throw new Error('Limite de mensagens excedido');
                } else {
                    const messageId = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    console.log(`[WHATSAPP] SIMULAÇÃO - Mensagem enviada com sucesso. ID: ${messageId}`);
                    return { 
                        sucesso: true, 
                        messageId: messageId,
                        status: 'sent',
                        telefone: telefoneFormatado,
                        simulacao: true
                    };
                }
            }
        } catch (error) {
            console.error(`[WHATSAPP] Erro ao enviar para ${telefone}:`, error);
            
            // Categorizar tipos de erro
            let tipoErro = 'unknown';
            if (error.message.includes('não registrado')) {
                tipoErro = 'not_registered';
            } else if (error.message.includes('limite')) {
                tipoErro = 'rate_limit';
            } else if (error.message.includes('inválido')) {
                tipoErro = 'invalid_number';
            } else if (error.code === 21211) {
                tipoErro = 'invalid_number';
            } else if (error.code === 63016) {
                tipoErro = 'not_registered';
            }

            return { 
                sucesso: false, 
                erro: error.message,
                tipoErro: tipoErro,
                telefone: telefone
            };
        }
    }

    // Notificação de embarque
    async notificarEmbarque(crianca, responsavel, localizacao) {
        const { nome } = crianca;
        const { nome: nomeResponsavel, telefone, email, preferencias_notificacao } = responsavel;
        
        const timestamp = new Date().toLocaleString('pt-BR');
        const mapsLink = `https://maps.google.com/?q=${localizacao.latitude},${localizacao.longitude}`;

        // Conteúdo da notificação
        const assunto = `🚌 ${nome} embarcou no transporte escolar`;
        const mensagemTexto = `Olá ${nomeResponsavel}! ${nome} embarcou no transporte escolar às ${timestamp}. Localização: ${mapsLink}`;
        
        const mensagemHTML = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #4CAF50;">🚌 Embarque Confirmado</h2>
                <p>Olá <strong>${nomeResponsavel}</strong>,</p>
                <p><strong>${nome}</strong> embarcou no transporte escolar com segurança.</p>
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
                    <p><strong>⏰ Horário:</strong> ${timestamp}</p>
                    <p><strong>📍 Localização:</strong> <a href="${mapsLink}" target="_blank">Ver no mapa</a></p>
                </div>
                <p style="color: #666; font-size: 12px;">Kanghoo - Transporte Escolar Seguro</p>
            </div>
        `;

        const resultados = [];

        // Enviar por email se configurado
        if (preferencias_notificacao.tipo === 'email' || preferencias_notificacao.tipo === 'ambos') {
            const resultadoEmail = await this.enviarEmail(email, assunto, mensagemHTML);
            resultados.push({ tipo: 'email', ...resultadoEmail });
        }

        // Enviar por WhatsApp se configurado
        if (preferencias_notificacao.tipo === 'whatsapp' || preferencias_notificacao.tipo === 'ambos') {
            const resultadoWhatsApp = await this.enviarWhatsApp(telefone, mensagemTexto);
            resultados.push({ tipo: 'whatsapp', ...resultadoWhatsApp });
        }

        return resultados;
    }

    // Nova funcionalidade: Notificação de atraso
    async notificarAtraso(crianca, responsavel, minutosAtraso, novoHorario) {
        const { nome } = crianca;
        const { nome: nomeResponsavel, telefone, email, preferencias_notificacao } = responsavel;
        
        const assunto = `⏰ Atraso no transporte de ${nome}`;
        const mensagemWhatsApp = this.whatsappTemplates.atraso(nome, minutosAtraso, novoHorario);
        
        const mensagemHTML = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #FF9800;">⏰ Aviso de Atraso</h2>
                <p>Olá <strong>${nomeResponsavel}</strong>,</p>
                <p>O transporte de <strong>${nome}</strong> está atrasado.</p>
                <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #ffc107;">
                    <p><strong>⏰ Atraso:</strong> ${minutosAtraso} minutos</p>
                    <p><strong>🕐 Novo horário previsto:</strong> ${novoHorario}</p>
                </div>
                <p style="color: #666; font-size: 12px;">Kanghoo - Transporte Escolar Seguro</p>
            </div>
        `;

        const resultados = [];

        if (preferencias_notificacao.tipo === 'email' || preferencias_notificacao.tipo === 'ambos') {
            const resultadoEmail = await this.enviarEmail(email, assunto, mensagemHTML);
            resultados.push({ tipo: 'email', ...resultadoEmail });
        }

        if (preferencias_notificacao.tipo === 'whatsapp' || preferencias_notificacao.tipo === 'ambos') {
            const resultadoWhatsApp = await this.enviarWhatsApp(telefone, mensagemWhatsApp, 'atraso');
            resultados.push({ tipo: 'whatsapp', ...resultadoWhatsApp });
        }

        return resultados;
    }

    // Nova funcionalidade: Notificação de emergência
    async notificarEmergencia(crianca, responsavel, tipoEmergencia, localizacao, detalhes = '') {
        const { nome } = crianca;
        const { nome: nomeResponsavel, telefone, email } = responsavel;
        
        const timestamp = new Date().toLocaleString('pt-BR');
        const mapsLink = `https://maps.google.com/?q=${localizacao.latitude},${localizacao.longitude}`;

        const assunto = `🚨 EMERGÊNCIA - ${nome}`;
        const mensagemWhatsApp = this.whatsappTemplates.emergencia(nome, tipoEmergencia, mapsLink);
        
        const mensagemHTML = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #dc3545; background-color: #f8d7da; padding: 15px; border-radius: 5px;">🚨 EMERGÊNCIA</h2>
                <p>Olá <strong>${nomeResponsavel}</strong>,</p>
                <p><strong>ATENÇÃO:</strong> Situação de emergência envolvendo <strong>${nome}</strong>.</p>
                <div style="background-color: #f8d7da; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #dc3545;">
                    <p><strong>🚨 Tipo:</strong> ${tipoEmergencia}</p>
                    <p><strong>⏰ Horário:</strong> ${timestamp}</p>
                    <p><strong>📍 Localização:</strong> <a href="${mapsLink}" target="_blank">Ver no mapa</a></p>
                    ${detalhes ? `<p><strong>📝 Detalhes:</strong> ${detalhes}</p>` : ''}
                </div>
                <p style="color: #dc3545; font-weight: bold;">Entre em contato imediatamente!</p>
                <p style="color: #666; font-size: 12px;">Kanghoo - Transporte Escolar Seguro</p>
            </div>
        `;

        const resultados = [];

        // Para emergências, sempre enviar por todos os canais disponíveis
        const resultadoEmail = await this.enviarEmail(email, assunto, mensagemHTML);
        resultados.push({ tipo: 'email', ...resultadoEmail });

        const resultadoWhatsApp = await this.enviarWhatsApp(telefone, mensagemWhatsApp, 'emergencia');
        resultados.push({ tipo: 'whatsapp', ...resultadoWhatsApp });

        return resultados;
    }

    // Nova funcionalidade: Envio em lote para múltiplos responsáveis
    async enviarNotificacaoLote(responsaveis, assunto, mensagem, tipo = 'informativo') {
        const resultados = [];
        const batchSize = 5; // Processar 5 por vez para evitar rate limiting

        for (let i = 0; i < responsaveis.length; i += batchSize) {
            const batch = responsaveis.slice(i, i + batchSize);
            const promessas = batch.map(async (responsavel) => {
                const { nome, telefone, email, preferencias_notificacao } = responsavel;
                const resultadosResponsavel = [];

                try {
                    if (preferencias_notificacao.tipo === 'email' || preferencias_notificacao.tipo === 'ambos') {
                        const resultadoEmail = await this.enviarEmail(email, assunto, mensagem);
                        resultadosResponsavel.push({ tipo: 'email', responsavel: nome, ...resultadoEmail });
                    }

                    if (preferencias_notificacao.tipo === 'whatsapp' || preferencias_notificacao.tipo === 'ambos') {
                        const resultadoWhatsApp = await this.enviarWhatsApp(telefone, mensagem, tipo);
                        resultadosResponsavel.push({ tipo: 'whatsapp', responsavel: nome, ...resultadoWhatsApp });
                    }
                } catch (error) {
                    resultadosResponsavel.push({ 
                        tipo: 'erro', 
                        responsavel: nome, 
                        sucesso: false, 
                        erro: error.message 
                    });
                }

                return resultadosResponsavel;
            });

            const resultadosBatch = await Promise.all(promessas);
            resultados.push(...resultadosBatch.flat());

            // Aguardar um pouco entre batches para evitar rate limiting
            if (i + batchSize < responsaveis.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        return resultados;
    }

    // Nova funcionalidade: Verificar status de entrega das mensagens
    async verificarStatusMensagem(messageId) {
        if (!this.twilioClient || !messageId || messageId.startsWith('sim_')) {
            return { 
                status: 'unknown', 
                simulacao: messageId?.startsWith('sim_') || false 
            };
        }

        try {
            const message = await this.twilioClient.messages(messageId).fetch();
            return {
                status: message.status,
                errorCode: message.errorCode,
                errorMessage: message.errorMessage,
                dateCreated: message.dateCreated,
                dateSent: message.dateSent,
                dateUpdated: message.dateUpdated
            };
        } catch (error) {
            console.error(`[WHATSAPP] Erro ao verificar status da mensagem ${messageId}:`, error);
            return { 
                status: 'error', 
                erro: error.message 
            };
        }
    }

    // Nova funcionalidade: Obter estatísticas de envio
    async obterEstatisticasEnvio(dataInicio, dataFim) {
        const stats = {
            total: 0,
            enviadas: 0,
            entregues: 0,
            falharam: 0,
            pendentes: 0,
            porTipo: {
                email: { total: 0, sucesso: 0, falha: 0 },
                whatsapp: { total: 0, sucesso: 0, falha: 0 }
            }
        };

        // Aqui você implementaria a lógica para buscar estatísticas do banco de dados
        // Por enquanto, retornamos estatísticas simuladas
        console.log(`[STATS] Obtendo estatísticas de ${dataInicio} até ${dataFim}`);
        
        return stats;
    }

    // Notificação de desembarque
    async notificarDesembarque(crianca, responsavel, localizacao) {
        const { nome } = crianca;
        const { nome: nomeResponsavel, telefone, email, preferencias_notificacao } = responsavel;
        
        const timestamp = new Date().toLocaleString('pt-BR');
        const mapsLink = `https://maps.google.com/?q=${localizacao.latitude},${localizacao.longitude}`;

        const assunto = `🏫 ${nome} chegou ao destino`;
        const mensagemTexto = `Olá ${nomeResponsavel}! ${nome} chegou ao destino às ${timestamp}. Localização: ${mapsLink}`;
        
        const mensagemHTML = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2196F3;">🏫 Chegada Confirmada</h2>
                <p>Olá <strong>${nomeResponsavel}</strong>,</p>
                <p><strong>${nome}</strong> chegou ao destino com segurança.</p>
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
                    <p><strong>⏰ Horário:</strong> ${timestamp}</p>
                    <p><strong>📍 Localização:</strong> <a href="${mapsLink}" target="_blank">Ver no mapa</a></p>
                </div>
                <p style="color: #666; font-size: 12px;">Kanghoo - Transporte Escolar Seguro</p>
            </div>
        `;

        const resultados = [];

        if (preferencias_notificacao.tipo === 'email' || preferencias_notificacao.tipo === 'ambos') {
            const resultadoEmail = await this.enviarEmail(email, assunto, mensagemHTML);
            resultados.push({ tipo: 'email', ...resultadoEmail });
        }

        if (preferencias_notificacao.tipo === 'whatsapp' || preferencias_notificacao.tipo === 'ambos') {
            const resultadoWhatsApp = await this.enviarWhatsApp(telefone, mensagemTexto);
            resultados.push({ tipo: 'whatsapp', ...resultadoWhatsApp });
        }

        return resultados;
    }

    // Notificação de localização durante o trajeto
    async notificarLocalizacao(crianca, responsavel, localizacao, dadosViagem) {
        const { nome } = crianca;
        const { nome: nomeResponsavel, telefone, email, preferencias_notificacao } = responsavel;
        
        const timestamp = new Date().toLocaleString('pt-BR');
        const mapsLink = `https://maps.google.com/?q=${localizacao.latitude},${localizacao.longitude}`;

        const assunto = `📍 Localização de ${nome}`;
        const mensagemTexto = `${nome} está em trânsito. Velocidade: ${dadosViagem.velocidade}km/h. Localização: ${mapsLink}`;
        
        const mensagemHTML = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #FF9800;">📍 Atualização de Localização</h2>
                <p><strong>${nome}</strong> está em trânsito.</p>
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
                    <p><strong>⏰ Atualização:</strong> ${timestamp}</p>
                    <p><strong>🚗 Velocidade:</strong> ${dadosViagem.velocidade} km/h</p>
                    <p><strong>📍 Localização:</strong> <a href="${mapsLink}" target="_blank">Ver no mapa</a></p>
                </div>
                <p style="color: #666; font-size: 12px;">Kanghoo - Transporte Escolar Seguro</p>
            </div>
        `;

        const resultados = [];

        if (preferencias_notificacao.tipo === 'email' || preferencias_notificacao.tipo === 'ambos') {
            const resultadoEmail = await this.enviarEmail(email, assunto, mensagemHTML);
            resultados.push({ tipo: 'email', ...resultadoEmail });
        }

        if (preferencias_notificacao.tipo === 'whatsapp' || preferencias_notificacao.tipo === 'ambos') {
            const resultadoWhatsApp = await this.enviarWhatsApp(telefone, mensagemTexto);
            resultados.push({ tipo: 'whatsapp', ...resultadoWhatsApp });
        }

        return resultados;
    }

    // Verificar se deve enviar notificação baseado na frequência
    deveEnviarNotificacao(ultimaNotificacao, frequencia) {
        if (!ultimaNotificacao) return true;

        const agora = new Date();
        const ultima = new Date(ultimaNotificacao);
        const diferencaMinutos = (agora - ultima) / (1000 * 60);

        switch (frequencia) {
            case '5min':
                return diferencaMinutos >= 5;
            case '15min':
                return diferencaMinutos >= 15;
            case 'chegada_saida':
                return false; // Só envia em embarque/desembarque
            default:
                return diferencaMinutos >= 15;
        }
    }
}

module.exports = NotificationService;