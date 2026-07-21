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
    subject: `ErgoSensePro — Ative sua conta (${companyName})`,
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
