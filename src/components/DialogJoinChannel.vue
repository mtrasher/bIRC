<template>
  <div class="dlg-overlay" @mousedown.self="close">
    <div class="dlg" style="width:340px;">
      <div class="dlg-tb">
        <span class="dlg-title">Join Channel</span>
        <div class="dlg-close" @click="close">×</div>
      </div>
      <div class="dlg-body">
        <div class="dlg-row">
          <label class="dlg-lbl">Channel</label>
          <input class="dlg-inp" v-model="channel" placeholder="#channel" @keydown.enter="join" ref="inputRef" />
        </div>
        <div class="dlg-row">
          <label class="dlg-lbl">Key (optional)</label>
          <input class="dlg-inp" v-model="key" placeholder="" @keydown.enter="join" />
        </div>
        <div class="dlg-row">
          <label class="dlg-lbl">Server</label>
          <select class="dlg-sel" v-model="selectedServer">
            <option v-for="srv in store.servers" :key="srv.id" :value="srv.id">{{ srv.name }}</option>
          </select>
        </div>
      </div>
      <div class="dlg-footer">
        <button class="dlg-btn" @click="close">Cancel</button>
        <button class="dlg-btn primary" @click="join">Join</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useIRCStore } from '../stores/useIRCStore'

const emit = defineEmits(['close'])
const store = useIRCStore()
const channel        = ref('#')
const key            = ref('')
const selectedServer = ref(store.servers[0]?.id || '')
const inputRef       = ref(null)

onMounted(() => { inputRef.value?.focus(); inputRef.value?.setSelectionRange(1, 1) })

function now() {
  const d = new Date(), p = n => String(n).padStart(2,'0')
  return p(d.getDate())+'.'+p(d.getMonth()+1)+'.'+d.getFullYear()+' - '+p(d.getHours())+':'+p(d.getMinutes())+':'+p(d.getSeconds())
}

function join() {
  const ch = channel.value.trim()
  if (!ch) return
  const id = 'win-' + ch.replace(/[^a-z0-9]/gi,'') + '-' + Date.now()
  store.windows.push({
    id, serverId: selectedServer.value,
    title: '[' + (store.getServer(selectedServer.value)?.shortName || '') + '] ' + ch + ' (0)',
    channel: ch, topic: '',
    unread: false, dmUnread: false, isDM: false,
    visible: true, minimized: false, maximized: false,
    x: 80, y: 60, w: 400, h: 320, z: 20,
    messages: [{ type: 'sys', ts: now(), nick: '-!-', nickColor: '#1e3858', text: 'Joining ' + ch + '…' }],
    users: [], myNick: 'coolguy', nickClass: '',
  })
  store.bringToFront(id)
  close()
}
function close() { emit('close') }
</script>