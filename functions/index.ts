import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';

admin.initializeApp();

const ONESIGNAL_APP_ID = 'e1dcfeb7-6f34-440a-b65c-f61e2b3253a2';
// Chave REST API (Mantenha em segredo, usada apenas no backend)
const ONESIGNAL_REST_KEY = 'os_v2_app_4hop5n3pgrcavns46ypcwmstujyv4dga5npeinn5ydjjp2ewvmjih7brfkklwx4gvd774vehuhyt5gwzolbtcru56aob6up6zbrrlxq';

/**
 * Envia notificação push via OneSignal utilizando External ID (UID do Firebase)
 */
async function sendPush(targetUserId: string, title: string, message: string, data: any = {}) {
    try {
        const payload = {
            app_id: ONESIGNAL_APP_ID,
            // Importante: Alvos baseados no login(user.uid) feito no frontend
            include_external_user_ids: [targetUserId],
            headings: { en: title, pt: title },
            contents: { en: message, pt: message },
            data: data,
            // Configurações para garantir entrega imediata e som
            priority: 10,
            android_visibility: 1,
            ios_badgeType: 'Increase',
            ios_badgeCount: 1
        };

        const response = await axios.post(
            'https://onesignal.com/api/v1/notifications',
            payload,
            {
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Authorization': `Basic ${ONESIGNAL_REST_KEY}`
                }
            }
        );
        console.log(`Push enviado com sucesso para ${targetUserId}:`, response.data);
        return response.data;
    } catch (error: any) {
        console.error(`Falha no envio de Push para ${targetUserId}:`, error?.response?.data || error.message);
        return null;
    }
}

/**
 * Gatilho: Monitora novas mensagens no Firestore
 */
export const onNewMessagePush = functions.firestore
    .document('conversations/{conversationId}/messages/{messageId}')
    .onCreate(async (snap, context) => {
        const msg = snap.data();
        if (!msg || msg.senderId === 'system') return null;

        const { conversationId } = context.params;
        
        // Busca a conversa para saber quem é o destinatário
        const convDoc = await admin.firestore().collection('conversations').doc(conversationId).get();
        const convData = convDoc.data();
        if (!convData) return null;

        const recipientId = (convData.participants as string[]).find(uid => uid !== msg.senderId);
        if (!recipientId) return null;

        // Busca nome do remetente para a notificação
        const senderDoc = await admin.firestore().collection('users').doc(msg.senderId).get();
        const senderName = senderDoc.data()?.username || "Alguém";

        return sendPush(
            recipientId, 
            "Nova Mensagem", 
            `${senderName}: ${msg.text || '📷 Enviou uma mídia'}`,
            { type: 'CHAT', conversationId }
        );
    });

/**
 * Gatilho: Monitora novas chamadas (ligações)
 */
export const onNewCallPush = functions.firestore
    .document('calls/{callId}')
    .onCreate(async (snap, context) => {
        const call = snap.data();
        // Apenas notifica se a chamada estiver no estado inicial de toque
        if (!call || call.status !== 'ringing') return null;

        const callerName = call.callerUsername || "Alguém";
        const callType = call.type === 'video' ? 'Chamada de Vídeo' : 'Chamada de Voz';

        return sendPush(
            call.receiverId,
            `Chamada de ${callerName}`,
            `Iniciando ${callType}...`,
            { type: 'CALL', callId: context.params.callId }
        );
    });
