import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginScreen } from '../MainScreens';

const mockLogin = vi.fn();
const mockVerifyMfaLogin = vi.fn();
const mockShowToast = vi.fn();
const mockShowModal = vi.fn();
const mockGo = vi.fn();
const mockApiForgotPassword = vi.fn();
const mockApiResetPassword = vi.fn();

vi.mock('../../context/AppContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../context/AppContext')>();
  return {
    ...actual,
    useApp: () => ({
      login: mockLogin,
      verifyMfaLogin: mockVerifyMfaLogin,
      showToast: mockShowToast,
      showModal: mockShowModal,
      go: mockGo,
    }),
  };
});

vi.mock('../../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/client')>();
  return {
    ...actual,
    apiForgotPassword: (...args: unknown[]) => mockApiForgotPassword(...args),
    apiResetPassword: (...args: unknown[]) => mockApiResetPassword(...args),
  };
});

describe('LoginScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogin.mockResolvedValue(true);
    mockVerifyMfaLogin.mockResolvedValue(true);
    mockApiForgotPassword.mockResolvedValue({
      email: 'user@acme.com',
      token: 'a'.repeat(32),
      message: 'E-mail verificado. Informe a nova senha e confirme com o token.',
      delivery: 'log',
    });
    mockApiResetPassword.mockResolvedValue({ ok: true, email: 'user@acme.com' });
  });

  it('render inicial com campos de login', () => {
    render(<LoginScreen />);
    expect(screen.getByRole('heading', { name: /Entrar/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('usuario@empresa.com.br')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
  });

  it('botão voltar navega para splash', async () => {
    const user = userEvent.setup();
    render(<LoginScreen />);
    await user.click(screen.getByRole('button', { name: /^Voltar$/i }));
    expect(mockGo).toHaveBeenCalledWith('splash');
  });

  it('esqueci senha exige e-mail no passo de verificação', async () => {
    const user = userEvent.setup();
    render(<LoginScreen />);
    await user.click(screen.getByText(/Esqueci a senha/i));
    expect(screen.getByRole('heading', { name: /Esqueci a senha/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Verificar e-mail/i }));
    expect(mockShowToast).toHaveBeenCalledWith('Informe o e-mail corporativo cadastrado', 'warn');
    expect(mockApiForgotPassword).not.toHaveBeenCalled();
  });

  it('esqueci senha valida e-mail e abre campos de token + nova senha', async () => {
    const user = userEvent.setup();
    render(<LoginScreen />);
    await user.click(screen.getByText(/Esqueci a senha/i));
    await user.type(screen.getByPlaceholderText('usuario@empresa.com.br'), 'user@acme.com');
    await user.click(screen.getByRole('button', { name: /Verificar e-mail/i }));
    await waitFor(() => expect(mockApiForgotPassword).toHaveBeenCalledWith('user@acme.com'));
    expect(screen.getByRole('heading', { name: /Nova senha/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue('a'.repeat(32))).toBeInTheDocument();
    expect(screen.getByLabelText(/^Nova senha$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirmar nova senha/i)).toBeInTheDocument();
  });

  it('redefine senha com token após e-mail válido', async () => {
    const user = userEvent.setup();
    render(<LoginScreen />);
    await user.click(screen.getByText(/Esqueci a senha/i));
    await user.type(screen.getByPlaceholderText('usuario@empresa.com.br'), 'user@acme.com');
    await user.click(screen.getByRole('button', { name: /Verificar e-mail/i }));
    await waitFor(() => expect(screen.getByRole('heading', { name: /Nova senha/i })).toBeInTheDocument());

    await user.type(screen.getByLabelText(/^Nova senha$/i), 'NovaSenha!2026');
    await user.type(screen.getByLabelText(/Confirmar nova senha/i), 'NovaSenha!2026');
    await user.click(screen.getByRole('button', { name: /Redefinir senha/i }));

    await waitFor(() =>
      expect(mockApiResetPassword).toHaveBeenCalledWith({
        token: 'a'.repeat(32),
        password: 'NovaSenha!2026',
        confirmPassword: 'NovaSenha!2026',
      }),
    );
    expect(mockShowToast).toHaveBeenCalledWith('Senha redefinida. Faça login com a nova senha.', 'success');
  });

  it('login falha não navega', async () => {
    mockLogin.mockResolvedValue(false);
    const user = userEvent.setup();
    render(<LoginScreen />);
    await user.click(screen.getByRole('button', { name: /Entrar/i }));
    expect(mockGo).not.toHaveBeenCalled();
  });
});
