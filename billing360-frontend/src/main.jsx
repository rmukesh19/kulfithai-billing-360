import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import { FirebaseProvider } from './lib/AuthContext';
import { ThemeProvider } from './lib/ThemeContext';
import { OfflineProvider } from './lib/OfflineContext';
import { DeleteToastProvider } from './lib/DeleteToastContext';
import { LocalizationProvider } from './lib/LocalizationContext';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <FirebaseProvider>
      <ThemeProvider>
        <OfflineProvider>
          <DeleteToastProvider>
            <LocalizationProvider>
              <App />
            </LocalizationProvider>
          </DeleteToastProvider>
        </OfflineProvider>
      </ThemeProvider>
    </FirebaseProvider>
  </StrictMode>,
);
