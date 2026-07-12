import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { AppProvider } from '../../context/AppContext';

type Options = Omit<RenderOptions, 'wrapper'>;

export function renderWithApp(ui: ReactElement, options?: Options) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <AppProvider>{children}</AppProvider>;
  }
  return render(ui, { wrapper: Wrapper, ...options });
}
