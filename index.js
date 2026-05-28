// backend/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

console.log('🔑 GROQ carregada?', !!process.env.GROQ_API_KEY);
console.log('🔑 OPENAI carregada?', !!process.env.OPENAI_API_KEY);

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Lista de saudações amigáveis
const saudacoes = ['oi', 'ola', 'olá', 'oi, tudo bem', 'oi tudo bem', 'oie', 'opa', 'e aí', 'salve', 'tudo bem', 'bom dia', 'boa tarde', 'boa noite'];

// =====================================================
// ROTA PRINCIPAL - CHAT E TEXTO
// =====================================================
app.post('/api/ia', async (req, res) => {
    try {
        const { messages, prompt, temperature } = req.body;
        
        // Se veio com messages (formato com system + user)
        if (messages && Array.isArray(messages) && messages.length > 0) {
            
            const ultimaMsg = messages[messages.length - 1].content.toLowerCase().trim();
            const ehSaudacao = saudacoes.includes(ultimaMsg);
            
            // Resposta amigável para saudações
            if (ehSaudacao) {
                return res.json({ 
                    success: true, 
                    resposta: "Oi! Como vão as coisas por aí? Tem algo em que eu possa te ajudar hoje ou você gostaria apenas de conversar e trocar umas ideias?" 
                });
            }

            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: messages,
                    temperature: temperature !== undefined ? temperature : 0.5
                })
            });
            
            const data = await response.json();
            if (!response.ok) throw new Error(data.error?.message || 'Erro na API Groq');
            
            const resposta = data.choices[0].message.content;
            res.json({ success: true, resposta });
            return;
        }
        
        // Fallback: se veio só com prompt (texto puro)
        if (prompt) {
            const promptLimpo = prompt.toLowerCase().trim();
            const ehSaudacao = saudacoes.includes(promptLimpo);
            
            if (ehSaudacao) {
                return res.json({ 
                    success: true, 
                    resposta: "Oi! Como vão as coisas por aí? Tem algo em que eu possa te ajudar hoje ou você gostaria apenas de conversar e trocar umas ideias?" 
                });
            }

            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        { role: 'system', content: 'Você é a OllivIA, uma assistente educacional brasileira. Responda estritamente em português do Brasil de forma natural e acolhedora.' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.2
                })
            });
            
            const data = await response.json();
            if (!response.ok) throw new Error(data.error?.message || 'Erro na API Groq');
            
            const resposta = data.choices[0].message.content;
            res.json({ success: true, resposta });
            return;
        }
        
        res.status(400).json({ success: false, erro: 'Nenhuma mensagem fornecida' });
        
    } catch (erro) {
        console.error('❌ ERRO NO BACKEND:', erro);
        res.status(500).json({ success: false, erro: erro.message });
    }
});

// =====================================================
// ROTA DE VISÃO (LABORATÓRIO)
// =====================================================
app.post('/api/ia-vision', async (req, res) => {
    try {
        const { imagem, prompt } = req.body;

        if (!imagem) {
            return res.status(400).json({ success: false, erro: 'Nenhuma imagem enviada para análise.' });
        }

        const response = await openai.chat.completions.create({
            model: "gpt-4.5-mini",
            messages: [
                {
                    role: "system",
                    content: "Você é a OllivIA, especialista em análise audiovisual pedagógica. Responda estritamente em português do Brasil."
                },
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt || "Analise esta imagem para uso pedagógico." },
                        {
                            type: "image_url",
                            image_url: { url: imagem }
                        }
                    ]
                }
            ],
            max_tokens: 1000
        });

        const resposta = response.choices[0].message.content;
        res.json({ success: true, resposta });

    } catch (erro) {
        console.error('❌ ERRO NO BACKEND (OPENAI VISION):', erro);
        res.status(500).json({ success: false, erro: erro.message });
    }
});

// Rota de teste
app.get('/api/ia', (req, res) => {
    res.json({ success: true, message: 'API OllivIA está rodando!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Backend rodando na porta ${PORT}`);
});
