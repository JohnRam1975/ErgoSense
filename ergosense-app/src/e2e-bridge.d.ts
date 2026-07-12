import type { ScreenId } from './types';

export interface ErgoSenseE2EBridge {
  go: (id: ScreenId) => void;
  getScreen: () => ScreenId;
  openRiskForm: () => void;
  openDenunciaDetail: (id: string) => Promise<void>;
  openPgrVersion: (id: string) => Promise<void>;
  openAetProcess: (id: string) => Promise<void>;
  openAnalysis: (id: string) => void;
  prepareCamera: () => void;
  refreshLists: () => Promise<void>;
  getFirstIds: () => {
    denuncia: string | null;
    pgr: string | null;
    aet: string | null;
    analysis: string | null;
  };
}

declare global {
  interface Window {
    __ERGOSENSE_E2E__?: ErgoSenseE2EBridge;
  }
}

export {};
