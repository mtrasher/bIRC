<template>
  <div class="dlg-overlay" @mousedown.self="close">
    <div class="dlg" style="width:400px;">
      <div class="dlg-tb">
        <span class="dlg-title">{{ props.editServer ? 'Server bearbeiten' : 'Add Server' }}</span>
        <div class="dlg-close" @click="close">×</div>
      </div>
      <div class="dlg-body">
        <div class="dlg-section">Connection</div>
        <div class="dlg-row"><label class="dlg-lbl">Name</label><input class="dlg-inp" v-model="form.name" placeholder="My Server" ref="inputRef" /></div>

        <div class="dlg-row" style="position:relative" @click.stop>
          <label class="dlg-lbl">Host</label>
          <input class="dlg-inp" v-model="form.host" placeholder="irc.example.net" @focus="showHosts = true" />
          <div v-if="showHosts" class="host-drop">
            <div v-for="h in filteredHosts" :key="h.host" class="host-item" @click="pickHost(h)">
              <strong>{{ h.name }}</strong>
              <span style="color:#808080; font-size:10px">{{ h.host }}</span>
            </div>
          </div>
        </div>

        <div class="dlg-row">
          <label class="dlg-lbl">Port</label>
          <input class="dlg-inp" v-model.number="form.port" type="number" min="1" max="65535" />
          <label class="dlg-check" style="padding-left:10px; width:auto;">
            <input type="checkbox" v-model="form.ssl" /><span>SSL/TLS</span>
          </label>
        </div>
        <div class="dlg-row"><label class="dlg-lbl">Password</label><input class="dlg-inp" v-model="form.password" type="password" placeholder="(optional)" /></div>

        <div class="dlg-section">Identity</div>
        <div class="dlg-row"><label class="dlg-lbl">Nickname</label><input class="dlg-inp" v-model="form.nick" placeholder="YourNick" /></div>
        <div class="dlg-row"><label class="dlg-lbl">Alt. Nickname</label><input class="dlg-inp" v-model="form.nickAlt" placeholder="YourNick_" /></div>
        <div class="dlg-row"><label class="dlg-lbl">Real name</label><input class="dlg-inp" v-model="form.realname" /></div>
        <div class="dlg-row"><label class="dlg-lbl">Username</label><input class="dlg-inp" v-model="form.username" /></div>

        <div class="dlg-section">Auto-join</div>
        <div class="dlg-row"><label class="dlg-lbl">Channels</label><input class="dlg-inp" v-model="form.autojoin" placeholder="#channel1,#channel2" /></div>
      </div>
      <div class="dlg-footer">
        <button class="dlg-btn" @click="close">Cancel</button>
        <button class="dlg-btn" @click="addAndConnect" v-if="!props.editServer">Add &amp; Connect</button>
        <button class="dlg-btn primary" @click="addOnly">{{ props.editServer ? 'Speichern' : 'Add' }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted, onUnmounted } from 'vue'
import { useIRCStore } from '../stores/useIRCStore'
import { connectServer } from '../composables/ircConnect.js'

const props = defineProps({ editServer: { type: Object, default: null } })
const emit  = defineEmits(['close'])
const store = useIRCStore()
const inputRef = ref(null)
const showHosts = ref(false)

const form = reactive({
  name: '', host: '', port: 6697, ssl: true,
  password: '', nick: '', nickAlt: '', realname: 'bIRC User',
  username: 'birc', autojoin: ''
})

const IRC_HOSTS = [
    { name: 'Hackint',     host: 'irc.hackint.org',    port: 6697, ssl: true  },
    { name: 'Libera.Chat', host: 'irc.libera.chat',    port: 6697, ssl: true  },
    { name: 'OFTC',        host: 'irc.oftc.net',       port: 6697, ssl: true  },
    { name: 'EFnet',       host: 'irc.choopa.net',     port: 6697, ssl: true  },
    { name: 'IRCnet',      host: 'irc.atw-inter.net',  port: 6697, ssl: true  },
    { name: 'Rizon',       host: 'irc.rizon.net',      port: 6697, ssl: true  },
    { name: 'EsperNet',    host: 'irc.esper.net',      port: 6697, ssl: true  },
    { name: 'Snoonet',     host: 'irc.snoonet.org',    port: 6697, ssl: true  },
    { name: 'DALnet',      host: 'irc.dal.net',        port: 6697, ssl: true  },
    { name: 'QuakeNet',    host: 'irc.quakenet.org',   port: 6667, ssl: false },
    { name: 'GameSurge',   host: 'irc.gamesurge.net',  port: 6697, ssl: true  },
    { name: 'Undernet',    host: 'ix1.undernet.org',   port: 6667, ssl: false },
    { name: 'Freenode',    host: 'chat.freenode.net',  port: 6697, ssl: true  }
]

const filteredHosts = computed(() =>
    IRC_HOSTS.filter(h =>
        h.host.includes(form.host) ||
        h.name.toLowerCase().includes(form.host.toLowerCase()) ||
        form.host === ''
    )
)

const closeHosts = () => showHosts.value = false

onMounted(() => {
  inputRef.value?.focus()
  if (props.editServer) Object.assign(form, props.editServer)
  document.addEventListener('click', closeHosts)
})

onUnmounted(() => {
  document.removeEventListener('click', closeHosts)
})

function pickHost(h) {
  form.host = h.host
  form.port = h.port
  form.ssl  = h.ssl
  if (!form.name) form.name = h.name
  showHosts.value = false
}

function addOnly() {
  if (!form.host || !form.nick) return
  if (props.editServer) {
    Object.assign(props.editServer, form)
    close()
    return
  }
  const id = 'srv-' + Date.now()
  store.servers.push({
    id,
    name:       form.name || form.host,
    host:       form.host,
    port:       form.port,
    ssl:        form.ssl,
    password:   form.password,
    nick:       form.nick,
    nickAlt:    form.nickAlt || form.nick + '_',
    realname:   form.realname,
    username:   form.username,
    autojoin:   form.autojoin,
    shortName:  (form.name || form.host).split('.')[0].toLowerCase().slice(0, 8),
    colorClass: 'li', connected: false, expanded: true,
  })
  store.statusWindows.push({
    id: 'status-' + id, serverId: id, isStatus: true,
    title: (form.name || form.host) + ' — Status', channel: 'Status',
    topic: '', visible: false, minimized: false, maximized: false,
    x: 80, y: 80, w: 500, h: 380, z: 1, users: [],
    myNick: form.nick, nickClass: '', messages: [],
  })
  close()
}

function addAndConnect() {
  if (!form.host || !form.nick) return
  addOnly()
  const newSrv = store.servers[store.servers.length - 1]
  if (newSrv) connectServer(newSrv.id)
}

function close() { emit('close') }
</script>

<style scoped>
.host-drop {
  position: absolute; top: 100%; left: 60px; right: 0; z-index: 9999;
  background: #d4d0c8;
  border-top: 1px solid #fff; border-left: 1px solid #fff;
  border-bottom: 1px solid #404040; border-right: 1px solid #404040;
  box-shadow: 2px 2px 6px rgba(0,0,0,0.3);
}
.host-item {
  display: flex; flex-direction: column; padding: 4px 10px;
  cursor: pointer; font-size: 11px; color: #000;
}
.host-item:hover { background: #000080; color: #fff; }
.host-item:hover span { color: #aac !important; }
</style>