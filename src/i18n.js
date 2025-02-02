import { createContext, useContext, useState, useEffect } from 'react';

  const I18nContext = createContext();

  const I18nProvider = ({ children }) => {
    const [language, setLanguage] = useState(localStorage.getItem('language') || 'fr');
    const [translations, setTranslations] = useState({});
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
      localStorage.setItem('language', language);
      loadTranslations(language);
    }, [language]);

    const loadTranslations = async (lang) => {
      setLoading(true);
      try {
        const response = await fetch(`/locales/${lang}.json`);
        if (!response.ok) {
          throw new Error(`Failed to load translations for ${lang}`);
        }
        const data = await response.json();
        setTranslations(data);
        setError(null);
      } catch (err) {
        console.error('Error loading translations:', err);
        setTranslations({});
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const translate = (key) => {
      const keys = key.split('.');
      let translation = translations;
      for (const k of keys) {
        if (translation && translation[k]) {
          translation = translation[k];
        } else {
          console.warn(`Missing translation: ${key}`);
          return key;
        }
      }
      return translation;
    };

    const changeLanguage = (newLanguage) => {
      setLanguage(newLanguage);
    };

    const retryLoadTranslations = () => {
      loadTranslations(language);
    };

    return (
      <I18nContext.Provider value={{ language, translate, changeLanguage, error, loading, retryLoadTranslations }}>
        {children}
      </I18nContext.Provider>
    );
  };

  const useI18n = () => {
    return useContext(I18nContext);
  };

  export { I18nProvider, useI18n };
