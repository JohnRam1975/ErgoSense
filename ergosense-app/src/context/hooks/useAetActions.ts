/**
 * Ações AET — extraído do AppContext (SRP)
 */
import { useCallback } from 'react';
import { getErrorMessage } from '../../utils/errors';
import { apiCreateAetProcesso, isApiAvailable } from '../../api/client';
import type { AetProcess } from '../../types/aet';
import type { StoredState } from '../contextTypes';

type Deps = {
  dbConnected: boolean;
  setDbConnected: (v: boolean) => void;
  stored: StoredState;
  showToast: (msg: string, type?: '' | 'success' | 'info' | 'warn') => void;
  refreshAetData: () => Promise<void>;
  setAetProcessDetail: (p: AetProcess | null) => void;
};

export function useAetActions({
  dbConnected,
  setDbConnected,
  stored,
  showToast,
  refreshAetData,
  setAetProcessDetail,
}: Deps) {
  const createAetProcess = useCallback(
    async (title: string): Promise<boolean> => {
      const trimmed = title.trim();
      if (!trimmed) {
        showToast('Informe o título do processo AET', 'warn');
        return false;
      }

      let connected = dbConnected;
      if (!connected) {
        connected = await isApiAvailable();
        if (connected) setDbConnected(true);
      }
      if (!connected) {
        showToast('Servidor indisponível. Verifique se o backend está em execução (porta 3001).', 'warn');
        return false;
      }

      const tenantId = stored.session?.tenantId ?? stored.selectedCompanyId;
      if (!tenantId || tenantId === 'ergosense') {
        showToast('Selecione uma empresa operacional antes de criar a AET', 'warn');
        return false;
      }

      try {
        const p = await apiCreateAetProcesso(tenantId, { title: trimmed });
        await refreshAetData();
        setAetProcessDetail(p);
        showToast('Processo AET criado', 'success');
        return true;
      } catch (err) {
        showToast(getErrorMessage(err, 'Erro ao criar AET'), 'warn');
        return false;
      }
    },
    [dbConnected, refreshAetData, setAetProcessDetail, setDbConnected, showToast, stored.selectedCompanyId, stored.session?.tenantId],
  );

  return { createAetProcess };
}
