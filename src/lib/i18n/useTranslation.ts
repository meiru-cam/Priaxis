import { useUIStore } from '../../stores/ui-store';
import { zh } from './translations/zh';
import { en } from './translations/en';
import type { TranslationKey } from './types';

const translations = {
    zh,
    en,
};

export function useTranslation() {
    const language = useUIStore((state) => state.language);

    const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
        let text = translations[language][key] || key;
        if (params) {
            Object.entries(params).forEach(([k, v]) => {
                text = text.replace(`{${k}}`, String(v));
            });
        }
        return text;
    };

    return { t, language };
}
