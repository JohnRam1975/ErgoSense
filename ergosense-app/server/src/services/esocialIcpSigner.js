/**
 * Assinatura ICP-Brasil — XML-DSig enveloped (eSocial S-1.3)
 * Port desacoplado: PfxIcpSigner (produção) | DevIcpSigner (homologação)
 */
import fs from 'fs';
import forge from 'node-forge';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { SignedXml } from 'xml-crypto';
import { ESOCIAL_SCHEMA_S13 } from './esocialConstants.js';

function extractEventId(xml, tipoEvento) {
  const root = ESOCIAL_SCHEMA_S13[tipoEvento]?.root;
  if (!root) throw new Error(`Tipo de evento inválido: ${tipoEvento}`);
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const eventEl = doc.getElementsByTagName(root)[0];
  const id = eventEl?.getAttribute?.('Id');
  if (!id) throw new Error(`Atributo Id ausente em ${root}`);
  return { id, root };
}

function loadPfxCredentials(pfxPath, password) {
  const pfxDer = fs.readFileSync(pfxPath);
  const pfxAsn1 = forge.asn1.fromDer(pfxDer.toString('binary'));
  const pfx = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, password);
  const bags = pfx.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
  const keyBag = bags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];
  const certBags = pfx.getBags({ bagType: forge.pki.oids.certBag });
  const certBag = certBags[forge.pki.oids.certBag]?.[0];
  if (!keyBag?.key || !certBag?.cert) {
    throw new Error('Certificado PFX inválido — chave ou certificado não encontrados');
  }
  return {
    privateKeyPem: forge.pki.privateKeyToPem(keyBag.key),
    certificatePem: forge.pki.certificateToPem(certBag.cert),
    serialNumber: certBag.cert.serialNumber,
    subject: certBag.cert.subject.attributes.map((a) => a.shortName).join(','),
  };
}

function signWithKey(xml, tipoEvento, { privateKeyPem, certificatePem, serialNumber, mode }) {
  const { id, root } = extractEventId(xml, tipoEvento);
  const xpath = `//*[local-name()='${root}' and @Id='${id}']`;

  const sig = new SignedXml({
    privateKey: privateKeyPem,
    publicCert: certificatePem,
  });

  sig.addReference({
    xpath,
    transforms: [
      'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
      'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
    ],
    digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
  });

  sig.canonicalizationAlgorithm = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315';
  sig.signatureAlgorithm = 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256';

  sig.computeSignature(xml, {
    prefix: '',
    location: { reference: xpath, action: 'append' },
  });

  return {
    signedXml: sig.getSignedXml(),
    certificateSerial: serialNumber ?? null,
    signatureMode: mode,
    eventId: id,
  };
}

/** Assinatura com certificado A1/A3 (PFX) — ICP-Brasil produção */
export class PfxIcpSigner {
  constructor({ pfxPath, password }) {
    this.pfxPath = pfxPath;
    this.password = password;
    this.credentials = loadPfxCredentials(pfxPath, password);
  }

  async sign(xml, tipoEvento) {
    return signWithKey(xml, tipoEvento, { ...this.credentials, mode: 'ICP-PFX' });
  }
}

/** Homologação — par de chaves efêmero com XML-DSig válido (não ICP oficial) */
export class DevIcpSigner {
  constructor() {
    const keys = forge.pki.rsa.generateKeyPair(2048);
    const cert = forge.pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = String(Date.now());
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
    const attrs = [{ name: 'commonName', value: 'ErgoSensePro Dev ICP-Brasil' }];
    cert.setSubject(attrs);
    cert.setIssuer(attrs);
    cert.sign(keys.privateKey, forge.md.sha256.create());
    this.credentials = {
      privateKeyPem: forge.pki.privateKeyToPem(keys.privateKey),
      certificatePem: forge.pki.certificateToPem(cert),
      serialNumber: cert.serialNumber,
    };
  }

  async sign(xml, tipoEvento) {
    return signWithKey(xml, tipoEvento, { ...this.credentials, mode: 'DEV-ICP' });
  }
}

export function createIcpSigner(config) {
  const pfxPath = config?.certificado_pfx_path;
  const envKey = config?.certificado_senha_env || 'ESOCIAL_PFX_PASSWORD';
  const password = process.env[envKey];

  if (pfxPath && password && fs.existsSync(pfxPath)) {
    return new PfxIcpSigner({ pfxPath, password });
  }
  return new DevIcpSigner();
}

export function stripExistingSignatures(xml, tipoEvento) {
  const root = ESOCIAL_SCHEMA_S13[tipoEvento]?.root;
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const eventEl = doc.getElementsByTagName(root)[0];
  if (!eventEl) return xml;
  const sigs = [...eventEl.getElementsByTagName('Signature')];
  for (const sig of sigs) {
    eventEl.removeChild(sig);
  }
  return new XMLSerializer().serializeToString(doc);
}
