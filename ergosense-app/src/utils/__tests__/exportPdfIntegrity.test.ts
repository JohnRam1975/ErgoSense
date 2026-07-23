/**
 * Integridade de conteúdo dos PDFs AET / SST / PGR (jsPDF)
 */
import { describe, expect, it } from 'vitest';
import { buildAetPdf } from '../exportAetPdf';
import { buildPgrPdf } from '../exportPgrPdf';
import { buildSstPdf } from '../exportSstPdf';
import type { AetNormativeReport, AetProcess } from '../../types/aet';
import type { PgrProgram, PgrVersionDetail } from '../../types/pgr';
import type { SstReport } from '../../types/sst';

function pdfContains(doc: { output: (t: string) => string }, ...needles: string[]) {
  const raw = doc.output('arraybuffer') as unknown as ArrayBuffer;
  const text = Buffer.from(raw).toString('latin1');
  for (const n of needles) {
    expect(text, `PDF deve conter "${n}"`).toContain(n);
  }
  expect(raw.byteLength).toBeGreaterThan(800);
}

describe('PDF AET/SST/PGR — conteúdo íntegro', () => {
  it('AET inclui título normativo e seções do laudo', () => {
    const process = {
      id: '9',
      title: 'AET automática — Montagem · Colab QA',
      stage: 'METODOS_POSTURAIS',
      status: 'EM_ANDAMENTO',
      stageLabel: 'Métodos posturais',
      technicalResponsible: 'Eng. QA',
      technicalResponsibleCrea: 'CREA-123',
      technicalResponsibleArt: 'ART-1',
      documentHash: 'abc123hash',
      ergonomistName: '',
      ergonomistRegistry: '',
      signedAt: null,
      methods: {},
      characterization: {},
      report: null,
    } as unknown as AetProcess;

    const report = {
      sections: [
        { id: '1', title: 'Identificação e Caracterização', norma: 'NR-17 17.1', content: { origem: 'auto_analise' } },
        { id: '3', title: 'Avaliação Postural — RULA · REBA · OWAS', norma: 'NR-17', content: { rula: 4 } },
      ],
      disclaimer: 'Laudo de apoio técnico — validar com responsável.',
      responsavelTecnico: { nome: 'Eng. QA', crea: 'CREA-123', art: 'ART-1' },
    } as unknown as AetNormativeReport;

    const doc = buildAetPdf(process, report);
    pdfContains(doc, 'AN', 'LISE ERGON', 'MICA DO TRABALHO'); // acentuação pode fragmentar no PDF
    pdfContains(doc, 'AET autom');
    pdfContains(doc, 'Identifica');
    pdfContains(doc, 'RULA');
  });

  it('PGR inclui inventário e plano de ação do snapshot', () => {
    const program = {
      id: '1',
      title: 'PGR Empresa QA',
      technicalResponsible: 'RT QA',
      legalResponsible: 'RL QA',
    } as unknown as PgrProgram;

    const version = {
      id: '2',
      number: '1.0',
      status: 'APROVADO',
      preparedBy: 'Elaborador',
      preparedAt: '2026-07-23',
      nextReviewAt: '2027-07-23',
      signatures: [],
      snapshot: {
        generatedAt: new Date().toISOString(),
        norma: 'NR-01',
        empresa: { nome: 'Acme QA Ltda', industria: 'Metalurgia' },
        inventarioRiscos: [
          {
            tipo: 'ERGONOMICO',
            perigo: 'Postura forçada',
            nivel: 'alto',
            probabilidade: 4,
            severidade: 4,
            score: 16,
            setor: 'Produção',
            fonteGeradora: 'Linha 1',
            consequencia: 'DORT',
            medidasControle: 'Pausas',
          },
        ],
        planoAcao: [
          {
            tipoControle: 'ADMINISTRATIVA',
            descricao: 'Rodízio de postos',
            riscoPerigo: 'Postura forçada',
            responsavel: 'Supervisor',
            prazo: '2026-08-01',
            status: 'aberto',
          },
        ],
        indicadores: [{ nome: 'Leading QA', valor: 1, meta: 10 }],
      },
    } as unknown as PgrVersionDetail;

    const doc = buildPgrPdf(program, version);
    pdfContains(doc, 'PROGRAMA DE GERENCIAMENTO DE RISCOS');
    pdfContains(doc, 'Acme QA');
    pdfContains(doc, 'Postura for');
    pdfContains(doc, 'Rod');
    pdfContains(doc, 'INVENT');
  });

  it('SST inclui resumo executivo e integração inventário', () => {
    const report = {
      title: 'Relatório SST QA',
      generatedAt: new Date().toISOString(),
      type: 'consolidado',
      dashboard: {
        apr: 2,
        epi: 3,
        epc: 1,
        inspecoes: 1,
        auditorias: 0,
        naoConformidades: 1,
        ncAbertas: 1,
        capa: 1,
        capaAbertas: 1,
        treinamentos: 2,
        epiCaVencidos: 0,
      },
      integracao: { risksLinked: 5, capaGroLinked: 1 },
      normas: ['NR-01', 'NR-06', 'NR-17'],
    } as unknown as SstReport;

    const doc = buildSstPdf(report);
    pdfContains(doc, 'RELAT');
    pdfContains(doc, 'SST');
    pdfContains(doc, 'Relat');
    pdfContains(doc, 'APR');
    pdfContains(doc, 'NR-01');
    pdfContains(doc, 'INTEGRA');
  });
});
