import { ref } from 'vue'

export const BUILTIN_THEMES = [
    { id: 'origin',   name: 'Origin',   builtin: true },
    { id: '2000',     name: '2000',     builtin: true },
    { id: 'midnight', name: 'Midnight', builtin: true },
    { id: 'y2k',      name: 'Y2K',      builtin: true },
    { id: 'glass',    name: 'Glass',    builtin: true },
]

export const currentTheme  = ref(localStorage.getItem('birc-theme') || 'origin')
export const customThemes  = ref(JSON.parse(localStorage.getItem('birc-custom-themes') || '[]'))

let customStyleEl = null
function getStyleEl() {
    if (!customStyleEl) {
        customStyleEl = document.createElement('style')
        customStyleEl.id = 'birc-custom-theme'
        document.head.appendChild(customStyleEl)
    }
    return customStyleEl
}

export function applyTheme(themeId) {
    document.body.classList.remove(
        'theme-2000',
        'theme-midnight',
        'theme-y2k',
        'theme-glass'
    )
    getStyleEl().textContent = ''

    const builtin = BUILTIN_THEMES.find(t => t.id === themeId)
    if (builtin) {
        if (themeId !== 'origin') document.body.classList.add(`theme-${themeId}`)
        currentTheme.value = themeId
        localStorage.setItem('birc-theme', themeId)
        return
    }

    const custom = customThemes.value.find(t => t.id === themeId)
    if (custom) {
        getStyleEl().textContent = custom.css
        currentTheme.value = themeId
        localStorage.setItem('birc-theme', themeId)
    }
}

export async function loadCustomTheme() {
    return new Promise((resolve) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.css'
        input.onchange = async (e) => {
            const file = e.target.files[0]
            if (!file) return resolve(null)
            const css   = await file.text()
            const name  = file.name.replace('.css', '')
            const id    = 'custom-' + Date.now()
            const theme = { id, name, css, builtin: false }
            customThemes.value.push(theme)
            localStorage.setItem('birc-custom-themes', JSON.stringify(customThemes.value))
            applyTheme(id)
            resolve(theme)
        }
        input.click()
    })
}

export function deleteCustomTheme(id) {
    customThemes.value = customThemes.value.filter(t => t.id !== id)
    localStorage.setItem('birc-custom-themes', JSON.stringify(customThemes.value))
    if (currentTheme.value === id) applyTheme('origin')
}

export function allThemes() {
    return [...BUILTIN_THEMES, ...customThemes.value]
}