import { useIRCStore } from '../stores/useIRCStore'

function pad(n) { return String(n).padStart(2, '0') }

function today() {
    const d = new Date()
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
}

function timestamp() {
    const d = new Date()
    return `[${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}]`
}

function sanitizeFilename(name) {
    return name.replace(/[/\\:*?"<>|]/g, '_')
}

export function logMessage(serverName, channel, msg) {
    const store = useIRCStore()
    if (!store.prefs.logEnabled) return
    if (!window.neutron?.logWrite) return

    const dir      = store.prefs.logDir || '~/birc-logs'
    const filename = `${sanitizeFilename(serverName)}_${sanitizeFilename(channel)}_${today()}.log`

    let line = ''
    const ts = timestamp()

    switch (msg.type) {
        case 'chat':
        case 'mention':
            line = `${ts} <${msg.nick}> ${msg.text}`
            break
        case 'action':
            line = `${ts} * ${msg.nick} ${msg.text}`
            break
        case 'join':
            if (!store.prefs.logSystem) return
            line = `${ts} --> ${msg.text}`
            break
        case 'part':
            if (!store.prefs.logSystem) return
            line = `${ts} <-- ${msg.text}`
            break
        case 'notice':
            line = `${ts} -${msg.nick}- ${msg.text}`
            break
        case 'sys':
            if (!store.prefs.logSystem) return
            line = `${ts} *** ${msg.text}`
            break
        default:
            return
    }

    window.neutron.logWrite(dir, filename, line)
}