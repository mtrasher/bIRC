import { app, BrowserWindow, ipcMain, Menu } from 'electron'
import { fileURLToPath } from 'url'
import path from 'path'
import { IRCClient } from './irc.js'
import Store from 'electron-store'
import fs from 'fs'
import os from 'os'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const store = new Store({
    name: 'birc-config',
    defaults: {
        servers: [],
        prefs:   {},
        windowBounds: { width: 1280, height: 800 },
    },
})

let mainWindow = null
const clients  = new Map()

function createWindow() {
    Menu.setApplicationMenu(null)

    const splash = new BrowserWindow({
        width: 400,
        height: 300,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        resizable: false,
        webPreferences: { nodeIntegration: false, contextIsolation: true },
    })

    splash.loadFile(path.join(__dirname, 'splash.html'))

    const bounds = store.get('windowBounds')
    mainWindow = new BrowserWindow({
        width:  bounds.width  || 1280,
        height: bounds.height || 800,
        x:      bounds.x,
        y:      bounds.y,
        show: false,
        webPreferences: {
            preload:          path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration:  false,
            webSecurity:      false,
        },
    })

    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://127.0.0.1:5173')
        //mainWindow.webContents.openDevTools()
    } else {
        mainWindow.loadURL(`file://${path.join(__dirname, '../dist/index.html')}`)
    }

    mainWindow.once('ready-to-show', () => {
        splash.destroy()
        mainWindow.show()
    })

    mainWindow.on('close', () => store.set('windowBounds', mainWindow.getBounds()))
    mainWindow.on('closed', () => { mainWindow = null })
}

app.whenReady().then(createWindow)
app.on('window-all-closed', () => {
    for (const [id, client] of clients) {
        try { client.disconnect('bIRC closing') } catch (_) {}
    }
    app.quit()
})

function toRenderer(channel, data) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(channel, data)
    }
}

ipcMain.handle('irc:connect', async (event, config) => {
    const { serverId } = config

    if (clients.has(serverId)) {
        try { clients.get(serverId).disconnect() } catch (_) {}
        clients.delete(serverId)
    }

    const client = new IRCClient(serverId, config)

    client.on('statusMsg',   (data) => { toRenderer('irc:statusMsg', data) })
    client.on('connected',   ()     => { toRenderer('irc:connected', { serverId }) })
    client.on('disconnected',()     => { toRenderer('irc:disconnected', { serverId }); clients.delete(serverId) })
    client.on('error',       (msg)  => { toRenderer('irc:error', { serverId, message: msg }) })
    client.on('registered',  (data) => { toRenderer('irc:registered', { serverId, ...data }) })
    client.on('privmsg',     (data) => { toRenderer('irc:privmsg', data) })
    client.on('notice',      (data) => { toRenderer('irc:notice', data) })
    client.on('join',        (data) => { toRenderer('irc:join', data) })
    client.on('part',        (data) => { toRenderer('irc:part', data) })
    client.on('quit',        (data) => { toRenderer('irc:quit', data) })
    client.on('kick',        (data) => { toRenderer('irc:kick', data) })
    client.on('nick',        (data) => { toRenderer('irc:nick', data) })
    client.on('topic',       (data) => { toRenderer('irc:topic', data) })
    client.on('names',       (data) => { toRenderer('irc:names', data) })
    client.on('namesEnd',    (data) => { toRenderer('irc:namesEnd', data) })
    client.on('mode',        (data) => { toRenderer('irc:mode', data) })

    {
        let batch      = []
        let batchTimer = null

        client.on('listItem', (data) => {
            batch.push({ channel: data.channel, users: data.users, topic: data.topic })
            if (!batchTimer) {
                batchTimer = setInterval(() => {
                    if (batch.length > 0) {
                        toRenderer('irc:listBatch', { serverId, items: batch.splice(0) })
                    }
                }, 250)
            }
        })

        client.on('listEnd', (data) => {
            if (batchTimer) { clearInterval(batchTimer); batchTimer = null }
            if (batch.length > 0) {
                toRenderer('irc:listBatch', { serverId, items: batch.splice(0) })
            }
            setTimeout(() => toRenderer('irc:listEnd', data), 150)
        })
    }

    client.on('whois', (data) => { toRenderer('irc:whois', data) })
    client.on('lag',   (data) => { toRenderer('irc:lag', data) })
    client.on('numeric', (data) => { toRenderer('irc:numeric', data) })
    client.on('raw', (data) => {
        if (process.env.NODE_ENV === 'development') {
            toRenderer('irc:raw', data)
        }
    })

    clients.set(serverId, client)
    client.connect()

    return { ok: true }
})

ipcMain.handle('irc:disconnect', async (event, { serverId, message }) => {
    const client = clients.get(serverId)
    if (!client) return { ok: false, error: 'Not connected' }
    client.disconnect(message || 'bIRC')
    clients.delete(serverId)
    return { ok: true }
})

ipcMain.handle('irc:raw', async (event, { serverId, line }) => {
    const client = clients.get(serverId)
    if (!client) return { ok: false, error: 'Not connected' }
    client.send(line)
    return { ok: true }
})

ipcMain.handle('irc:privmsg', async (event, { serverId, target, text }) => {
    const client = clients.get(serverId)
    if (!client) return { ok: false, error: 'Not connected' }
    client.privmsg(target, text)
    return { ok: true }
})

ipcMain.handle('irc:join', async (event, { serverId, channel, key }) => {
    const client = clients.get(serverId)
    if (!client) return { ok: false, error: 'Not connected' }
    client.join(channel, key)
    return { ok: true }
})

ipcMain.handle('irc:part', async (event, { serverId, channel, message }) => {
    const client = clients.get(serverId)
    if (!client) return { ok: false, error: 'Not connected' }
    client.part(channel, message)
    return { ok: true }
})

ipcMain.handle('irc:nick', async (event, { serverId, nick }) => {
    const client = clients.get(serverId)
    if (!client) return { ok: false, error: 'Not connected' }
    client.nick(nick)
    return { ok: true }
})

ipcMain.handle('irc:whois', async (event, { serverId, nick }) => {
    const client = clients.get(serverId)
    if (!client) return { ok: false, error: 'Not connected' }
    client.whois(nick)
    return { ok: true }
})

ipcMain.handle('irc:list', async (event, { serverId, channel }) => {
    const client = clients.get(serverId)
    if (!client) return { ok: false, error: 'Not connected' }
    client.list(channel)
    return { ok: true }
})

ipcMain.handle('irc:topic', async (event, { serverId, channel, topic }) => {
    const client = clients.get(serverId)
    if (!client) return { ok: false, error: 'Not connected' }
    client.topic(channel, topic)
    return { ok: true }
})

ipcMain.handle('irc:mode', async (event, { serverId, target, modes, params }) => {
    const client = clients.get(serverId)
    if (!client) return { ok: false, error: 'Not connected' }
    client.mode(target, modes, ...(params || []))
    return { ok: true }
})

ipcMain.handle('irc:kick', async (event, { serverId, channel, nick, reason }) => {
    const client = clients.get(serverId)
    if (!client) return { ok: false, error: 'Not connected' }
    client.kick(channel, nick, reason)
    return { ok: true }
})

ipcMain.handle('irc:status', async (event, { serverId }) => {
    const client = clients.get(serverId)
    return {
        connected:  client?.connected  || false,
        registered: client?.registered || false,
        nick:       client?.nick       || '',
        lag:        client?.lag        || 0,
    }
})

ipcMain.handle('config:loadServers', async () => store.get('servers', []))
ipcMain.handle('config:saveServers', async (event, servers) => { store.set('servers', servers); return { ok: true } })
ipcMain.handle('config:loadPrefs',   async () => store.get('prefs', {}))
ipcMain.handle('config:savePrefs',   async (event, prefs) => { store.set('prefs', prefs); return { ok: true } })

function resolveLogDir(dir) {
    return dir.replace(/^~/, os.homedir())
}

ipcMain.handle('log:write', async (event, { dir, filename, line }) => {
    try {
        const resolved = resolveLogDir(dir)
        if (!fs.existsSync(resolved)) fs.mkdirSync(resolved, { recursive: true })
        const filepath = path.join(resolved, filename)
        fs.appendFileSync(filepath, line + '\n', 'utf8')
        return { ok: true }
    } catch (e) {
        return { ok: false, error: e.message }
    }
})

ipcMain.handle('log:list', async (event, { dir }) => {
    try {
        const resolved = resolveLogDir(dir)
        if (!fs.existsSync(resolved)) return { ok: true, files: [] }
        const files = fs.readdirSync(resolved)
            .filter(f => f.endsWith('.log'))
            .map(f => {
                const stat = fs.statSync(path.join(resolved, f))
                return { name: f, size: stat.size, mtime: stat.mtime.toISOString() }
            })
            .sort((a, b) => b.mtime.localeCompare(a.mtime))
        return { ok: true, files }
    } catch (e) {
        return { ok: false, error: e.message, files: [] }
    }
})

ipcMain.handle('log:read', async (event, { dir, filename }) => {
    try {
        const filepath = path.join(resolveLogDir(dir), filename)
        const content  = fs.readFileSync(filepath, 'utf8')
        return { ok: true, content }
    } catch (e) {
        return { ok: false, error: e.message }
    }
})

ipcMain.handle('log:delete', async (event, { dir, filename }) => {
    try {
        const filepath = path.join(resolveLogDir(dir), filename)
        fs.unlinkSync(filepath)
        return { ok: true }
    } catch (e) {
        return { ok: false, error: e.message }
    }
})

ipcMain.handle('log:openDir', async (event, { dir }) => {
    const { shell } = await import('electron')
    const resolved = resolveLogDir(dir)
    if (!fs.existsSync(resolved)) fs.mkdirSync(resolved, { recursive: true })
    shell.openPath(resolved)
    return { ok: true }
})

ipcMain.handle('log:export', async (event, { dir, filename }) => {
    try {
        const src  = path.join(resolveLogDir(dir), filename)
        const dest = path.join(os.homedir(), 'Downloads', filename)
        fs.copyFileSync(src, dest)
        return { ok: true, dest }
    } catch (e) {
        return { ok: false, error: e.message }
    }
})