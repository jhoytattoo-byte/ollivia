import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Inicializa as variáveis de ambiente
dotenv.config();

const app = express();

// Configuração de Middlewares
app.use(cors());
app.use(express.json());

// 🛡️ BLINDAGEM MÁXIMA CONTRA CRASHES NA NUVEM
process.on('unhandledRejection', (reason) => {
    console.error('🚨 [CRASH EVITADO] Rejeição de Promise não tratada no Render:', reason);
});
process.on('uncaughtException', (error) => {
    console.error('🚨 [CRASH EVITADO] Exceção não capturada no Render:', error);
});

// Rota de Integração com Suporte a Fallback Automático (Groq ➡️ OpenAI)
app.post('/api/ia', async (req, res) => {
    try {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ erro: 'O campo prompt é obrigatório.' });
        }

        // ==========================================
        // 🚀 TENTATIVA 1: GROQ (API PRINCIPAL)
        // ==========================================
        try {
            console.log("📡 Disparando requisição para API Principal (Groq)...");
            
            if (!process.env.GROQ_API_KEY) {
                throw new Error('GROQ_API_KEY não encontrada nas variáveis de ambiente.');
            }

            const respostaGroq = await fetch(
                'https://api.groq.com/openai/v1/chat/completions',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
                    },
                    body: JSON.stringify({
                        model: 'llama-3.3-70b-versatile',
                        messages: [{ role: 'user', content: prompt }]
                    })
                }
            );

            const data = await respostaGroq.json();

            if (!respostaGroq.ok || !data.choices) {
                throw new Error(data.error?.message || 'Resposta inválida ou erro de cota na Groq');
            }

            console.log("✅ Sucesso total com a API da Groq!");
            return res.json({ resposta: data.choices[0].message.content });

        } catch (erroGroq) {
            console.warn("⚠️ [AVISO] Groq falhou ou bloqueou a requisição na nuvem:", erroGroq.message);
            console.log("🔄 Acionando Plano de Contingência: Chamando OpenAI (Fallback)...");

            // ==========================================
            // 🔄 TENTATIVA 2: OPENAI (PLANO B / FALLBACK)
            // ==========================================
            try {
                if (!process.env.OPENAI_API_KEY) {
                    throw new Error('OPENAI_API_KEY não configurada no ambiente do Render.');
                }

                const respostaOpenAI = await fetch(
                    'https://api.openai.com/v1/chat/completions',
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
                        },
                        body: JSON.stringify({
                            model: 'gpt-4o-mini',
                            messages: [{ role: 'user', content: prompt }]
                        })
                    }
                );

                const dataOpenAI = await respostaOpenAI.json();

                if (!respostaOpenAI.ok || !dataOpenAI.choices) {
                    throw new Error(dataOpenAI.error?.message || 'Resposta inválida na API da OpenAI');
                }

                console.log("🔥 Sistema salvo pela OpenAI! Resposta entregue com sucesso.");
                return res.json({ resposta: dataOpenAI.choices[0].message.content });

            } catch (erroOpenAI) {
                console.error('❌ [ERRO CRÍTICO] Ambas as APIs de IA (Groq e OpenAI) falharam.');
                return res.status(500).json({
                    erro: 'Erro de comunicação com ambas as provedoras de IA.',
                    detalhesGroq: erroGroq.message,
                    detalhesOpenAI: erroOpenAI.message
                });
            }
        }

    } catch (erroGeral) {
        console.error('[Erro Interno Extremo]:', erroGeral);
        return res.status(500).json({
            erro: 'Erro interno crítico ao processar a requisição.'
        });
    }
});

// 🎯 CONFIGURAÇÃO CORRETA DE PORTA PARA O RENDER
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor OllivIA rodando com sucesso na porta ${PORT}`);
});
