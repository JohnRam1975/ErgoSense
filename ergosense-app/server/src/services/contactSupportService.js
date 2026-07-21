/**
 * Contato com o suporte ErgoSense
 */
import { query } from '../db.js';
import { sanitizePlainText, sanitizeEmail } from '../auth/sanitize.js';
import { config } from '../config/env.js';
import { sendSupportContactEmail } from './emailNotificationService.js';

function nextProtocol() {
  const d = new Date();
  const y = d.getFullYear().toString().slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `SUP-${y}${m}${day}-${rand}`;
}

export async function createSupportContact(payload, meta = {}) {
  const nome = sanitizePlainText(payload.nome, 200);
  const email = sanitizeEmail(payload.email);
  const telefone = sanitizePlainText(payload.telefone ?? '', 64) || null;
  const empresa = sanitizePlainText(payload.empresa ?? '', 255) || null;
  const assunto = sanitizePlainText(payload.assunto, 120);
  const mensagem = sanitizePlainText(payload.mensagem, 4000);
  const protocolo = nextProtocol();

  const { rows } = await query(
    `INSERT INTO contato_suporte
       (protocolo, nome, email, telefone, empresa, assunto, mensagem, ip, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, protocolo, created_at`,
    [
      protocolo,
      nome,
      email,
      telefone,
      empresa,
      assunto,
      mensagem,
      meta.ip ?? null,
      meta.userAgent ?? null,
    ],
  );

  const supportEmail = config.support.contactEmail;
  await sendSupportContactEmail({
    to: supportEmail,
    protocolo,
    nome,
    email,
    telefone,
    empresa,
    assunto,
    mensagem,
  });

  return {
    id: String(rows[0].id),
    protocolo: rows[0].protocolo,
    supportEmail,
    createdAt: rows[0].created_at,
  };
}
