import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';

export const locales = [
  'ko', 'en', 'ja', 'zh', 'es', 'pt', 'de', 'fr', 'ar', 'hi', 'id'
] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'ko';

export const localeNames: Record<Locale, string> = {
  ko: '한국어', en: 'English', ja: '日本語', zh: '中文', es: 'Español',
  pt: 'Português', de: 'Deutsch', fr: 'Français', ar: 'العربية', hi: 'हिन्दी', id: 'Bahasa Indonesia'
};

export const rtlLocales: Locale[] = ['ar'];

export default getRequestConfig(async ({ locale }) => {
  if (!locales.includes(locale as Locale)) notFound();
  return {
    messages: (await import(`./messages/${locale}.json`)).default
  };
});
