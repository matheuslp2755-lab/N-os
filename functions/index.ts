import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';

admin.initializeApp();

const ONESIGNAL_APP_ID = 'e1dcfeb7-6f34-440a-b65c-f61e2b3253a2';
const ONESIGNAL_REST_KEY = 'os_v2_app_4hop5n3pgrcavns46ypcwmstujyv4dga5npeinn5ydjjp2ewvmjih7brfkklwx4gvd774vehuhyt5gwzolbtcru56aob6up6zbrrlxq';

/**
 * Helper para enviar notificação OneSignal via External ID
 */
async function sendPush(targetUserId: string, title: string, message: string, data: any = {}) {
    try {
        const payload = {
            app_id: ONESIGNAL_APP_ID,
            // Usamos o external_id que é o UID do Firebase configurado no frontend
            include_external_user_ids: [targetUserId],
            headings: { pt: title, en: title },
            contents: { pt: message, en: message },
            data: data,
            android_accent_color: "0ea5e9",
            small_icon: "ic_stat_onesignal_default"
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
        console.log(`Push enviado para ${targetUserId}:`, response.data);
        return response.data;
    } catch (error: any) {
        console.error(`Erro ao enviar push para ${targetUserId}:`, error?.response?.data || error.message);
        return null;
    }
}

/**
 * Gatilho: Nova Mensagem no Chat
 */
export const onNewMessagePush = functions.firestore
    .document('conversations/{conversationId}/messages/{messageId}')
    .onCreate(async (snap, context) => {
        const msg = snap.data();
        if (!msg || msg.senderId === 'system') return null;

        const { conversationId } = context.params;
        const convDoc = await admin.firestore().collection('conversations').doc(conversationId).get();
        const convData = convDoc.data();
        if (!convData) return null;

        const recipientId = (convData.participants as string[]).find(uid => uid !== msg.senderId);
        if (!recipientId) return null;

        const senderDoc = await admin.firestore().collection('users').doc(msg.senderId).get();
        const senderName = senderDoc.data()?.username || "Alguém";

        return sendPush(
            recipientId, 
            "Nova Mensagem", 
            `${senderName}: ${msg.text || '📷 Mídia enviada'}`,
            { type: 'CHAT', conversationId }
        );
    });

/**
 * Gatilho: Nova Chamada (Ligação)
 */
export const onNewCallPush = functions.firestore
    .document('calls/{callId}')
    .onCreate(async (snap, context) => {
        const call = snap.data();
        if (!call || call.status !== 'ringing') return null;

        const { callId } = context.params;
        const callerName = call.callerUsername || "Alguém";
        const callType = call.type === 'video' ? 'Chamada de Vídeo' : 'Chamada de Voz';

        return sendPush(
            call.receiverId,
            `📞 ${callerName}`,
            `Iniciando ${callType}...`,
            { type: 'CALL', callId }
        );
    });
