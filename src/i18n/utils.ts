import en from './en.json';
import trJson from './tr.json';
import arJson from './ar.json';
import zhJson from './zh.json';

// Yeni dil: buraya bir satır + {lang}.json + astro.config `locales`.
export const languages = {
  en: { label: 'English', hreflang: 'en', dir: 'ltr', ogLocale: 'en_US' },
  tr: { label: 'Türkçe', hreflang: 'tr', dir: 'ltr', ogLocale: 'tr_TR' },
  ar: { label: 'العربية', hreflang: 'ar', dir: 'rtl', ogLocale: 'ar_AR' },
  zh: { label: '中文', hreflang: 'zh-Hans', dir: 'ltr', ogLocale: 'zh_CN' },
} as const;

export type Lang = keyof typeof languages;
export const defaultLang: Lang = 'en';
export const langs = Object.keys(languages) as Lang[];

// Tüm sözlükler en.json şemasını sağlamak zorunda: eksik anahtar `npx astro check`'te hata verir.
const tr: typeof en = trJson;
const ar: typeof en = arJson;
const zh: typeof en = zhJson;
const dictionaries = { en, tr, ar, zh };

export const useTranslations = (lang: Lang) => dictionaries[lang];

// Slug'lar varsayılan olarak İngilizce; yalnızca çevrilen diller override eder.
const slugs = {
  home: '',
  about: 'about',
  risk: 'legal/risk',
  privacy: 'legal/privacy',
  cookies: 'legal/cookies',
  terms: 'legal/terms',
};
export type RouteKey = keyof typeof slugs;
export const routeKeys = Object.keys(slugs) as RouteKey[];

const slugOverrides: Partial<Record<Lang, Partial<Record<RouteKey, string>>>> = {
  tr: {
    about: 'hakkimizda',
    risk: 'yasal/risk',
    privacy: 'yasal/gizlilik',
    cookies: 'yasal/cerez',
    terms: 'yasal/kosullar',
  },
};

/** getPath('about', 'tr') → '/tr/hakkimizda/', getPath('home', 'en') → '/'
 *  Sondaki '/': GitHub Pages klasör adreslerini '/'suz istekte '/'lıya yönlendirir; linkler baştan '/'lı olsun. */
export function getPath(route: RouteKey, lang: Lang) {
  const slug = slugOverrides[lang]?.[route] ?? slugs[route];
  const prefix = lang === defaultLang ? '' : `/${lang}`;
  return `${prefix}/${slug}/`.replace(/\/+$/, '/');
}

export const legalRoutes = ['risk', 'privacy', 'cookies', 'terms'] as const;
export { contactUrl } from '../data/contact';
