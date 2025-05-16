import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

// Importaciones directas
import en from './translations/en.json';
import es from './translations/es.json';

// Inicialización explícita con await
const initI18n = async () => {
  await i18next
    // Conecta i18next con react-i18next
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
        es: { translation: es }
      },
      lng: 'es', // Comienza con español para probar
      fallbackLng: 'en',
      // Configuración de compatibilidad para React Native
      compatibilityJSON: 'v3',
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false,
      },
      // Configuración adicional para React Native
      detection: {
        order: ['localStorage', 'navigationLanguage'],
      },
    });

  
  return i18next;
};

// Inicializa inmediatamente
initI18n();

export default i18next;