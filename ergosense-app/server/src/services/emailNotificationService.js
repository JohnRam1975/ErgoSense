/**
 * Notificações por e-mail — atualização futura (SMTP).
 * Hoje: apenas log estruturado (stdout). Integrar provedor SMTP na próxima release.
 */
import { config } from '../config/env.js';

const SMTP_FUTURE =
  'SMTP e envio real de e-mail estão planejados para atualização futura (hoje: mode=log).';

export async function sendActivationEmail({ to, companyName, protocolo, activationUrl, tempPassword }) {
  const payload = {
    level: 'info',
    msg: 'email_activation_queued',
    to,
    subject: `ErgoSense — Ative sua conta (${companyName})`,
    companyName,
    protocolo,
    activationUrl,
    tempPasswordHint: tempPassword ? '***' : null,
    service: config.observability.serviceName,
    note: SMTP_FUTURE,
  };
  console.log(JSON.stringify(payload));
  return { sent: true, mode: 'log', future: 'smtp' };
}

export async function sendRejectionEmail({ to, companyName, protocolo, reason }) {
  console.log(
    JSON.stringify({
      level: 'info',
      msg: 'email_rejection_queued',
      to,
      companyName,
      protocolo,
      reason,
      note: SMTP_FUTURE,
    }),
  );
  return { sent: true, mode: 'log', future: 'smtp' };
}

export async function sendAdjustmentRequestEmail({ to, companyName, protocolo, message }) {
  console.log(
    JSON.stringify({
      level: 'info',
      msg: 'email_adjustment_queued',
      to,
      companyName,
      protocolo,
      message,
      note: SMTP_FUTURE,
    }),
  );
  return { sent: true, mode: 'log', future: 'smtp' };
}

export async function sendSupportContactEmail({
  to,
  protocolo,
  nome,
  email,
  telefone,
  empresa,
  assunto,
  mensagem,
}) {
  const payload = {
    level: 'info',
    msg: 'email_support_contact_queued',
    to: to || config.support.contactEmail,
    subject: `ErgoSense — Contato suporte [${protocolo}] ${assunto}`,
    protocolo,
    fromName: nome,
    fromEmail: email,
    telefone: telefone || null,
    empresa: empresa || null,
    assunto,
    mensagem,
    service: config.observability.serviceName,
    note: SMTP_FUTURE,
  };
  console.log(JSON.stringify(payload));
  return { sent: true, mode: 'log', future: 'smtp', to: payload.to };
}

export async function sendPasswordResetEmail({ to, name, resetUrl, expiresAt }) {
  const payload = {
    level: 'info',
    msg: 'email_password_reset_queued',
    to,
    subject: 'ErgoSense — Redefinição de senha',
    name: name || null,
    resetUrl,
    expiresAt: expiresAt instanceof Date ? expiresAt.toISOString() : expiresAt,
    service: config.observability.serviceName,
    note: SMTP_FUTURE,
  };
  console.log(JSON.stringify(payload));
  return { sent: true, mode: 'log', future: 'smtp' };
}
