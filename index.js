const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Saudações amigáveis
const saudacoes = ['oi', 'ola', 'olá', 'oi tudo bem', 'tudo bem', 'oie', 'opa'];

app.post('/api/ia', async (req, res) => {
    const { prompt } = req.body;
    
    // Resposta para saudações
    if (saudacoes.includes(prompt.toLowerCase().trim())) {
        return res.json({ 
            success: true, 
            resposta: "Oi! Como vão as coisas por aí? Tem algo em que eu possa te ajudar hoje?"
        });
    }
    
    try {
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

app.get('/api/ia', (req, res) => {
    res.json({ success: true, message: 'API OllivIA rodando' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Backend rodando na porta ${PORT}`);
});
