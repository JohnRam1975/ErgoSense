/**
 * Notificações por e-mail — stub enterprise (stdout/SIEM; integrar SMTP depois)
 */
import { config } from '../config/env.js';

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
  };
  console.log(JSON.stringify(payload));
  return { sent: true, mode: 'log' };
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
    }),
  );
  return { sent: true, mode: 'log' };
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
    }),
  );
  return { sent: true, mode: 'log' };
}
