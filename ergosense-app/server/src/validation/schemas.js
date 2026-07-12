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

export const tenantRequestPublicSchema = z.object({
  razaoSocial: z.string().trim().min(2, 'Razão social obrigatória'),
  nomeFantasia: z.string().trim().optional(),
  cnpj: z.string().trim().min(14, 'CNPJ obrigatório'),
  segmento: z.string().trim().min(1, 'Segmento obrigatório'),
  quantidadeFuncionarios: z.coerce.number().int().positive().optional(),
  responsavelNome: z.string().trim().min(2, 'Nome do responsável obrigatório'),
  email: z.string().email('E-mail inválido'),
  telefone: z.string().trim().min(8, 'Telefone obrigatório'),
  responsavelEmail: z.string().email().optional(),
  responsavelTelefone: z.string().trim().optional(),
  plano: z.enum(['STARTER', 'PROFESSIONAL', 'ENTERPRISE']).optional(),
  industria: z.string().trim().optional(),
  endereco: z.string().trim().optional(),
  cidade: z.string().trim().optional(),
  estado: z.string().trim().max(2).optional(),
  cep: z.string().trim().optional(),
});

export const activateAccountSchema = z.object({
  token: z.string().min(16),
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
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

export const tenantUpdateSchema = z.object({
  name: z.string().trim().min(2).optional(),
  industry: z.string().trim().optional(),
  plan: z.enum(['STARTER', 'PROFESSIONAL', 'ENTERPRISE']).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
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
