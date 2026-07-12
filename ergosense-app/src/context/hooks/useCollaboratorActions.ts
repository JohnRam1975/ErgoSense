/**
 * Ações de colaboradores — extraído do AppContext (SRP)
 */
import { useCallback } from 'react';
import { apiSaveCollaborator, apiUpdateCollaborator } from '../../api/client';
import type { Collaborator, ScreenId } from '../../types';
import type { StoredState } from '../contextTypes';

type Deps = {
  dbConnected: boolean;
  selectedCompanyId: string;
  setStored: React.Dispatch<React.SetStateAction<StoredState>>;
  go: (screen: ScreenId) => void;
  showToast: (msg: string, type?: '' | 'success' | 'info' | 'warn') => void;
  loadTenantData: (tenantId: string) => Promise<void>;
};

export function useCollaboratorActions({
  dbConnected,
  selectedCompanyId,
  setStored,
  go,
  showToast,
  loadTenantData,
}: Deps) {
  return useCallback(
    (data: Omit<Collaborator, 'id' | 'risk' | 'icon' | 'iconBg'> & { id?: string }) => {
      const persistLocal = (collab: Collaborator) => {
        setStored((s) => ({
          ...s,
          collaborators: data.id
            ? s.collaborators.map((c) => (c.id === data.id ? { ...c, ...collab } : c))
            : [collab, ...s.collaborators],
        }));
        showToast('Funcionário salvo no banco de dados!', 'success');
        setTimeout(() => go('collabs'), 800);
      };

      const payload = {
        nome: data.name,
        matricula: data.matricula,
        cargo: data.cargo,
        setor: data.setor,
        turno: data.turno,
        birthDate: data.birthDate,
        notes: data.notes,
        consent: data.consent,
      };

      if (dbConnected) {
        void (async () => {
          try {
            const collab = data.id
              ? await apiUpdateCollaborator(selectedCompanyId, data.id, payload)
              : await apiSaveCollaborator(selectedCompanyId, payload);
            persistLocal(collab);
            void loadTenantData(selectedCompanyId);
          } catch (err) {
            console.error('saveCollaborator', err);
            showToast(err instanceof Error ? err.message : 'Erro ao salvar funcionário', 'warn');
          }
        })();
        return;
      }

      const icons = ['👷', '🦺', '⚙️', '🔧', '👨‍🔧'];
      const bgs = ['var(--g10)', 'var(--r10)', 'var(--a10)', 'var(--o10)', 'var(--c10)'];
      const idx = Math.floor(Math.random() * icons.length);
      persistLocal({
        ...data,
        id: data.id ?? `c-${Date.now()}`,
        risk: 'baixo',
        icon: icons[idx],
        iconBg: bgs[idx],
      });
    },
    [dbConnected, go, loadTenantData, selectedCompanyId, setStored, showToast],
  );
}
