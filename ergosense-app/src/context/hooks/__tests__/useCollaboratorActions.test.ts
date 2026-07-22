import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { Dispatch, SetStateAction } from 'react';
import { useCollaboratorActions } from '../useCollaboratorActions';
import type { StoredState } from '../../contextTypes';

const mocks = vi.hoisted(() => ({
  save: vi.fn(),
  update: vi.fn(),
}));

vi.mock('../../../api/client', () => ({
  apiSaveCollaborator: mocks.save,
  apiUpdateCollaborator: mocks.update,
}));

describe('useCollaboratorActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.save.mockResolvedValue({
      id: 'c-new',
      name: 'João',
      matricula: '001',
      cargo: 'Op',
      setor: 'Prod',
      turno: 'A',
      birthDate: '',
      notes: '',
      consent: true,
      risk: 'baixo',
      icon: '👷',
      iconBg: 'var(--g10)',
    });
  });

  it('salva colaborador online via API', async () => {
    const setStored = vi.fn() as Dispatch<SetStateAction<StoredState>>;
    const showToast = vi.fn();
    const go = vi.fn();
    const loadTenant = vi.fn();

    const { result } = renderHook(() =>
      useCollaboratorActions({
        dbConnected: true,
        selectedCompanyId: 'acme',
        setStored,
        go,
        showToast,
        loadTenantData: loadTenant,
      }),
    );

    act(() => {
      result.current({
        name: 'João',
        matricula: '001',
        cargo: 'Op',
        setor: 'Prod',
        turno: 'A',
        birthDate: '',
        notes: '',
        consent: true,
      });
    });

    await vi.waitFor(() => expect(mocks.save).toHaveBeenCalled());
    expect(loadTenant).toHaveBeenCalledWith('acme');
  });

  it('erro API exibe toast warn', async () => {
    mocks.save.mockRejectedValue(new Error('403 Sem permissão'));
    const setStored = vi.fn();
    const showToast = vi.fn();
    const go = vi.fn();

    const { result } = renderHook(() =>
      useCollaboratorActions({
        dbConnected: true,
        selectedCompanyId: 'acme',
        setStored,
        go,
        showToast,
        loadTenantData: vi.fn(),
      }),
    );

    act(() => {
      result.current({
        name: 'João',
        matricula: '001',
        cargo: 'Op',
        setor: 'Prod',
        turno: 'A',
        birthDate: '',
        notes: '',
        consent: true,
      });
    });

    await vi.waitFor(() =>
      expect(showToast).toHaveBeenCalledWith('403 Sem permissão', 'warn'),
    );
  });

  it('modo offline persiste localmente', () => {
    const setStored = vi.fn();
    const showToast = vi.fn();
    const go = vi.fn();

    const { result } = renderHook(() =>
      useCollaboratorActions({
        dbConnected: false,
        selectedCompanyId: 'acme',
        setStored,
        go,
        showToast,
        loadTenantData: vi.fn(),
      }),
    );

    act(() => {
      result.current({
        name: 'Maria',
        matricula: '002',
        cargo: 'Op',
        setor: 'Prod',
        turno: 'B',
        birthDate: '',
        notes: '',
        consent: true,
      });
    });

    expect(mocks.save).not.toHaveBeenCalled();
    expect(setStored).toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith('Funcionário salvo no banco de dados!', 'success');
  });
});
