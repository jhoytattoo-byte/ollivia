const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

exports.kiwifyWebhook = functions.https.onRequest(async (req, res) => {
    // Permite apenas POST
    if (req.method !== 'POST') {
        res.status(405).send('Method not allowed');
        return;
    }

    try {
        const data = req.body;
        
        // Identifica o evento
        const event = data.event;
        const customerEmail = data.customer?.email;
        const productName = data.product?.name;
        const status = data.order_status;

        console.log('📩 Webhook recebido:', { event, customerEmail, productName, status });

        if (!customerEmail) {
            res.status(400).send('Email não encontrado');
            return;
        }

        // Busca o professor pelo email
        const professoresRef = db.collection('professores');
        const snapshot = await professoresRef.where('email', '==', customerEmail).get();

        if (snapshot.empty) {
            console.log('❌ Professor não encontrado:', customerEmail);
            res.status(404).send('Professor não encontrado');
            return;
        }

        const doc = snapshot.docs[0];
        const uid = doc.id;

        // ========== COMPRA APROVADA ==========
        if (event === 'compra_aprovada' || status === 'paid') {
            const plano = productName?.toLowerCase().includes('master') ? 'master' : 'assinante';
            
            const dataExpiracao = new Date();
            dataExpiracao.setDate(dataExpiracao.getDate() + 30);

            await db.collection('professores').doc(uid).update({
                plano: plano,
                status: 'ativo',
                dataExpiracao: admin.firestore.Timestamp.fromDate(dataExpiracao),
                atualizadoEm: admin.firestore.Timestamp.now(),
                trial: false
            });

            // 🔥 REGISTRAR EVENTO DE PAGAMENTO
            await db.collection('eventos').add({
                tipo: 'pagamento_aprovado',
                uid: uid,
                email: customerEmail,
                plano: plano,
                valor: plano === 'master' ? 79.90 : 59.90,
                produto: productName,
                timestamp: admin.firestore.Timestamp.now(),
                origem: 'kiwify_webhook'
            });

            console.log(`✅ Usuário ${customerEmail} atualizado para ${plano}`);
            res.status(200).send({ success: true, message: `Plano ${plano} ativado` });
        }
        
        // ========== ASSINATURA CANCELADA ==========
        else if (event === 'assinatura_cancelada') {
            await db.collection('professores').doc(uid).update({
                status: 'cancelado',
                canceladoEm: admin.firestore.Timestamp.now()
            });
            
            // 🔥 REGISTRAR EVENTO DE CANCELAMENTO
            await db.collection('eventos').add({
                tipo: 'assinatura_cancelada',
                uid: uid,
                email: customerEmail,
                timestamp: admin.firestore.Timestamp.now(),
                origem: 'kiwify_webhook'
            });

            console.log(`❌ Assinatura cancelada: ${customerEmail}`);
            res.status(200).send({ success: true, message: 'Assinatura cancelada' });
        }
        
        // ========== ASSINATURA RENOVADA ==========
        else if (event === 'assinatura_renovada') {
            const dataExpiracao = new Date();
            dataExpiracao.setDate(dataExpiracao.getDate() + 30);

            await db.collection('professores').doc(uid).update({
                status: 'ativo',
                dataExpiracao: admin.firestore.Timestamp.fromDate(dataExpiracao),
                atualizadoEm: admin.firestore.Timestamp.now()
            });

            await db.collection('eventos').add({
                tipo: 'assinatura_renovada',
                uid: uid,
                email: customerEmail,
                timestamp: admin.firestore.Timestamp.now(),
                origem: 'kiwify_webhook'
            });

            console.log(`🔄 Assinatura renovada: ${customerEmail}`);
            res.status(200).send({ success: true, message: 'Assinatura renovada' });
        }
        
        else {
            console.log('ℹ️ Evento não tratado:', event);
            res.status(200).send({ success: true, message: 'Evento recebido' });
        }

    } catch (erro) {
        console.error('❌ Erro no webhook:', erro);
        res.status(500).send({ error: erro.message });
    }
});