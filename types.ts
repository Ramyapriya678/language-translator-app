
export interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export interface TranslationHistoryItem {
  id: string;
  sourceText: string;
  translatedText: string;
  fromLang: Language;
  toLang: Language;
  timestamp: number;
}

export enum TranslationMode {
  TEXT = 'text',
  VOICE = 'voice'
}
