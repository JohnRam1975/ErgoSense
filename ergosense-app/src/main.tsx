import { createRoot } from 'react-dom/client';
import { AppProvider } from './context/AppContext';
import App from './App';
import PsicoPublicFormPage from './screens/PsicoPublicFormPage';
import './styles/global.css';
import './styles/admin.css';
import './styles/responsive.css';

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
