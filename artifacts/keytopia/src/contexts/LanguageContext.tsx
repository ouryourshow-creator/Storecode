import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { translations, type Lang, type TranslationKey } from '../i18n/translations';

interface LanguageContextValue {
  lang: Lang;
  dir: 'rtl' | 'ltr';
  t: (key: TranslationKey) => string;
  toggleLang: () => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem('keytopia-lang');
    return (stored === 'en' || stored === 'ar') ? stored : 'ar';
  });

  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', lang);
    localStorage.setItem('keytopia-lang', lang);
  }, [lang, dir]);

  const t = (key: TranslationKey): string => translations[lang][key] ?? translations.en[key] ?? key;

  const toggleLang = () => setLang(prev => prev === 'ar' ? 'en' : 'ar');

  return (
    <LanguageContext.Provider value={{ lang, dir, t, toggleLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used inside LanguageProvider');
  return ctx;
}
