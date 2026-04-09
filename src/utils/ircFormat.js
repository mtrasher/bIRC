const MIRC = [
    '#ffffff','#000000','#00007f','#009300','#ff0000','#7f0000',
    '#9c009c','#fc7f00','#ffff00','#00fc00','#009393','#00ffff',
    '#0000fc','#ff00ff','#7f7f7f','#d2d2d2',
]

function esc(str) {
    return String(str)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;')
}

function linkify(str, prefs) {
    const proxy = prefs?.anonLinks && prefs?.anonProxy ? prefs.anonProxy : null
    return str.replace(/(https?:\/\/[^\s<>"]+)/g, (url) => {
        const href = proxy ? proxy + encodeURIComponent(url) : url
        return `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(url)}</a>`
    })
}

export function formatIRC(text, prefs) {
    if (!text) return ''

    let html    = ''
    let bold    = false
    let italic  = false
    let under   = false
    let reverse = false
    let fg      = null
    let bg      = null
    let buf     = ''

    function closeSpan() {
        if (bold || italic || under || fg !== null || bg !== null) html += '</span>'
    }

    function openSpan() {
        const styles  = []
        const classes = []
        if (bold)   classes.push('irc-b')
        if (italic) classes.push('irc-i')
        if (under)  classes.push('irc-u')
        if (reverse) {
            const rfg = bg  !== null ? MIRC[bg]  : '#0d1117'
            const rbg = fg  !== null ? MIRC[fg]  : '#c9d1d9'
            styles.push(`color:${rfg}`, `background:${rbg}`)
        } else {
            if (fg !== null) styles.push(`color:${MIRC[fg]}`)
            if (bg !== null) styles.push(`background:${MIRC[bg]}`)
        }
        if (classes.length || styles.length) {
            html += `<span`
            if (classes.length) html += ` class="${classes.join(' ')}"`
            if (styles.length)  html += ` style="${styles.join(';')}"`
            html += '>'
        }
    }

    function flushBuf() {
        if (buf) { html += linkify(esc(buf), prefs); buf = '' }
    }

    function change(fn) {
        flushBuf(); closeSpan(); fn(); openSpan()
    }

    let i = 0
    while (i < text.length) {
        const ch = text[i]

        if (ch === '\x02') { change(() => { bold   = !bold   }); i++; continue }
        if (ch === '\x1D') { change(() => { italic = !italic }); i++; continue }
        if (ch === '\x1F') { change(() => { under  = !under  }); i++; continue }
        if (ch === '\x16') { change(() => { reverse= !reverse}); i++; continue }
        if (ch === '\x0F') { change(() => { bold=italic=under=reverse=false; fg=bg=null }); i++; continue }

        if (ch === '\x03') {
            i++
            let fgStr = '', bgStr = ''
            while (i < text.length && /\d/.test(text[i]) && fgStr.length < 2) fgStr += text[i++]
            if (i < text.length && text[i] === ',' && /\d/.test(text[i+1])) {
                i++
                while (i < text.length && /\d/.test(text[i]) && bgStr.length < 2) bgStr += text[i++]
            }
            change(() => {
                if (fgStr === '') { fg = bg = null }
                else {
                    const n = parseInt(fgStr, 10)
                    fg = (n >= 0 && n <= 15) ? n : null
                    if (bgStr !== '') { const b = parseInt(bgStr, 10); bg = (b >= 0 && b <= 15) ? b : null }
                }
            })
            continue
        }

        buf += ch; i++
    }

    flushBuf(); closeSpan()
    return html
}

export function parseCTCP(text) {
    if (!text || text[0] !== '\x01') return null
    const inner = text.slice(1, text.endsWith('\x01') ? -1 : undefined)
    const space = inner.indexOf(' ')
    if (space === -1) return { type: inner.toUpperCase(), param: '' }
    return { type: inner.slice(0, space).toUpperCase(), param: inner.slice(space + 1) }
}

export function isAction(text)   { const c = parseCTCP(text); return c && c.type === 'ACTION' }
export function actionText(text) { const c = parseCTCP(text); return c ? c.param : '' }