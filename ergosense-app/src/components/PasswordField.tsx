import { useState, type ChangeEventHandler, type InputHTMLAttributes } from 'react';

type PasswordFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  inputClassName?: string;
};

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A10.5 10.5 0 0 1 12 5c5 0 9.3 3.1 11 7.5a11.5 11.5 0 0 1-4.2 5.1M6.1 6.1A11.5 11.5 0 0 0 1 12.5C2.7 16.9 7 20 12 20c1.4 0 2.7-.2 3.9-.7"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M1 12.5C2.7 8.1 7 5 12 5s9.3 3.1 11 7.5C21.3 16.9 17 20 12 20S2.7 16.9 1 12.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12.5" r="3.2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

/** Campo de senha com ícone para mostrar/ocultar — use em todos os formulários. */
export function PasswordField({
  className = '',
  inputClassName = 'inp',
  id,
  value,
  onChange,
  placeholder,
  autoComplete = 'current-password',
  disabled,
  name,
  required,
  ...rest
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  const handleChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    onChange?.(e);
  };

  return (
    <div className={`password-field password-field--icon ${className}`.trim()}>
      <input
        {...rest}
        id={id}
        name={name}
        className={`${inputClassName} password-field__input`.trim()}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        required={required}
      />
      <button
        type="button"
        className="password-toggle-icon"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Ocultar senha' : 'Ver senha'}
        aria-pressed={visible}
        tabIndex={0}
        disabled={disabled}
      >
        <EyeIcon open={visible} />
      </button>
    </div>
  );
}
