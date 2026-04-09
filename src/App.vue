<template>
  <div class="app" @click="store.hideCtxMenu()">
    <MenuBar @join="dialogs.join = true" @addServer="dialogs.server = true" @prefs="dialogs.prefs = true" @dcc="dialogs.dcc = true" @tile="doTile" @cascade="doCascade" />
    <ToolBar
        @join="dialogs.join = true"
        @addServer="dialogs.server = true"
        @prefs="dialogs.prefs = true"
        @dcc="dialogs.dcc = true"
        @tile="doTile"
        @cascade="doCascade"
    />
    <ChannelBtnRow />
    <div class="body">
      <ServerTree />
      <MDIContainer ref="mdiContainer" />
    </div>
    <StatusBar />
    <ContextMenu @editServer="srv => dialogs.editServer = srv" />

    <DialogJoinChannel  v-if="dialogs.join"       @close="dialogs.join       = false" />
    <DialogAddServer    v-if="dialogs.server"      @close="dialogs.server     = false" />
    <DialogAddServer    v-if="dialogs.editServer"  @close="dialogs.editServer = null"  :editServer="dialogs.editServer" />
    <DialogPreferences  v-if="dialogs.prefs"       @close="dialogs.prefs      = false" @openLogs="dialogs.prefs = false; dialogs.logs = true" />
    <DialogDCC          v-if="dialogs.dcc"         @close="dialogs.dcc        = false" />
    <DialogLogs         v-if="dialogs.logs"        @close="dialogs.logs       = false" />
  </div>
</template>

<script setup>
import { reactive, ref, watch, onMounted, onUnmounted } from 'vue'
import MenuBar           from './components/MenuBar.vue'
import ToolBar           from './components/ToolBar.vue'
import ChannelBtnRow     from './components/ChannelBtnRow.vue'
import ServerTree        from './components/ServerTree.vue'
import MDIContainer      from './components/MDIContainer.vue'
import StatusBar         from './components/StatusBar.vue'
import ContextMenu       from './components/ContextMenu.vue'
import DialogJoinChannel from './components/DialogJoinChannel.vue'
import DialogAddServer   from './components/DialogAddServer.vue'
import DialogPreferences from './components/DialogPreferences.vue'
import DialogDCC         from './components/DialogDCC.vue'
import DialogLogs        from './components/DialogLogs.vue'
import { useIRCStore }   from './stores/useIRCStore'
import { initIRC }       from './composables/useIRC.js'

const store        = useIRCStore()
const dialogs      = reactive({ join: false, server: false, prefs: false, dcc: false, logs: false, editServer: null })
const mdiContainer = ref(null)

let cleanupIRC = null

onMounted(async () => {
  cleanupIRC = initIRC()

  if (window.neutron) {
    const savedServers = await window.neutron.loadServers()
    if (savedServers?.length) {
      savedServers.forEach(srv => {
        srv.connected = false
        store.servers.push(srv)
        if (!store.statusWindows.find(w => w.serverId === srv.id)) {
          store.statusWindows.push({
            id: 'status-' + srv.id, serverId: srv.id, isStatus: true,
            title: srv.name + ' — Status', channel: 'Status',
            topic: '', visible: false, minimized: false, maximized: false,
            x: 60, y: 60, w: 520, h: 380, z: 1, users: [],
            myNick: srv.nick || '', nickClass: '', messages: [],
          })
        }
      })
    }

    const savedPrefs = await window.neutron.loadPrefs()
    if (savedPrefs && typeof savedPrefs === 'object') {
      Object.assign(store.prefs, savedPrefs)
    }
  }
})

onUnmounted(() => { if (cleanupIRC) cleanupIRC() })

watch(
    () => store.servers.map(s => ({ ...s })),
    async (servers) => {
      if (window.neutron) await window.neutron.saveServers(servers)
    },
    { deep: true }
)

function doTile() {
  const el = mdiContainer.value?.mdiEl
  if (el) store.tileWindows(el.offsetWidth, el.offsetHeight)
}

function doCascade() {
  store.cascadeWindows()
}
</script>