/**
 * FIREBASE CLOUD FUNCTIONS - BACKEND SEGURO
 * Este arquivo processa as notificações push do Néos.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';

admin.initializeApp();

// Credenciais REAIS fornecidas
const ONESIGNAL_APP_ID = 'c7219360-ec10-4c6e-a599-0255216ec17e';
const ONESIGNAL_REST_KEY = 'os_v2_app_y4qzgyhmcbgg5jmzajksc3wbpy55kqtxifkehyno3fvildcv3nmghik3flupkwwhqppylcm55euqha7jdf3r55gtgs2ep3cl7kgwozy';

/**
 * Gatilho de Nova Mensagem
 * Monitora a subcoleção 'messages' dentro de qualquer conversa.
 */
export const onNewMessageNotify = functions.firestore
    .document('conversations/{conversationId}/messages/{messageId}')
    .onCreate(async (snapshot, context) => {
        const messageData = snapshot.data();
        if (!messageData) return null;

        const conversationId = context.params.conversationId;
        const senderId = messageData.senderId;

        // Evita disparar notificação para mensagens do sistema
        if (senderId === 'system') return null;

        try {
            // 1. Localizar destinatário na conversa
            const convDoc = await admin.firestore().collection('conversations').doc(conversationId).get();
            const convData = convDoc.data();
            if (!convData) return null;

            const participants = convData.participants as string[];
            const recipientId = participants.find(uid => uid !== senderId);
            if (!recipientId) return null;

            // 2. Buscar o Player ID (Subscription ID) do destinatário
            const recipientDoc = await admin.firestore().collection('users').doc(recipientId).get();
            const recipientData = recipientDoc.data();
            const playerId = recipientData?.oneSignalPlayerId;

            if (!playerId) {
                console.log(`Push Néos: Usuário ${recipientId} sem ID de push ativo.`);
                return null;
            }

            // 3. Identificar o remetente para o título
            const senderDoc = await admin.firestore().collection('users').doc(senderId).get();
            const senderName = senderDoc.data()?.username || "Alguém";

            // 4. Payload da API REST do OneSignal
            const payload = {
                app_id: ONESIGNAL_APP_ID,
                include_subscription_ids: [playerId],
                headings: { 
                    en: "Néos: Nova Mensagem", 
                    pt: "Néos: Nova Mensagem" 
                },
                contents: { 
                    en: `${senderName}: ${messageData.text}`, 
                    pt: `${senderName}: ${messageData.text}` 
                },
                // Atributos de navegação e visual
                data: { 
                    conversationId: conversationId,
                    type: "CHAT_MESSAGE" 
                },
                android_accent_color: "0ea5e9", 
                small_icon: "ic_stat_onesignal_default"
            };

            // 5. Requisição para o servidor do OneSignal
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

            console.log(`Push Néos enviado para ${recipientId}. ID:`, response.data.id);
            return response.data;

        } catch (error: any) {
            console.error('Erro Crítico no Push Néos:', error?.response?.data || error.message);
            return null;
        }
    });