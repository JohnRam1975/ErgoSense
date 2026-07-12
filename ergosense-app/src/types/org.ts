export interface OrgCompany {
  id: string;
  tenantId: string;
  legalName: string;
  tradeName: string | null;
  cnpj: string | null;
  stateRegistration: string | null;
  active: boolean;
}

export interface OrgUnit {
  id: string;
  tenantId: string;
  companyId: string;
  name: string;
  type: 'MATRIZ' | 'FILIAL' | 'OBRA' | 'UNIDADE_OPERACIONAL';
  cnpj: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  active: boolean;
}

export interface OrgSector {
  id: string;
  tenantId: string;
  unitId: string | null;
  unitName: string | null;
  name: string;
  description: string | null;
  manager: string | null;
  active: boolean;
}

export interface OrgFunction {
  id: string;
  tenantId: string;
  sectorId: string;
  sectorName: string | null;
  name: string;
  description: string | null;
  cbo: string | null;
  active: boolean;
}

export interface OrgActivity {
  id: string;
  tenantId: string;
  functionId: string;
  functionName: string | null;
  name: string;
  description: string | null;
  frequency: string | null;
  durationMinutes: number | null;
  active: boolean;
}

export interface OrgWorkPost {
  id: string;
  tenantId: string;
  activityId: string;
  activityName: string | null;
  name: string;
  description: string | null;
  location: string | null;
  workstationType: string | null;
  active: boolean;
  collaboratorsCount?: number;
  risksCount?: number;
}

export interface OrgChain {
  companyId: string | null;
  companyName: string | null;
  unitId: string | null;
  unitName: string | null;
  sectorId: string | null;
  sectorName: string | null;
  functionId: string | null;
  functionName: string | null;
  activityId: string | null;
  activityName: string | null;
  workPostId: string | null;
  workPostName: string | null;
}

export interface OrgTreeUnit extends OrgUnit {
  sectors: Array<
    OrgSector & {
      functions: Array<
        OrgFunction & {
          activities: Array<
            OrgActivity & {
              workPosts: OrgWorkPost[];
            }
          >;
        }
      >;
    }
  >;
}

export interface OrgTree {
  company: OrgCompany | null;
  units: OrgTreeUnit[];
  orphanSectors: OrgSector[];
  stats: {
    units: number;
    sectors: number;
    functions: number;
    activities: number;
    workPosts: number;
    collaborators: number;
  };
}

export type OrgEntityLevel = 'unidade' | 'setor' | 'funcao' | 'atividade' | 'posto';

export interface OrgFormData {
  level: OrgEntityLevel;
  parentId: string;
  name: string;
  description: string;
}
