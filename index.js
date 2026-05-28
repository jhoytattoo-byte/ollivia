const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ROTA PRINCIPAL DA IA
app.post('/api/ia', async (req, res) => {
    try {
        const { prompt } = req.body;

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7
            })
        });

        const data = await response.json();
        const resposta = data.choices[0].message.content;

        res.json({ success: true, resposta });

    } catch (error) {
        console.error('Erro:', error);
        res.status(500).json({ success: false, erro: error.message });
    }
});

// ROTA DE TESTE (opcional)
app.get('/api/ia', (req, res) => {
    res.json({ success: true, message: 'API OllivIA está rodando!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Backend rodando na porta ${PORT}`);
});
