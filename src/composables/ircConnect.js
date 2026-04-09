import { useIRCStore } from '../stores/useIRCStore'

const reconnectTimers = new Map()
const reconnectAttempts = new Map()
const MAX_ATTEMPTS = 10
const BASE_DELAY   = 5000  // 5s

function getDelay(attempts) {
    return Math.min(BASE_DELAY * Math.pow(2, attempts), 300000)
}

export async function connectServer(serverId) {
    const store = useIRCStore()
    const srv   = store.getServer(serverId)
    if (!srv || !window.neutron) return

    clearReconnectTimer(serverId)
    reconnectAttempts.set(serverId, 0)

    srv.connected = false

    const config = {
        serverId,
        host:        srv.host      || srv.name,
        port:        srv.port      || 6697,
        ssl:         srv.ssl       !== false,
        nick:        srv.nick      || store.prefs.nick,
        nickAlt:     srv.nickAlt   || store.prefs.nickAlt,
        realname:    srv.realname  || store.prefs.realname,
        username:    srv.username  || store.prefs.username,
        password:    srv.password  || '',
        nickservPass:srv.nickservPass || '',
        saslPass:    srv.saslPass  || '',
        saslNick:    srv.nick      || store.prefs.nick,
        autojoin:    srv.autojoin  || '',
    }

    try {
        await window.neutron.connect(config)
    } catch (e) {
        console.error('[bIRC] connect failed:', e)
    }
}

export async function disconnectServer(serverId, noReconnect = true) {
    const store = useIRCStore()
    const srv   = store.getServer(serverId)
    if (!srv || !window.neutron) return

    if (noReconnect) {
        srv.autoReconnect = false
        clearReconnectTimer(serverId)
        reconnectAttempts.set(serverId, 0)
    }

    await window.neutron.disconnect(serverId, 'bIRC')
    srv.connected = false
}

export function scheduleReconnect(serverId) {
    const store = useIRCStore()
    const srv   = store.getServer(serverId)
    if (!srv) return
    if (srv.autoReconnect === false) return

    const attempts = reconnectAttempts.get(serverId) || 0
    if (attempts >= MAX_ATTEMPTS) {
        const sw = store.statusWindows.find(w => w.serverId === serverId)
        if (sw) sw.messages.push({ type: 'sys', ts: store.formatTs(), nick: '-!-', text: `*** Reconnect aufgegeben nach ${MAX_ATTEMPTS} Versuchen.` })
        return
    }

    const delay = getDelay(attempts)
    const secs  = Math.round(delay / 1000)
    const sw    = store.statusWindows.find(w => w.serverId === serverId)
    if (sw) sw.messages.push({ type: 'sys', ts: store.formatTs(), nick: '-!-', text: `*** Reconnect in ${secs}s... (Versuch ${attempts + 1}/${MAX_ATTEMPTS})` })

    reconnectAttempts.set(serverId, attempts + 1)
    const timer = setTimeout(async () => {
        reconnectTimers.delete(serverId)
        const sw2 = store.statusWindows.find(w => w.serverId === serverId)
        if (sw2) sw2.messages.push({ type: 'sys', ts: store.formatTs(), nick: '-!-', text: `*** Verbinde erneut mit ${store.getServer(serverId)?.name}...` })
        await connectServer(serverId)
    }, delay)

    reconnectTimers.set(serverId, timer)
}

export function clearReconnectTimer(serverId) {
    const t = reconnectTimers.get(serverId)
    if (t) { clearTimeout(t); reconnectTimers.delete(serverId) }
}

export function resetReconnectAttempts(serverId) {
    reconnectAttempts.set(serverId, 0)
}