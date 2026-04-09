import { createI18n } from 'vue-i18n'

const localeFiles = import.meta.glob('./locales/*.json', { eager: true })

const messages = {}
const availableLocales = []

for (const path in localeFiles) {
    const module = localeFiles[path]
    const code = path.replace('./locales/', '').replace('.json', '')
    const data = module.default || module

    messages[code] = data

    availableLocales.push({
        code,
        name:  data._meta?.name  || code,
        flag:  data._meta?.flag  || '🌐',
        dir:   data._meta?.dir   || 'ltr',
    })
}

availableLocales.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))

function detectLocale() {
    const saved = localStorage.getItem('birc-locale')
    if (saved && messages[saved]) return saved
    const browser = navigator.language?.split('-')[0]
    if (browser && messages[browser]) return browser
    return 'en'
}

export const i18n = createI18n({
    legacy:        false,
    locale:        detectLocale(),
    fallbackLocale:'en',
    messages,
})

export { availableLocales }

export function setLocale(code) {
    if (!messages[code]) return
    i18n.global.locale.value = code
    localStorage.setItem('birc-locale', code)
    document.documentElement.dir = messages[code]._meta?.dir || 'ltr'
    document.documentElement.lang = code
}