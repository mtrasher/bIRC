import net  from 'net'
import tls  from 'tls'
import { EventEmitter } from 'events'

const RPL_WELCOME      = '001'
const RPL_YOURHOST     = '002'
const RPL_CREATED      = '003'
const RPL_MYINFO       = '004'
const RPL_ISUPPORT     = '005'
const RPL_MOTDSTART    = '375'
const RPL_MOTD         = '372'
const RPL_ENDOFMOTD    = '376'
const ERR_NOMOTD       = '422'
const RPL_NAMREPLY     = '353'
const RPL_ENDOFNAMES   = '366'
const RPL_TOPIC        = '332'
const RPL_TOPICWHOTIME = '333'
const RPL_WHOISUSER    = '311'
const RPL_WHOISSERVER  = '312'
const RPL_WHOISCHANNELS= '319'
const RPL_ENDOFWHOIS   = '318'
const RPL_LIST         = '322'
const RPL_LISTEND      = '323'
const RPL_CHANNELMODEIS= '324'
const RPL_NOTOPIC      = '331'
const ERR_NICKNAMEINUSE= '433'
const ERR_NOSUCHNICK   = '401'
const RPL_AWAY         = '301'
const RPL_NOWAWAY      = '306'
const RPL_UNAWAY       = '305'

export class IRCClient extends EventEmitter {
  constructor(serverId, config) {
    super()
    this.serverId = serverId
    this.config   = config
    this.socket   = null
    this.connected= false
    this.registered = false
    this.nick     = config.nick
    this.channels = new Map()
    this.buffer   = ''
    this.lagTimer = null
    this.pingTime = null
    this.lag      = 0
    this.isupport = {}
  }

  connect() {
    const { host, port, ssl } = this.config

    this._emit('status', `*** Connecting to ${host} (${port})${ssl ? ' via SSL' : ''}...`)

    const opts = { host, port }

    if (ssl) {
      opts.rejectUnauthorized = false
      this.socket = tls.connect(opts, () => this._onConnect())
    } else {
      this.socket = net.createConnection(opts, () => this._onConnect())
    }

    this.socket.setEncoding('utf8')
    this.socket.on('data',  (data) => this._onData(data))
    this.socket.on('close', ()     => this._onClose())
    this.socket.on('error', (err)  => this._onError(err))
    this.socket.on('timeout', ()   => this._onTimeout())
    this.socket.setTimeout(60000)
  }

  disconnect(message = 'bIRC') {
    if (this.socket) {
      this.send(`QUIT :${message}`)
      setTimeout(() => {
        if (this.socket) { this.socket.destroy(); this.socket = null }
      }, 500)
    }
    this._stopLag()
    this.connected  = false
    this.registered = false
  }

  send(line) {
    if (!this.socket || !this.connected) return
    const trimmed = line.slice(0, 510)
    this.socket.write(trimmed + '\r\n')
  }

  join(channel, key = '') {
    this.send(key ? `JOIN ${channel} ${key}` : `JOIN ${channel}`)
  }

  part(channel, message = '') {
    this.send(message ? `PART ${channel} :${message}` : `PART ${channel}`)
  }

  privmsg(target, text) {
    const max = 450 - target.length
    const lines = this._splitMessage(text, max)
    for (const line of lines) this.send(`PRIVMSG ${target} :${line}`)
  }

  notice(target, text) {
    this.send(`NOTICE ${target} :${text}`)
  }

  nick(newNick) {
    this.send(`NICK ${newNick}`)
  }

  whois(nick) {
    this.send(`WHOIS ${nick}`)
  }

  list(channel = '') {
    this.send(channel ? `LIST ${channel}` : 'LIST')
  }

  topic(channel, newTopic = null) {
    if (newTopic === null) this.send(`TOPIC ${channel}`)
    else this.send(`TOPIC ${channel} :${newTopic}`)
  }

  mode(target, modes, ...params) {
    this.send(`MODE ${target} ${modes}${params.length ? ' ' + params.join(' ') : ''}`)
  }

  kick(channel, nick, reason = '') {
    this.send(reason ? `KICK ${channel} ${nick} :${reason}` : `KICK ${channel} ${nick}`)
  }

  _onConnect() {
    this.connected = true
    this._emit('status', `*** Connected. Logging in...`)

    this.send('CAP LS 302')

    if (this.config.password) {
      this.send(`PASS ${this.config.password}`)
    }

    this.send(`NICK ${this.config.nick}`)
    this.send(`USER ${this.config.username || 'birc'} 0 * :${this.config.realname || 'bIRC User'}`)

    this.emit('connected')
  }

  _onClose() {
    this.connected  = false
    this.registered = false
    this._stopLag()
    this._emit('status', `*** Disconnected from ${this.config.host}`)
    this.emit('disconnected')
  }

  _onError(err) {
    this._emit('status', `*** Error: ${err.message}`)
    this.emit('error', err.message)
  }

  _onTimeout() {
    this._emit('status', `*** Connection timed out`)
    this.socket?.destroy()
  }

  _onData(data) {
    this.buffer += data
    const lines = this.buffer.split('\n')
    this.buffer  = lines.pop()

    for (const raw of lines) {
      const line = raw.replace(/\r$/, '')
      if (!line) continue
      this._parseLine(line)
    }
  }

  _parseLine(raw) {
    this.emit('raw', { serverId: this.serverId, line: raw, direction: 'in' })

    let pos    = 0
    let tags   = {}
    let prefix = ''
    let cmd    = ''
    let params = []

    if (raw[0] === '@') {
      const sp = raw.indexOf(' ')
      const tagStr = raw.slice(1, sp)
      pos = sp + 1
      for (const tag of tagStr.split(';')) {
        const [k, v] = tag.split('=')
        tags[k] = v || true
      }
    }

    if (raw[pos] === ':') {
      const sp = raw.indexOf(' ', pos)
      prefix = raw.slice(pos + 1, sp)
      pos    = sp + 1
    }

    const rest = raw.slice(pos)
    const parts = rest.split(' ')
    cmd = parts[0].toUpperCase()
    let i = 1
    while (i < parts.length) {
      if (parts[i].startsWith(':')) {
        params.push(parts.slice(i).join(' ').slice(1))
        break
      }
      params.push(parts[i])
      i++
    }

    const excl = prefix.indexOf('!')
    const nick  = excl !== -1 ? prefix.slice(0, excl) : prefix
    const host  = excl !== -1 ? prefix.slice(excl + 1) : ''

    this._handle(cmd, nick, host, prefix, params, tags)
  }

  _handle(cmd, nick, host, prefix, params, tags) {
    switch (cmd) {

      case 'PING':
        this.send(`PONG :${params[0]}`)
        break

      case 'CAP': {
        const subCmd = params[1]?.toUpperCase()
        if (subCmd === 'LS') {
          const available = (params[2] || '').split(' ')
          const want = ['server-time', 'message-tags', 'away-notify', 'account-notify']
          if (this.config.saslPass && available.includes('sasl')) want.push('sasl')
          const request = want.filter(c => available.includes(c))
          if (request.length) this.send(`CAP REQ :${request.join(' ')}`)
          else this.send('CAP END')
        } else if (subCmd === 'ACK') {
          const acked = (params[2] || '').trim().split(' ')
          if (acked.includes('sasl') && this.config.saslPass) {
            this.send('AUTHENTICATE PLAIN')
          } else {
            this.send('CAP END')
          }
        } else if (subCmd === 'NAK') {
          this.send('CAP END')
        }
        break
      }

      case 'AUTHENTICATE': {
        if (params[0] === '+') {
          const nick = this.config.saslNick || this.config.nick
          const pass = this.config.saslPass
          const str  = `\0${nick}\0${pass}`
          const b64  = Buffer.from(str).toString('base64')
          this.send(`AUTHENTICATE ${b64}`)
        }
        break
      }

      case '903':
        this._emit('status', '*** SASL authentication successful')
        this.send('CAP END')
        break

      case '904':
      case '905':
        this._emit('status', '*** SASL authentication failed')
        this.send('CAP END')
        break

      case RPL_WELCOME: {
        this.nick       = params[0]
        this.registered = true
        this._emit('status', `*** You are connected as ${this.nick}`)
        this.emit('registered', { nick: this.nick })
        if (this.config.nickservPass && !this.config.saslPass) {
          setTimeout(() => {
            this.send(`PRIVMSG NickServ :IDENTIFY ${this.config.nickservPass}`)
            this._emit('status', '*** Sending NickServ identify...')
          }, 500)
        }
        if (this.config.autojoin) {
          const channels = this.config.autojoin.split(',').map(c => c.trim()).filter(Boolean)
          setTimeout(() => channels.forEach(ch => this.join(ch)), 1500)
        }
        this._startLag()
        break
      }

      case RPL_MOTDSTART:
      case RPL_MOTD:
      case RPL_ENDOFMOTD:
      case ERR_NOMOTD:
        this._emit('motd', params[params.length - 1])
        break

      case RPL_ISUPPORT:
        for (const token of params.slice(1, -1)) {
          const [k, v] = token.split('=')
          if (v !== undefined) this.isupport[k] = v
          else this.isupport[k] = true
        }
        break

      case 'NICK': {
        const newNick = params[0]
        if (nick === this.nick) this.nick = newNick
        this.emit('nick', { serverId: this.serverId, oldNick: nick, newNick, host })
        break
      }

      case ERR_NICKNAMEINUSE: {
        const tried = params[1]
        const alt   = this.config.nickAlt || tried + '_'
        this._emit('status', `*** Nick ${tried} is in use, trying ${alt}`)
        this.send(`NICK ${alt}`)
        break
      }

      case 'JOIN': {
        const channel = params[0]
        if (!this.channels.has(channel)) this.channels.set(channel, new Set())
        this.channels.get(channel).add(nick)
        this.emit('join', { serverId: this.serverId, channel, nick, host, isSelf: nick === this.nick })
        break
      }

      case 'PART': {
        const channel = params[0]
        const reason  = params[1] || ''
        this.channels.get(channel)?.delete(nick)
        if (nick === this.nick) this.channels.delete(channel)
        this.emit('part', { serverId: this.serverId, channel, nick, host, reason, isSelf: nick === this.nick })
        break
      }

      case 'QUIT': {
        const reason = params[0] || ''
        for (const [ch, users] of this.channels) users.delete(nick)
        this.emit('quit', { serverId: this.serverId, nick, host, reason })
        break
      }

      case 'KICK': {
        const channel = params[0]
        const kicked  = params[1]
        const reason  = params[2] || ''
        this.channels.get(channel)?.delete(kicked)
        this.emit('kick', { serverId: this.serverId, channel, nick, kicked, reason, isSelf: kicked === this.nick })
        break
      }

      case 'PRIVMSG': {
        const target  = params[0]
        const text    = params[1] || ''
        const ts      = tags['time'] || new Date().toISOString()

        if (text.startsWith('\x01') && text.endsWith('\x01')) {
          const ctcp    = text.slice(1, -1)
          const [ctcpCmd, ...ctcpArgs] = ctcp.split(' ')
          this._handleCTCP(nick, target, ctcpCmd.toUpperCase(), ctcpArgs.join(' '))
          break
        }

        const isAction = text.startsWith('\x01ACTION ') && text.endsWith('\x01')
        this.emit('privmsg', {
          serverId: this.serverId, nick, host, target, text,
          ts, isAction, tags,
          isDM: !target.startsWith('#') && !target.startsWith('&'),
        })
        break
      }

      case 'NOTICE': {
        const target = params[0]
        const text   = params[1] || ''
        const ts     = tags['time'] || new Date().toISOString()
        this.emit('notice', { serverId: this.serverId, nick, host, target, text, ts, tags })
        break
      }

      case 'TOPIC': {
        const channel = params[0]
        const topic   = params[1] || ''
        this.emit('topic', { serverId: this.serverId, channel, nick, topic })
        break
      }

      case RPL_TOPIC: {
        const channel = params[1]
        const topic   = params[2] || ''
        this.emit('topic', { serverId: this.serverId, channel, nick: '', topic })
        break
      }

      case RPL_NOTOPIC: {
        const channel = params[1]
        this.emit('topic', { serverId: this.serverId, channel, nick: '', topic: '' })
        break
      }

      case RPL_NAMREPLY: {
        const channel = params[2]
        if (!this.channels.has(channel)) this.channels.set(channel, new Set())
        const users = params[3]?.split(' ').filter(Boolean) || []
        const prefixStr = this.isupport.PREFIX || ''
        const prefixChars = prefixStr
            ? (prefixStr.match(/\(([^)]*)\)/)?.[1] || '~&@%+')
            : '~&@%+'
        const userList = users.map(u => {
          let i = 0
          while (i < u.length && prefixChars.includes(u[i])) i++
          const prefix = i > 0 ? u[0] : ''
          const nick   = u.slice(i)
          return { nick, prefix }
        })
        this.emit('names', { serverId: this.serverId, channel, users: userList })
        break
      }

      case RPL_ENDOFNAMES: {
        const channel = params[1]
        this.emit('namesEnd', { serverId: this.serverId, channel })
        break
      }

      case 'MODE': {
        const target = params[0]
        const modes  = params[1] || ''
        const mparams = params.slice(2)
        this.emit('mode', { serverId: this.serverId, target, nick, modes, params: mparams })
        break
      }

      case RPL_LIST: {
        const channel = params[1]
        const users   = parseInt(params[2], 10) || 0
        const topic   = params[3] || ''
        this.emit('listItem', { serverId: this.serverId, channel, users, topic })
        break
      }

      case RPL_LISTEND:
        this.emit('listEnd', { serverId: this.serverId })
        break

      case RPL_WHOISUSER:
        this.emit('whois', {
          serverId: this.serverId, type: 'user',
          nick: params[1], user: params[2], host: params[3], realname: params[5],
        })
        break

      case RPL_WHOISSERVER:
        this.emit('whois', { serverId: this.serverId, type: 'server', nick: params[1], server: params[2], info: params[3] })
        break

      case RPL_WHOISCHANNELS:
        this.emit('whois', { serverId: this.serverId, type: 'channels', nick: params[1], channels: params[2] })
        break

      case RPL_ENDOFWHOIS:
        this.emit('whois', { serverId: this.serverId, type: 'end', nick: params[1] })
        break

      case 'PONG': {
        if (this.pingTime) {
          this.lag = Date.now() - this.pingTime
          this.pingTime = null
          this.emit('lag', { serverId: this.serverId, lag: this.lag })
        }
        break
      }

      case 'ERROR':
        this._emit('status', `*** Server error: ${params[0]}`)
        this.emit('serverError', { serverId: this.serverId, message: params[0] })
        break

      default:
        if (/^\d+$/.test(cmd)) {
          this.emit('numeric', { serverId: this.serverId, cmd, nick, params })
        }
        break
    }
  }

  _startLag() {
    this.lagTimer = setInterval(() => {
      if (this.connected && !this.pingTime) {
        this.pingTime = Date.now()
        this.send(`PING :birc_lag_${this.pingTime}`)
      }
    }, 30000)
  }

  _stopLag() {
    if (this.lagTimer) { clearInterval(this.lagTimer); this.lagTimer = null }
    this.pingTime = null
  }

  _handleCTCP(fromNick, target, cmd, args) {
    switch (cmd) {
      case 'BIRC_KEM_INIT':
        this.emit('privmsg', {
          serverId: this.serverId, nick: fromNick, host: '', target,
          text: `\x01BIRC_KEM_INIT ${args}\x01`,
          ts: new Date().toISOString(), isAction: false, tags: {},
          isDM: true,
        })
        break

      case 'BIRC_KEM_FINISH':
        this.emit('privmsg', {
          serverId: this.serverId, nick: fromNick, host: '', target,
          text: `\x01BIRC_KEM_FINISH ${args}\x01`,
          ts: new Date().toISOString(), isAction: false, tags: {},
          isDM: true,
        })
        break

      case 'BIRC_ENC':
        this.emit('privmsg', {
          serverId: this.serverId, nick: fromNick, host: '', target,
          text: `\x01BIRC_ENC ${args}\x01`,
          ts: new Date().toISOString(), isAction: false, tags: {},
          isDM: true,
        })
        break
      case 'VERSION':
        this.send(`NOTICE ${fromNick} :\x01VERSION bIRC 0.1.0 (Electron/Linux)\x01`)
        this._emit('status', `*** CTCP VERSION from ${fromNick}`)
        break
      case 'PING':
        this.send(`NOTICE ${fromNick} :\x01PING ${args}\x01`)
        break
      case 'TIME':
        this.send(`NOTICE ${fromNick} :\x01TIME ${new Date().toString()}\x01`)
        break
      case 'ACTION':
        this.emit('privmsg', {
          serverId: this.serverId, nick: fromNick, host: '', target,
          text: `\x01ACTION ${args}\x01`, ts: new Date().toISOString(),
          isAction: true, tags: {},
          isDM: !target.startsWith('#') && !target.startsWith('&'),
        })
        break
      default:
        break
    }
  }

  _emit(type, text) {
    this.emit('statusMsg', { serverId: this.serverId, type, text })
  }

  _splitMessage(text, maxLen) {
    if (text.length <= maxLen) return [text]
    const lines = []
    let remaining = text
    while (remaining.length > maxLen) {
      const cut = remaining.lastIndexOf(' ', maxLen)
      const pos = cut > 0 ? cut : maxLen
      lines.push(remaining.slice(0, pos))
      remaining = remaining.slice(pos).trimStart()
    }
    if (remaining) lines.push(remaining)
    return lines
  }
}
