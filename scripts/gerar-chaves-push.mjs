/**
 * Gera o par de chaves VAPID do push. Roda uma vez; o par é fixo para sempre.
 * Trocar as chaves depois invalida todas as assinaturas já registradas.
 */
import webpush from "web-push";

const { publicKey, privateKey } = webpush.generateVAPIDKeys();

console.log(`
Guarde estas linhas nas variáveis de ambiente (Vercel e .env.local):

VAPID_PUBLIC_KEY=${publicKey}
NEXT_PUBLIC_VAPID_PUBLIC_KEY=${publicKey}
VAPID_PRIVATE_KEY=${privateKey}

A privada nunca sai do servidor.
`);
