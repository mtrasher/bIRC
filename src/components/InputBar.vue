<template>
  <div class="mw-input">
    <span class="inp-nick" :class="win.nickClass">{{ win.myNick }}@{{ serverShortName }}&gt;</span>
    <button
        v-if="win.isDM"
        class="enc-btn"
        :class="{ active: isEncrypted, pending: isPending }"
        @click="toggleEncryption"
        :title="isEncrypted ? 'Verschlüsselt' : isPending ? 'Warte auf Antwort…' : 'Verschlüsselung starten'"
    >🔒</button>
    <input
        class="inp"
        type="text"
        v-model="inputText"
        :placeholder="placeholder"
        @keydown.enter="onEnter"
        @keydown.tab.prevent="onTab"
        @keydown.up.prevent="historyUp"
        @keydown.down.prevent="historyDown"
        @keydown="onAnyKey"
        ref="inputEl"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useIRCStore } from '../stores/useIRCStore'
import { getSession, initiateHandshake, encrypt } from '../composables/useCrypto.js'

const { t } = useI18n()
const props = defineProps({ win: { type: Object, required: true } })
const store     = useIRCStore()
const inputText = ref('')
const inputEl   = ref(null)
const history   = ref([])
const histIdx   = ref(-1)

const serverShortName = computed(() => store.getServer(props.win.serverId)?.shortName || props.win.serverId)
const placeholder     = computed(() =>
    props.win.isStatus
        ? t('input.placeholderStatus')
        : t('input.placeholder', { channel: props.win.channel })
)

const isEncrypted = computed(() => getSession(props.win.serverId, props.win.channel)?.state === 'active')
const isPending   = computed(() => getSession(props.win.serverId, props.win.channel)?.state === 'pending')

async function toggleEncryption() {
  if (isEncrypted.value || isPending.value) return
  const pubKeyB64 = await initiateHandshake(props.win.serverId, props.win.channel)
  if (window.neutron) {
    await window.neutron.raw(
        props.win.serverId,
        `PRIVMSG ${props.win.channel} :\x01BIRC_KEM_INIT ${pubKeyB64}\x01`
    )
  }
  sysMsg('🔒 Verschlüsselung angefragt, warte auf Antwort…')
}

async function onEnter() {
  const raw = inputText.value.trim()
  if (!raw) return
  tabState.value = null

  history.value.unshift(raw)
  if (history.value.length > 100) history.value.pop()
  histIdx.value = -1

  if (raw.startsWith('/')) {
    await handleCommand(raw)
  } else {
    await sendText(raw)
  }
  inputText.value = ''
}

async function sendText(text) {
  const target = props.win.channel
  const ts     = store.formatTs()
  let outText  = text

  if (isEncrypted.value) {
    const enc = await encrypt(props.win.serverId, target, text)
    if (enc) outText = `\x01BIRC_ENC ${enc}\x01`
  }

  props.win.messages.push({
    type: 'chat', ts, nick: props.win.myNick, role: 'me', text,
  })

  if (window.neutron) {
    await window.neutron.privmsg(props.win.serverId, target, outText)
  }
}

async function handleCommand(raw) {
  const parts   = raw.slice(1).split(' ')
  const cmd     = parts[0].toLowerCase()
  const args    = parts.slice(1)
  const srvId   = props.win.serverId
  const channel = props.win.channel
  const neutron = window.neutron

  switch (cmd) {

    case 'join':
      if (!args[0]) return sysMsg('Usage: /join #channel [key]')
      neutron ? await neutron.join(srvId, args[0], args[1]) : sysMsg('/join ' + args.join(' '))
      break

    case 'part':
    case 'leave':
      neutron ? await neutron.part(srvId, args[0] || channel, args.slice(1).join(' ')) : sysMsg('/part')
      break

    case 'nick':
      if (!args[0]) return sysMsg('Usage: /nick <newnick>')
      neutron ? await neutron.nick(srvId, args[0]) : sysMsg('/nick ' + args[0])
      break

    case 'msg':
    case 'query': {
      if (!args[0]) return sysMsg('Usage: /msg <nick> <message>')
      const target = args[0]
      const text   = args.slice(1).join(' ')
      if (text && neutron) await neutron.privmsg(srvId, target, text)
      break
    }

    case 'me': {
      const text = args.join(' ')
      props.win.messages.push({ type: 'action', ts: store.formatTs(), nick: props.win.myNick, role: 'me', text })
      if (neutron) await neutron.raw(srvId, `PRIVMSG ${channel} :\x01ACTION ${text}\x01`)
      break
    }

    case 'notice':
      if (!args[0]) return sysMsg('Usage: /notice <target> <message>')
      neutron ? await neutron.raw(srvId, `NOTICE ${args[0]} :${args.slice(1).join(' ')}`) : sysMsg('/notice')
      break

    case 'whois':
      if (!args[0]) return sysMsg('Usage: /whois <nick>')
      neutron ? await neutron.whois(srvId, args[0]) : sysMsg('/whois ' + args[0])
      break

    case 'topic':
      if (!args[0]) {
        neutron ? await neutron.raw(srvId, `TOPIC ${channel}`) : sysMsg('/topic')
      } else {
        neutron ? await neutron.topic(srvId, channel, args.join(' ')) : sysMsg('/topic ' + args.join(' '))
      }
      break

    case 'list':
      neutron ? await neutron.list(srvId, args[0]) : sysMsg('/list')
      break

    case 'motd':
      neutron ? await neutron.raw(srvId, 'MOTD') : sysMsg('/motd')
      break

    case 'names':
      neutron ? await neutron.raw(srvId, `NAMES ${args[0] || channel}`) : sysMsg('/names')
      break

    case 'kick': {
      if (!args[0]) return sysMsg('Usage: /kick <nick> [reason]')
      const reason = args.slice(1).join(' ')
      neutron ? await neutron.kick(srvId, channel, args[0], reason) : sysMsg('/kick')
      break
    }

    case 'mode': {
      const target  = args[0]?.startsWith('#') ? args[0] : channel
      const modes   = args[0]?.startsWith('#') ? args[1] : args[0]
      const mparams = args[0]?.startsWith('#') ? args.slice(2) : args.slice(1)
      if (!modes) return sysMsg('Usage: /mode [#channel] <modes> [params]')
      neutron ? await neutron.mode(srvId, target, modes, mparams) : sysMsg('/mode')
      break
    }

    case 'op':
      if (!args[0]) return sysMsg('Usage: /op <nick>')
      neutron ? await neutron.mode(srvId, channel, '+o', [args[0]]) : sysMsg('/op')
      break

    case 'deop':
      neutron ? await neutron.mode(srvId, channel, '-o', [args[0]]) : sysMsg('/deop')
      break

    case 'voice':
      neutron ? await neutron.mode(srvId, channel, '+v', [args[0]]) : sysMsg('/voice')
      break

    case 'devoice':
      neutron ? await neutron.mode(srvId, channel, '-v', [args[0]]) : sysMsg('/devoice')
      break

    case 'ban':
      if (!args[0]) return sysMsg('Usage: /ban <nick!user@host>')
      neutron ? await neutron.mode(srvId, channel, '+b', [args[0]]) : sysMsg('/ban')
      break

    case 'unban':
      neutron ? await neutron.mode(srvId, channel, '-b', [args[0]]) : sysMsg('/unban')
      break

    case 'invite':
      if (!args[0]) return sysMsg('Usage: /invite <nick> [#channel]')
      neutron ? await neutron.raw(srvId, `INVITE ${args[0]} ${args[1] || channel}`) : sysMsg('/invite')
      break

    case 'ping':
      if (neutron) await neutron.raw(srvId, `PING :${args[0] || 'birc'}`)
      sysMsg(`Pinging ${args[0] || 'server'}...`)
      break

    case 'quote':
    case 'raw':
      if (!args[0]) return sysMsg('Usage: /raw <IRC command>')
      neutron ? await neutron.raw(srvId, args.join(' ')) : sysMsg('No connection')
      break

    case 'connect': {
      if (!args[0]) return sysMsg('Usage: /connect <host> [port] [ssl]')
      const conf = {
        serverId: 'srv-' + Date.now(),
        host:     args[0],
        port:     parseInt(args[1], 10) || 6697,
        ssl:      args[2] !== 'nossl',
        nick:     store.prefs.nick,
        nickAlt:  store.prefs.nickAlt,
        realname: store.prefs.realname,
        username: store.prefs.username,
      }
      store.servers.push({ id: conf.serverId, name: conf.host, shortName: conf.host.split('.')[0], colorClass: 'li', connected: false, expanded: true })
      if (neutron) await neutron.connect(conf)
      break
    }

    case 'disconnect':
      neutron ? await neutron.disconnect(srvId, args.join(' ') || 'bIRC') : sysMsg('Not connected')
      break

    case 'clear':
      props.win.messages = []
      break

    case 'help':
      sysMsg('Commands: /join /part /nick /msg /me /whois /topic /list /kick /mode /op /deop /voice /ban /invite /raw /connect /disconnect /clear')
      break

    default:
      if (neutron) {
        await neutron.raw(srvId, raw.slice(1))
      } else {
        sysMsg(`Unknown command: /${cmd}`)
      }
  }
}

function sysMsg(text) {
  props.win.messages.push({ type: 'sys', ts: store.formatTs(), nick: '-!-', text })
}

const tabState = ref(null)

function onTab(e) {
  e.preventDefault()
  const val   = inputText.value
  const pos   = val.lastIndexOf(' ')
  const word  = pos === -1 ? val : val.slice(pos + 1)
  const before = pos === -1 ? '' : val.slice(0, pos + 1)

  if (!word) return

  if (!tabState.value || tabState.value.prefix !== word.toLowerCase()) {
    const users   = props.win.users?.map(u => u.nick) || []
    const cmds    = ['/join','/part','/nick','/msg','/me','/whois','/list','/topic','/kick','/mode','/op','/deop','/voice','/ban','/quit']
    const pool    = word.startsWith('/') ? cmds : users
    const matches = pool.filter(u => u.toLowerCase().startsWith(word.toLowerCase()))
    if (!matches.length) return
    tabState.value = { prefix: word.toLowerCase(), matches, idx: 0, before }
  } else {
    tabState.value.idx = (tabState.value.idx + 1) % tabState.value.matches.length
  }

  const match  = tabState.value.matches[tabState.value.idx]
  const suffix = tabState.value.before === '' ? match + ': ' : match + ' '
  inputText.value = tabState.value.before + suffix
}

function onAnyKey(e) {
  if (e.key !== 'Tab') tabState.value = null
}

function historyUp() {
  if (history.value.length === 0) return
  histIdx.value = Math.min(histIdx.value + 1, history.value.length - 1)
  inputText.value = history.value[histIdx.value]
}

function historyDown() {
  histIdx.value = Math.max(histIdx.value - 1, -1)
  inputText.value = histIdx.value === -1 ? '' : history.value[histIdx.value]
}
</script>

<style scoped>
.enc-btn {
  background: none;
  border: 1px solid transparent;
  cursor: pointer;
  font-size: 14px;
  padding: 0 4px;
  opacity: 0.4;
  transition: opacity 0.2s;
}
.enc-btn.pending { opacity: 0.7; animation: blink 1s infinite; }
.enc-btn.active  { opacity: 1; border-color: #3fb950; }
@keyframes blink  { 0%,100% { opacity: 0.7 } 50% { opacity: 0.3 } }
</style>
