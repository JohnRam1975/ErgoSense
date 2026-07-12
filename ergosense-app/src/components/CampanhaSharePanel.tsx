/**
 * Compartilhamento de campanha psicossocial — link, WhatsApp, e-mail e QR Code.
 */
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

type Props = {
  link: string;
  title: string;
  warning?: string;
  onCopySuccess?: (msg: string) => void;
  onCopyError?: (msg: string) => void;
};

function shareMessage(title: string, link: string) {
  return `Olá! Você foi convidado(a) a responder o formulário anônimo "${title}" no ErgoSensePro.\n\nAcesse pelo link:\n${link}\n\nSuas respostas são confidenciais e não permitem identificação individual.`;
}

export function CampanhaSharePanel({ link, title, warning, onCopySuccess, onCopyError }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copiandoQr, setCopiandoQr] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void QRCode.toDataURL(link, {
      width: 220,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [link]);

  async function copiarTexto(texto: string, msgOk: string) {
    try {
      await navigator.clipboard.writeText(texto);
      onCopySuccess?.(msgOk);
    } catch {
      onCopyError?.('Não foi possível copiar — selecione o texto manualmente');
    }
  }

  async function copiarImagemQr() {
    if (!qrDataUrl) return;
    setCopiandoQr(true);
    try {
      const res = await fetch(qrDataUrl);
      const blob = await res.blob();
      if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
        onCopySuccess?.('QR Code copiado — cole em WhatsApp, e-mail ou documento');
      } else {
        await copiarTexto(link, 'Link copiado (seu navegador não suporta copiar imagem do QR)');
      }
    } catch {
      onCopyError?.('Não foi possível copiar o QR Code — use “Copiar link” ou baixe a imagem');
    } finally {
      setCopiandoQr(false);
    }
  }

  function baixarQr() {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `ergosense-form-${title.slice(0, 30).replace(/[^\w-]+/g, '-')}.png`;
    a.click();
    onCopySuccess?.('QR Code baixado');
  }

  const msg = shareMessage(title, link);
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
  const emailUrl = `mailto:?subject=${encodeURIComponent(`Formulário anônimo: ${title}`)}&body=${encodeURIComponent(msg)}`;

  return (
    <div className="campanha-share-panel hl mt12" style={{ background: 'var(--g10)', border: '1px solid rgba(34,197,94,.35)' }}>
      {warning && (
        <div className="lbl" style={{ color: 'var(--green)', marginBottom: 8 }}>{warning}</div>
      )}

      <div className="lbl" style={{ color: 'var(--t0)', marginBottom: 6 }}>Link do formulário</div>
      <div className="campanha-share-link-row">
        <input className="inp campanha-share-link-input" readOnly value={link} onFocus={(e) => e.target.select()} />
        <button type="button" className="btn bs btn-sm" onClick={() => void copiarTexto(link, 'Link copiado — cole no WhatsApp ou e-mail')}>
          Copiar link
        </button>
      </div>

      <div className="row gap8 mt12" style={{ flexWrap: 'wrap' }}>
        <a className="btn bp btn-sm campanha-share-wa" href={whatsappUrl} target="_blank" rel="noopener noreferrer">
          WhatsApp
        </a>
        <a className="btn bs btn-sm" href={emailUrl}>
          E-mail
        </a>
        <button type="button" className="btn bs btn-sm" onClick={() => void copiarTexto(msg, 'Mensagem copiada — cole onde quiser')}>
          Copiar mensagem
        </button>
      </div>

      <div className="campanha-share-qr mt12">
        <div className="lbl" style={{ color: 'var(--t0)', marginBottom: 8 }}>QR Code — escaneie ou copie e cole</div>
        <div className="campanha-share-qr-body">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt={`QR Code — ${title}`} className="campanha-share-qr-img" width={220} height={220} />
          ) : (
            <div className="campanha-share-qr-placeholder">Gerando QR Code…</div>
          )}
          <div className="campanha-share-qr-actions">
            <button
              type="button"
              className="btn bs btn-sm"
              disabled={!qrDataUrl || copiandoQr}
              onClick={() => void copiarImagemQr()}
            >
              {copiandoQr ? 'Copiando…' : 'Copiar QR Code'}
            </button>
            <button type="button" className="btn bs btn-sm" disabled={!qrDataUrl} onClick={baixarQr}>
              Baixar PNG
            </button>
            <button type="button" className="btn bs btn-sm" onClick={() => void copiarTexto(link, 'Link copiado')}>
              Copiar link do QR
            </button>
          </div>
          <p className="public-form-muted" style={{ marginTop: 8, fontSize: 10 }}>
            Imprima o QR em cartazes ou copie a imagem para enviar por WhatsApp, Teams ou e-mail.
          </p>
        </div>
      </div>
    </div>
  );
}
