/*
 * The words of the interface, in English and Brazilian Portuguese. No library: the product has one screen's worth of text,
 * so a typed dictionary and one reactive language are enough, and a missing key in either language is a type error.
 * (The message a person writes is never translated: it can be in any language and is read aloud as it is.)
 */
import { ref } from 'vue'

export type Lang = 'en' | 'pt'

const en = {
  // the write screen
  tagline: 'Link works once. Expires in 7 days.',
  to: 'To',
  toPlaceholder: 'anyone (optional)',
  toLabel: 'Recipient name, optional',
  messagePlaceholder: 'Say it loud.',
  messageLabel: 'Your message, up to 140 characters',
  writtenToBeScreamed: 'Written to be screamed',
  seal: 'Seal it',
  sealing: 'Sealing...',
  sealingWait: 'Making the scream. This takes a few seconds.',
  // the share screen
  yourLink: 'Your one-time link',
  sealed: 'Sealed. It works once.',
  sealedHint: 'Opening it yourself will burn it.',
  share: 'Share',
  copyLink: 'Copy link',
  copied: 'Copied',
  writeAnother: 'Write another',
  for: 'For',
  shareText: 'Someone sent you something.',
  // the open screen
  opening: 'Opening...',
  couldNotCheck: "Couldn't check this howler.",
  tryAgain: 'Try again',
  someoneSent: 'Someone sent you something',
  openLabel: 'Open the howler. It can only be opened once.',
  forName: 'For {name}.',
  tapTheSeal: 'Tap the seal.',
  loudSound: 'Loud sound.',
  turnDown: 'Turn the volume down first, or mute it.',
  onlyOnce: 'It can only be opened once.',
  messageIs: 'The message: {text}',
  // sound and reports
  muteSound: 'Mute sound',
  report: 'Report this',
  reporting: 'Reporting...',
  reported: 'Reported. Thank you.',
  // the end screens
  burnedTitle: 'This howler has already been delivered.',
  burnedSub: "Nobody can read it again. That's the point.",
  expiredTitle: 'This howler expired before anyone opened it.',
  expiredSub: "Nobody can read it. That's the point.",
  notFoundTitle: 'Nothing here. Maybe it never existed.',
  sendYourOwn: 'Send your own',
  // the footer
  fanNotice: 'Fan project. No affiliation with Warner Bros. or J.K. Rowling.',
  // the controls
  // the accessible name must start with the visible text (WCAG 2.5.3, label in name)
  switchLanguage: 'PT: ver em português',
  languageShort: 'PT',
  useLightTheme: 'Use the light theme',
  useDarkTheme: 'Use the dark theme',
  // errors
  errSlowDown: 'Slow down. Too many howlers for now. Try again in a bit.',
  errTomorrow: "You've sent a lot of howlers today. Try again tomorrow.",
  errMinutes: 'Slow down. Try again in about {n} minutes.',
  errSecond: 'Slow down. Try again in {n} second.',
  errSeconds: 'Slow down. Try again in {n} seconds.',
  errNetwork: "Can't reach the server. Check your connection and try again.",
  errInvalid: 'That could not be sent.',
  errServer: 'Something broke on our side. Try again in a moment.',
  errGeneric: 'Something went wrong. Try again.',
} as const

const pt: Record<keyof typeof en, string> = {
  tagline: 'O link funciona uma vez. Expira em 7 dias.',
  to: 'Para',
  toPlaceholder: 'alguém (opcional)',
  toLabel: 'Nome de quem recebe, opcional',
  messagePlaceholder: 'Grite aqui.',
  messageLabel: 'Seu recado, até 140 caracteres',
  writtenToBeScreamed: 'Escrito para ser gritado',
  seal: 'Selar',
  sealing: 'Selando...',
  sealingWait: 'Preparando o grito. Leva alguns segundos.',
  yourLink: 'Seu link de uso único',
  sealed: 'Selado. Funciona uma vez.',
  sealedHint: 'Se você mesmo abrir, ele queima.',
  share: 'Compartilhar',
  copyLink: 'Copiar link',
  copied: 'Copiado',
  writeAnother: 'Escrever outro',
  for: 'Para',
  shareText: 'Alguém te enviou uma coisa.',
  opening: 'Abrindo...',
  couldNotCheck: 'Não deu para verificar este howler.',
  tryAgain: 'Tentar de novo',
  someoneSent: 'Alguém te enviou uma coisa',
  openLabel: 'Abrir o howler. Ele só pode ser aberto uma vez.',
  forName: 'Para {name}.',
  tapTheSeal: 'Toque no selo.',
  loudSound: 'Som alto.',
  turnDown: 'Abaixe o volume antes, ou silencie.',
  onlyOnce: 'Só pode ser aberto uma vez.',
  messageIs: 'O recado: {text}',
  muteSound: 'Silenciar som',
  report: 'Denunciar',
  reporting: 'Denunciando...',
  reported: 'Denunciado. Obrigada.',
  burnedTitle: 'Este howler já foi entregue.',
  burnedSub: 'Ninguém pode ler de novo. É esse o ponto.',
  expiredTitle: 'Este howler expirou antes de alguém abrir.',
  expiredSub: 'Ninguém pode ler. É esse o ponto.',
  notFoundTitle: 'Nada aqui. Talvez nunca tenha existido.',
  sendYourOwn: 'Envie o seu',
  fanNotice: 'Projeto de fã. Sem ligação com a Warner Bros. nem com J.K. Rowling.',
  switchLanguage: 'EN: view in English',
  languageShort: 'EN',
  useLightTheme: 'Usar o tema claro',
  useDarkTheme: 'Usar o tema escuro',
  errSlowDown: 'Calma. Howlers demais por enquanto. Tente de novo daqui a pouco.',
  errTomorrow: 'Você enviou muitos howlers hoje. Tente de novo amanhã.',
  errMinutes: 'Calma. Tente de novo em cerca de {n} minutos.',
  errSecond: 'Calma. Tente de novo em {n} segundo.',
  errSeconds: 'Calma. Tente de novo em {n} segundos.',
  errNetwork: 'Não consegui falar com o servidor. Confira a conexão e tente de novo.',
  errInvalid: 'Não foi possível enviar isso.',
  errServer: 'Algo deu errado do nosso lado. Tente de novo em instantes.',
  errGeneric: 'Algo deu errado. Tente de novo.',
}

export const dictionaries: Record<Lang, Record<keyof typeof en, string>> = { en, pt }
export type Key = keyof typeof en

const STORAGE = 'howler.lang'

function initial(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE)
    if (saved === 'en' || saved === 'pt') return saved
  } catch { /* private mode: no memory, the browser language decides */ }
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('pt') ? 'pt' : 'en'
}

/** The language on screen. Reading it inside a template or a computed makes that piece re-render when it changes. */
export const lang = ref<Lang>(initial())

function apply(): void {
  if (typeof document !== 'undefined') document.documentElement.lang = lang.value === 'pt' ? 'pt-BR' : 'en'
}
apply()

export function setLang(next: Lang): void {
  lang.value = next
  apply()
  try { localStorage.setItem(STORAGE, next) } catch { /* not remembered: fine */ }
}

/** Looks a key up in the current language and fills {placeholders}. */
export function t(key: Key, params?: Record<string, string | number>): string {
  const text = dictionaries[lang.value][key]
  return params ? text.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? '')) : text
}
