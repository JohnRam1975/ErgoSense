import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginScreen } from '../MainScreens';

const mockLogin = vi.fn();
const mockVerifyMfaLogin = vi.fn();
const mockShowToast = vi.fn();
const mockShowModal = vi.fn();
const mockGo = vi.fn();

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

describe('LoginScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogin.mockResolvedValue(true);
    mockVerifyMfaLogin.mockResolvedValue(true);
  });

  it('render inicial com campos de login', () => {
    render(<LoginScreen />);
    expect(screen.getByRole('heading', { name: /Entrar/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('usuario@empresa.com.br')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Entrar/i })).toBeInTheDocument();
  });

  it('submit login chama login com credenciais', async () => {
    const user = userEvent.setup();
    render(<LoginScreen />);
    const email = screen.getByPlaceholderText('usuario@empresa.com.br');
    const password = screen.getByPlaceholderText('••••••••');
    await user.clear(email);
    await user.type(email, 'novo@test.com');
    await user.clear(password);
    await user.type(password, 'senha12345');
    await user.click(screen.getByRole('button', { name: /Entrar/i }));
    await waitFor(() =>
      expect(mockLogin).toHaveBeenCalledWith('novo@test.com', 'senha12345'),
    );
  });

  it('login com MFA pendente exibe formulário MFA', async () => {
    mockLogin.mockResolvedValue({
      mfaRequired: true,
      mfaToken: 'tok-mfa',
      email: 'mfa@test.com',
      name: 'MFA User',
    });
    const user = userEvent.setup();
    render(<LoginScreen />);
    await user.click(screen.getByRole('button', { name: /Entrar/i }));
    await waitFor(() => expect(screen.getByText(/Verificação MFA/i)).toBeInTheDocument());
    expect(mockShowToast).toHaveBeenCalledWith('Informe o código do autenticador', 'info');
  });

  it('verify MFA chama verifyMfaLogin', async () => {
    mockLogin.mockResolvedValue({
      mfaRequired: true,
      mfaToken: 'tok-mfa',
      email: 'mfa@test.com',
      name: 'MFA User',
    });
    const user = userEvent.setup();
    render(<LoginScreen />);
    await user.click(screen.getByRole('button', { name: /Entrar/i }));
    await waitFor(() => screen.getByPlaceholderText('000000'));
    await user.type(screen.getByPlaceholderText('000000'), '123456');
    await user.click(screen.getByRole('button', { name: /Confirmar/i }));
    await waitFor(() => expect(mockVerifyMfaLogin).toHaveBeenCalledWith('tok-mfa', '123456'));
  });

  it('voltar ao login limpa MFA', async () => {
    mockLogin.mockResolvedValue({
      mfaRequired: true,
      mfaToken: 'tok-mfa',
      email: 'mfa@test.com',
      name: 'MFA User',
    });
    const user = userEvent.setup();
    render(<LoginScreen />);
    await user.click(screen.getByRole('button', { name: /Entrar/i }));
    await waitFor(() => screen.getByRole('button', { name: /Voltar ao login/i }));
    await user.click(screen.getByRole('button', { name: /Voltar ao login/i }));
    expect(screen.getByRole('button', { name: /Entrar/i })).toBeInTheDocument();
  });

  it('botão voltar navega para splash', async () => {
    const user = userEvent.setup();
    render(<LoginScreen />);
    await user.click(screen.getByRole('button', { name: /^Voltar$/i }));
    expect(mockGo).toHaveBeenCalledWith('splash');
  });

  it('esqueci senha abre orientação', async () => {
    const user = userEvent.setup();
    render(<LoginScreen />);
    await user.click(screen.getByText(/Esqueci a senha/i));
    expect(mockShowModal).toHaveBeenCalled();
    expect(mockShowModal.mock.calls[0][1]).toMatch(/SMTP|atualização futura/i);
  });

  it('login falha não navega', async () => {
    mockLogin.mockResolvedValue(false);
    const user = userEvent.setup();
    render(<LoginScreen />);
    await user.click(screen.getByRole('button', { name: /Entrar/i }));
    await waitFor(() => expect(mockLogin).toHaveBeenCalled());
    expect(mockGo).not.toHaveBeenCalledWith('dashboard');
  });
});
