"use client";

import {
    createContext, useContext, useState, type ReactNode
} from "react";

type Language = "en" | "es";

interface LanguageSettings {
    language: Language;
    setLanguage: (language: Language) => void;
}

// share one language across the app
const LanguageContext = createContext<LanguageSettings>({
    language: "en",
    setLanguage: () => {}
});

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguage] = useState<Language>("en");

    return (
        <LanguageContext.Provider value={{ language, setLanguage }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    return useContext(LanguageContext);
}