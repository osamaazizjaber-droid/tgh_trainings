import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from './translations';

const LanguageContext = createContext();

export function LanguageProvider({ children, defaultAdmin = true }) {
  // If no saved language, use English for admin areas, Arabic for attendees
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('tms_lang');
    if (saved) return saved;
    // We check URL to hint default (attendee paths usually don't have /admin)
    const isAdmin = window.location.pathname.startsWith('/admin');
    return isAdmin ? 'en' : 'ar';
  });

  useEffect(() => {
    localStorage.setItem('tms_lang', language);
    // Apply direction and font settings to the body
    if (language === 'ar') {
      document.documentElement.dir = 'rtl';
      document.body.classList.add('rtl');
    } else {
      document.documentElement.dir = 'ltr';
      document.body.classList.remove('rtl');
    }
  }, [language]);

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'en' ? 'ar' : 'en'));
  };

  const setLang = (lang) => {
    setLanguage(lang);
  };

  // Translation function
  const t = (key) => {
    if (translations[language] && translations[language][key]) {
      return translations[language][key];
    }
    // Fallback to English, then just the key
    if (translations['en'] && translations['en'][key]) {
      return translations['en'][key];
    }
    return key;
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
