import { useIRCStore } from '../stores/useIRCStore'
import { scheduleReconnect, resetReconnectAttempts } from './ircConnect.js'
import { receiveInit, receiveFinish, decrypt } from './useCrypto.js'
import { logMessage } from './useLogger.js'

const PREFIX_ROLE = { '~': 'owner', '&': 'admin', '@': 'op', '%': 'halfop', '+': 'voice' }
function prefixToRole(prefix) { return PREFIX_ROLE[prefix] || 'user' }

function isoToTs(iso) {
    try {
        const d = new Date(iso)
        const p = n => String(n).padStart(2, '0')
        return `${p(d.getDate())}.${p(d.getMonth()+1)}.${d.getFullYear()} - ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
    } catch { return new Date().toLocaleString() }
}

function applyMode(win, modes, params) {
    const ROLE_FOR   = { o: 'op', h: 'halfop', v: 'voice', a: 'admin', q: 'owner' }
    const PREFIX_FOR = { o: '@', h: '%', v: '+', a: '&', q: '~' }
    let add = true, pi = 0
    for (const ch of modes) {
        if (ch === '+') { add = true; continue }
        if (ch === '-') { add = false; continue }
        const nick = params[pi]
        if (ROLE_FOR[ch] && nick) {
            pi++
            const user = win.users.find(u => u.nick.toLowerCase() === nick.toLowerCase())
            if (user) {
                const isMe = user.nick.toLowerCase() === win.myNick?.toLowerCase()
                if (add) { user.role = ROLE_FOR[ch]; user.prefix = PREFIX_FOR[ch] }
                else      { user.role = isMe ? 'me' : 'user'; user.prefix = '' }
            }
        }
    }
}

export function initIRC() {
    if (!window.neutron) {
        console.warn('[bIRC] window.neutron not available')
        return () => {}
    }

    const store    = useIRCStore()
    const cleanups = []
    const pendingModes = new Map()

    function on(event, cb) {
        const cleanup = window.neutron.on(event, cb)
        cleanups.push(cleanup)
    }

    function getWin(serverId, channel) {
        return store.windows.find(w => w.serverId === serverId && w.channel === channel)
            || store.statusWindows.find(w => w.serverId === serverId)
    }

    function getOrCreateWin(serverId, channel) {
        let win = store.windows.find(w => w.serverId === serverId && w.channel === channel)
        if (!win) {
            const srv = store.getServer(serverId)
            const id  = `win-${serverId}-${channel.replace(/[^a-z0-9]/gi, '')}-${Date.now()}`
            win = {
                id, serverId, channel,
                title: `[${srv?.shortName || serverId}] ${channel}`,
                topic: '', unread: false, dmUnread: false,
                isDM: !channel.startsWith('#') && !channel.startsWith('&'),
                visible: true, minimized: false, maximized: false,
                x: 60 + Math.random()*80, y: 60 + Math.random()*80,
                w: 420, h: 320, z: ++store.zCounter,
                messages: [], users: [],
                myNick: srv?.nick || '', nickClass: srv?.colorClass || '',
            }
            store.windows.push(win)
            store.bringToFront(id)
        }
        return win
    }

    function pushMsg(win, msg) {
        if (!win) return
        win.messages.push(msg)
        if (store.focusedId !== win.id) {
            if (msg.type === 'mention' || (win.isDM && msg.type === 'chat')) win.dmUnread = true
            else if (msg.type === 'chat') win.unread = true
        }
    }

    function statusMsg(serverId, text, type = 'sys') {
        const sw = store.statusWindows.find(w => w.serverId === serverId)
        if (sw) sw.messages.push({ type, ts: store.formatTs(), nick: '-!-', text })
    }

    on('connected', ({ serverId }) => {
        const srv = store.getServer(serverId)
        if (srv) srv.connected = true
        statusMsg(serverId, `*** Verbunden mit ${srv?.name}`)
    })

    on('disconnected', ({ serverId }) => {
        const srv = store.getServer(serverId)
        if (srv) srv.connected = false
        const ts = store.formatTs()
        store.windows.filter(w => w.serverId === serverId && !w.isListResult).forEach(win => {
            win.users = []
            win.messages.push({ type: 'part', ts, nick: '-!-', text: `Disconnected from ${srv?.name || serverId}` })
        })
        statusMsg(serverId, `*** Disconnected from ${srv?.name || serverId}`)
        scheduleReconnect(serverId)
    })

    on('registered', ({ serverId, nick }) => {
        const srv = store.getServer(serverId)
        if (srv) { srv.connected = true; srv.nick = nick }
        store.windows.filter(w => w.serverId === serverId).forEach(w => { w.myNick = nick })
        statusMsg(serverId, `*** Eingeloggt als ${nick}`)
        resetReconnectAttempts(serverId)
    })

    on('statusMsg', ({ serverId, type, text }) => {
        statusMsg(serverId, text, type === 'motd' ? 'notice' : 'sys')
    })

    on('error', ({ serverId, message }) => {
        statusMsg(serverId, `*** Fehler: ${message}`)
        const srv = store.getServer(serverId)
        if (srv) srv.connected = false
    })

    on('privmsg', async ({ serverId, nick, target, text, ts, isAction, isDM, tags }) => {
        const myNick  = store.getServer(serverId)?.nick || ''
        const srv     = store.getServer(serverId)
        if (nick === myNick) return
        const channel = isDM ? nick : target

        if (text.startsWith('\x01BIRC_KEM_INIT ') && text.endsWith('\x01')) {
            const pubKeyB64     = text.slice(15, -1)
            const ciphertextB64 = await receiveInit(serverId, nick, pubKeyB64)
            window.neutron?.raw(serverId, `PRIVMSG ${nick} :\x01BIRC_KEM_FINISH ${ciphertextB64}\x01`)
            const win = getOrCreateWin(serverId, nick)
            pushMsg(win, { type: 'sys', ts: store.formatTs(), nick: '-!-', text: '🔒 Verschlüsselung aktiv' })
            return
        }

        if (text.startsWith('\x01BIRC_KEM_FINISH ') && text.endsWith('\x01')) {
            const ciphertextB64 = text.slice(17, -1)
            const ok = await receiveFinish(serverId, nick, ciphertextB64)
            const win = getOrCreateWin(serverId, nick)
            pushMsg(win, {
                type: 'sys', ts: store.formatTs(), nick: '-!-',
                text: ok ? '🔒 Verschlüsselung aktiv' : '⚠️ Handshake fehlgeschlagen'
            })
            return
        }

        if (text.startsWith('\x01BIRC_ENC ') && text.endsWith('\x01')) {
            const encB64    = text.slice(10, -1)
            const plaintext = await decrypt(serverId, nick, encB64)
            const win       = getOrCreateWin(serverId, channel)
            const tsStr     = tags?.time ? isoToTs(tags.time) : store.formatTs()
            const msg       = {
                type: 'chat', ts: tsStr, nick, role: 'user',
                text: plaintext ?? '⚠️ Entschlüsselung fehlgeschlagen',
                encrypted: true,
            }
            pushMsg(win, msg)
            logMessage(srv?.name || serverId, channel, msg)
            return
        }

        const win       = getOrCreateWin(serverId, channel)
        const tsStr     = tags?.time ? isoToTs(tags.time) : store.formatTs()
        const isMention = !isDM && text.toLowerCase().includes(myNick.toLowerCase())
        const msg       = {
            type: isAction ? 'action' : isMention ? 'mention' : 'chat',
            ts: tsStr, nick, role: 'user',
            text: isAction ? text.slice(8, -1) : text,
        }
        pushMsg(win, msg)
        logMessage(srv?.name || serverId, channel, msg)
    })

    on('notice', ({ serverId, nick, target, text }) => {
        if (!text.trim()) return
        const srv    = store.getServer(serverId)
        const tsStr  = store.formatTs()
        const isChannel = target.startsWith('#') || target.startsWith('&')
        if (isChannel) {
            const win = getWin(serverId, target)
            if (win) {
                const msg = { type: 'notice', ts: tsStr, nick, text }
                pushMsg(win, msg)
                logMessage(srv?.name || serverId, target, msg)
            }
        } else {
            statusMsg(serverId, `[${nick}] ${text}`, 'notice')
        }
    })

    on('join', ({ serverId, channel, nick, isSelf }) => {
        const win = getOrCreateWin(serverId, channel)
        const srv = store.getServer(serverId)
        if (store.prefs.showJoinPart) {
            const msg = { type: 'join', ts: store.formatTs(), nick: '-->', text: `${nick} has joined ${channel}` }
            pushMsg(win, msg)
            logMessage(srv?.name || serverId, channel, msg)
        }
        if (isSelf) {
            win.users = []
            win.receivingNames = true
            pendingModes.delete(`${serverId}:${channel}`)
            win.visible = true
            store.bringToFront(win.id)
        } else {
            if (!win.users.find(u => u.nick.toLowerCase() === nick.toLowerCase())) {
                win.users.push({ nick, prefix: '', role: 'user' })
            }
        }
    })

    on('part', ({ serverId, channel, nick, reason, isSelf }) => {
        const win = getWin(serverId, channel)
        if (!win) return
        const srv = store.getServer(serverId)
        if (store.prefs.showJoinPart) {
            const msg = { type: 'part', ts: store.formatTs(), nick: '<--', text: `${nick} has left ${channel}${reason ? ` (${reason})` : ''}` }
            pushMsg(win, msg)
            logMessage(srv?.name || serverId, channel, msg)
        }
        win.users = win.users.filter(u => u.nick !== nick)
        if (isSelf) store.closeWindow(win.id)
    })

    on('quit', ({ serverId, nick, reason }) => {
        const srv = store.getServer(serverId)
        store.windows.filter(w => w.serverId === serverId).forEach(win => {
            if (win.users.some(u => u.nick === nick)) {
                if (store.prefs.showJoinPart) {
                    const msg = { type: 'part', ts: store.formatTs(), nick: '<--', text: `${nick} has quit${reason ? ` (${reason})` : ''}` }
                    pushMsg(win, msg)
                    logMessage(srv?.name || serverId, win.channel, msg)
                }
                win.users = win.users.filter(u => u.nick !== nick)
            }
        })
    })

    on('kick', ({ serverId, channel, nick: kicker, kicked, reason, isSelf }) => {
        const win = getWin(serverId, channel)
        if (!win) return
        const srv = store.getServer(serverId)
        const msg = { type: 'part', ts: store.formatTs(), nick: '<--', text: `${kicked} was kicked by ${kicker}${reason ? ` (${reason})` : ''}` }
        pushMsg(win, msg)
        logMessage(srv?.name || serverId, channel, msg)
        win.users = win.users.filter(u => u.nick !== kicked)
        if (isSelf) store.closeWindow(win.id)
    })

    on('nick', ({ serverId, oldNick, newNick }) => {
        store.windows.filter(w => w.serverId === serverId).forEach(win => {
            const user = win.users.find(u => u.nick === oldNick)
            if (user) {
                user.nick = newNick
                if (store.prefs.showJoinPart) {
                    const msg = { type: 'sys', ts: store.formatTs(), nick: '-!-', text: `${oldNick} is now known as ${newNick}` }
                    pushMsg(win, msg)
                    logMessage(store.getServer(serverId)?.name || serverId, win.channel, msg)
                }
            }
        })
        const srv = store.getServer(serverId)
        if (srv?.nick === oldNick) {
            srv.nick = newNick
            store.windows.filter(w => w.serverId === serverId).forEach(w => { w.myNick = newNick })
        }
    })

    on('topic', ({ serverId, channel, nick, topic }) => {
        const win = getWin(serverId, channel)
        if (!win) return
        win.topic = topic
        if (nick) {
            const msg = { type: 'sys', ts: store.formatTs(), nick: '-!-', text: `${nick} changed topic to: ${topic}` }
            pushMsg(win, msg)
            logMessage(store.getServer(serverId)?.name || serverId, channel, msg)
        }
    })

    on('names', ({ serverId, channel, users }) => {
        const win    = getOrCreateWin(serverId, channel)
        const myNick = store.getServer(serverId)?.nick || ''
        const ALL_PREFIXES = '~&@%+'
        for (let { nick, prefix } of users) {
            if (!prefix && ALL_PREFIXES.includes(nick[0])) {
                prefix = nick[0]
                nick   = nick.slice(1)
            }
            if (!win.users.find(u => u.nick.toLowerCase() === nick.toLowerCase())) {
                win.users.push({ nick, prefix, role: nick === myNick ? 'me' : prefixToRole(prefix) })
            }
        }
    })

    on('namesEnd', ({ serverId, channel }) => {
        const win = getWin(serverId, channel)
        if (!win) return
        win.receivingNames = false
        const key = `${serverId}:${channel}`
        const pending = pendingModes.get(key)
        if (pending?.length) {
            for (const { modes, params } of pending) applyMode(win, modes, params)
            pendingModes.delete(key)
        }
        const ORDER = { owner: 0, admin: 1, op: 2, halfop: 3, voice: 4, me: 5, user: 6 }
        win.users.sort((a, b) => {
            const rd = (ORDER[a.role] ?? 6) - (ORDER[b.role] ?? 6)
            return rd !== 0 ? rd : a.nick.toLowerCase().localeCompare(b.nick.toLowerCase())
        })
    })

    on('mode', ({ serverId, target, nick: setter, modes, params }) => {
        const win = getWin(serverId, target)
        if (!win) return
        const msg = { type: 'sys', ts: store.formatTs(), nick: '-!-', text: `Mode ${modes}${params.length ? ' ' + params.join(' ') : ''} by ${setter}` }
        pushMsg(win, msg)
        logMessage(store.getServer(serverId)?.name || serverId, target, msg)

        if (params.length > 0) {
            const nickParam  = params[0]
            const nickInList = win.users.find(u => u.nick.toLowerCase() === nickParam.toLowerCase())
            if (win.receivingNames || !nickInList) {
                const key = `${serverId}:${target}`
                if (!pendingModes.has(key)) pendingModes.set(key, [])
                pendingModes.get(key).push({ modes, params })
                return
            }
        }
        applyMode(win, modes, params)
    })

    on('listBatch', ({ serverId, items }) => {
        let listWin = store.windows.find(w => w.serverId === serverId && w.isListResult)
        if (!listWin) {
            const srv = store.getServer(serverId)
            const id  = `list-${serverId}`
            listWin = {
                id, serverId, channel: 'Channel List',
                title: `[${srv?.shortName || serverId}] Channel List`,
                topic: '', isListResult: true,
                unread: false, dmUnread: false, isDM: false,
                visible: true, minimized: false, maximized: false,
                x: 60, y: 40, w: 640, h: 460, z: ++store.zCounter,
                messages: [], listItems: [],
                users: [], myNick: '', nickClass: srv?.colorClass || '',
            }
            store.windows.push(listWin)
            store.bringToFront(id)
        }
        for (const item of items) listWin.listItems.push(item)
    })

    on('listEnd', ({ serverId }) => {
        const listWin = store.windows.find(w => w.serverId === serverId && w.isListResult)
        if (listWin) {
            listWin.title = `[${store.getServer(serverId)?.shortName || serverId}] Channel List (${listWin.listItems.length})`
        }
    })

    on('lag', ({ serverId, lag }) => {
        const srv = store.getServer(serverId)
        if (srv) srv.lag = lag
    })

    return () => cleanups.forEach(fn => fn())
}