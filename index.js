const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

app.post('/api/ia', async (req, res) => {

    try {

        const { prompt } = req.body;

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

                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ]
                })
            }
        );

        const data = await respostaGroq.json();

        res.json({
            resposta: data.choices[0].message.content
        });

    } catch (erro) {

        console.error(erro);

        res.status(500).json({
            erro: 'Erro IA'
        });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
