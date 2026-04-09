const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('neutron', {
  connect:    (config)                          => ipcRenderer.invoke('irc:connect', config),
  disconnect: (serverId, message)               => ipcRenderer.invoke('irc:disconnect', { serverId, message }),
  status:     (serverId)                        => ipcRenderer.invoke('irc:status', { serverId }),
  privmsg:    (serverId, target, text)          => ipcRenderer.invoke('irc:privmsg', { serverId, target, text }),
  raw:        (serverId, line)                  => ipcRenderer.invoke('irc:raw', { serverId, line }),
  join:       (serverId, channel, key)          => ipcRenderer.invoke('irc:join', { serverId, channel, key }),
  part:       (serverId, channel, msg)          => ipcRenderer.invoke('irc:part', { serverId, channel, message: msg }),
  topic:      (serverId, channel, topic)        => ipcRenderer.invoke('irc:topic', { serverId, channel, topic }),
  list:       (serverId, channel)               => ipcRenderer.invoke('irc:list', { serverId, channel }),
  nick:       (serverId, nick)                  => ipcRenderer.invoke('irc:nick', { serverId, nick }),
  whois:      (serverId, nick)                  => ipcRenderer.invoke('irc:whois', { serverId, nick }),
  mode:       (serverId, target, modes, params) => ipcRenderer.invoke('irc:mode', { serverId, target, modes, params }),
  kick:       (serverId, channel, nick, reason) => ipcRenderer.invoke('irc:kick', { serverId, channel, nick, reason }),

  loadServers: ()        => ipcRenderer.invoke('config:loadServers'),
  saveServers: (servers) => ipcRenderer.invoke('config:saveServers', servers),
  loadPrefs:   ()        => ipcRenderer.invoke('config:loadPrefs'),
  savePrefs:   (prefs)   => ipcRenderer.invoke('config:savePrefs', prefs),

  logWrite:   (dir, filename, line) => ipcRenderer.invoke('log:write',   { dir, filename, line }),
  logList:    (dir)                 => ipcRenderer.invoke('log:list',    { dir }),
  logRead:    (dir, filename)       => ipcRenderer.invoke('log:read',    { dir, filename }),
  logDelete:  (dir, filename)       => ipcRenderer.invoke('log:delete',  { dir, filename }),
  logOpenDir: (dir)                 => ipcRenderer.invoke('log:openDir', { dir }),
  logExport:  (dir, filename)       => ipcRenderer.invoke('log:export',  { dir, filename }),

  on: (event, callback) => {
    const channel = `irc:${event}`
    const handler = (_e, data) => callback(data)
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.removeListener(channel, handler)
  },
  once: (event, callback) => {
    ipcRenderer.once(`irc:${event}`, (_e, data) => callback(data))
  },
})