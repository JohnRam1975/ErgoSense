/**
 * Schemas Zod — validação de entrada (PROMPT UNIVERSAL — Segurança)
 */
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
});

export const createTenantSchema = z.object({
  nome: z.string().trim().min(2, 'Nome da empresa obrigatório'),
  industria: z.string().trim().min(1, 'Indústria obrigatória'),
  tenantId: z.string().trim().optional(),
  adminNome: z.string().trim().min(2, 'Nome do administrador obrigatório'),
  adminEmail: z.string().email('E-mail do administrador inválido'),
  adminPassword: z.string().min(8, 'Senha deve ter ao menos 8 caracteres'),
  icone: z.string().optional(),
  cor: z.string().optional(),
});

export const collaboratorSchema = z.object({
  nome: z.string().trim().min(1, 'Nome é obrigatório'),
  matricula: z.string().trim().min(1, 'Matrícula é obrigatória'),
  cargo: z.string().trim().optional().nullable(),
  setor: z.string().trim().optional().nullable(),
  turno: z.string().trim().optional().nullable(),
  birthDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  consent: z.boolean().optional(),
});

export const sectorSchema = z.object({
  nome: z.string().trim().min(1, 'Nome do setor é obrigatório'),
});

export const accessRequestSchema = z.object({
  nome: z.string().trim().min(2),
  email: z.string().email(),
  funcao: z.string().trim().min(1),
  matricula: z.string().trim().min(1),
  tenantId: z.string().optional().nullable(),
});

export const tenantRequestPublicSchema = z
  .object({
    tipoCadastro: z.enum(['EMPRESA', 'AUTONOMO']).default('EMPRESA'),
    razaoSocial: z.string().trim().min(2, 'Nome / razão social obrigatório'),
    nomeFantasia: z.string().trim().optional(),
    cnpj: z.string().trim().optional(),
    cpf: z.string().trim().optional(),
    segmento: z.string().trim().min(1, 'Segmento / área de atuação obrigatório'),
    quantidadeFuncionarios: z.coerce.number().int().positive().optional(),
    responsavelNome: z.string().trim().min(2, 'Nome do responsável obrigatório'),
    email: z.string().email('E-mail inválido'),
    telefone: z.string().trim().min(8, 'Telefone obrigatório'),
    responsavelEmail: z.string().email().optional(),
    responsavelTelefone: z.string().trim().optional(),
    responsavelCargo: z.string().trim().optional(),
    plano: z.enum(['STARTER', 'PROFESSIONAL', 'ENTERPRISE']).optional(),
    industria: z.string().trim().optional(),
    endereco: z.string().trim().optional(),
    logradouro: z.string().trim().optional(),
    numero: z.string().trim().optional(),
    complemento: z.string().trim().optional(),
    bairro: z.string().trim().optional(),
    cidade: z.string().trim().optional(),
    estado: z.string().trim().max(2).optional(),
    cep: z.string().trim().optional(),
    observacoes: z.string().trim().max(2000).optional(),
    password: z.string().optional(),
    confirmPassword: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.tipoCadastro === 'AUTONOMO') {
      const cpfDigits = String(data.cpf ?? '').replace(/\D/g, '');
      if (cpfDigits.length !== 11) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'CPF obrigatório', path: ['cpf'] });
      }
      if (!data.logradouro?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Logradouro obrigatório', path: ['logradouro'] });
      }
      if (!data.numero?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Número obrigatório', path: ['numero'] });
      }
      if (!data.bairro?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Bairro obrigatório', path: ['bairro'] });
      }
      if (!data.cidade?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Cidade obrigatória', path: ['cidade'] });
      }
      if (!data.estado?.trim() || data.estado.trim().length !== 2) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'UF obrigatória', path: ['estado'] });
      }
      const cepDigits = String(data.cep ?? '').replace(/\D/g, '');
      if (cepDigits.length !== 8) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'CEP inválido', path: ['cep'] });
      }
      if (!data.password || data.password.length < 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Senha obrigatória (mín. 8 caracteres)',
          path: ['password'],
        });
      } else if (data.password !== data.confirmPassword) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Senhas não conferem', path: ['confirmPassword'] });
      }
    } else {
      const cnpjDigits = String(data.cnpj ?? '').replace(/\D/g, '');
      if (cnpjDigits.length < 14) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'CNPJ obrigatório', path: ['cnpj'] });
      }
    }
  });

export const activateAccountSchema = z.object({
  token: z.string().min(16),
  password: z.string().min(8).optional(),
  confirmPassword: z.string().min(8).optional(),
  mfaCode: z.string().trim().min(6).max(8),
});

export const tenantRejectSchema = z.object({
  reason: z.string().trim().min(3).max(2000),
});

export const tenantAdjustSchema = z.object({
  message: z.string().trim().min(3).max(2000),
});

export const tenantBlockSchema = z.object({
  reason: z.string().trim().min(3, 'Motivo obrigatório').max(500),
});

export const tenantReactivateSchema = z.object({
  confirm: z.literal(true, { errorMap: () => ({ message: 'Confirmação obrigatória' }) }),
});

/** Liberação comercial após pagamento confirmado */
export const tenantGrantAccessSchema = z.object({
  confirm: z.literal(true, { errorMap: () => ({ message: 'Confirmação obrigatória' }) }),
  paymentNote: z.string().trim().max(500).optional(),
  plan: z.enum(['STARTER', 'PROFESSIONAL', 'ENTERPRISE']).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
});

export const tenantDeactivateSchema = z.object({
  reason: z.string().trim().min(3, 'Motivo obrigatório').max(500),
});

export const tenantUpdateSchema = z.object({
  name: z.string().trim().min(2).max(255).optional(),
  industry: z.string().trim().max(120).optional(),
  plan: z.enum(['STARTER', 'PROFESSIONAL', 'ENTERPRISE']).optional(),
  expiresAt: z.union([z.string().min(1), z.null()]).optional(),
  icon: z.string().trim().max(16).optional(),
  color: z.enum(['amber', 'cyan', 'green', 'neutral']).optional(),
  razaoSocial: z.string().trim().max(255).optional(),
  nomeFantasia: z.string().trim().max(255).optional().nullable(),
  cnpj: z.string().trim().max(18).optional().nullable(),
  inscricaoEstadual: z.string().trim().max(32).optional().nullable(),
});

export const analysisSchema = z.object({
  collaboratorId: z.union([z.string(), z.number()]),
  activity: z.string().trim().min(1, 'Atividade obrigatória'),
  score: z.number().optional(),
  risk: z.string().optional(),
  rula: z.number().optional(),
  reba: z.number().optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  mode: z.string().optional(),
  notes: z.string().optional().nullable(),
  angles: z.record(z.unknown()).optional(),
  synced: z.boolean().optional(),
});

/** Criação de processo AET — título obrigatório (evita POST {} silencioso). */
export const createAetProcessoSchema = z.object({
  title: z.string().trim().min(2, 'Título da AET obrigatório'),
  collaboratorId: z.union([z.string(), z.number()]).optional().nullable(),
  sectorId: z.union([z.string(), z.number()]).optional().nullable(),
  analysisId: z.union([z.string(), z.number()]).optional().nullable(),
  preparedBy: z.string().trim().max(255).optional().nullable(),
  characterization: z.record(z.unknown()).optional(),
});

export const updateProfileSchema = z.object({
  nome: z.string().trim().min(2, 'Informe um nome válido').max(200),
  localizacao: z.string().trim().max(200).optional().default(''),
});
