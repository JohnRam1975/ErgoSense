import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { AppProvider } from './context/AppContext';
import App from './App';
import PsicoPublicFormPage from './screens/PsicoPublicFormPage';
import './styles/global.css';
import './styles/admin.css';
import './styles/responsive.css';
import './styles/buttons.css';
import './styles/pwa.css';

registerSW({ immediate: true });

const publicFormMatch = window.location.pathname.match(/^\/form\/([a-f0-9]{48})$/i);

createRoot(document.getElementById('root')!).render(
  publicFormMatch ? (
    <PsicoPublicFormPage token={publicFormMatch[1]} />
  ) : (
    <AppProvider>
      <App />
    </AppProvider>
  ),
);
