import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// 1. Rota de diagnóstico (Previne erro 404/Inválida no navegador)
app.get('/api/ia', (req, res) => {
    res.json({ 
        status: "online", 
        mensagem: "Servidor OllivIA está operacional. Envie um POST para /api/ia com um JSON contendo 'prompt'." 
    });
});

// 2. Rota principal de IA
app.post('/api/ia', async (req, res) => {
    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ erro: 'O campo prompt é obrigatório.' });
    }

    try {
        // Tentativa Groq
        const respostaGroq = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: prompt }]
            })
        });

        const data = await respostaGroq.json();

        if (respostaGroq.ok && data.choices) {
            return res.json({ resposta: data.choices[0].message.content });
        }

        throw new Error('Groq falhou');

    } catch (erro) {
        console.warn("Groq falhou, tentando OpenAI...");
        
        try {
            const respostaOpenAI = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [{ role: 'user', content: prompt }]
                })
            });

            const dataOpenAI = await respostaOpenAI.json();
            return res.json({ resposta: dataOpenAI.choices[0].message.content });
            
        } catch (erroFinal) {
            return res.status(500).json({ erro: 'Falha crítica em ambos os provedores.' });
        }
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
