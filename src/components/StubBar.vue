<template>
  <div class="stubs">
    <div
        v-for="stub in store.stubs"
        :key="stub.winId"
        class="stub"
        @dblclick="store.restoreWindow(stub.winId)"
    >
      <span class="stub-srv" :style="{ color: srvColor(stub.serverId) }">
        {{ srvShort(stub.serverId) }}:
      </span>
      <span class="stub-title" :class="{ unread: stub.unread }">{{ stub.title }}</span>
      <div class="stub-btns">
        <div class="stub-btn" @click.stop="store.restoreWindow(stub.winId)" title="Wiederherstellen">□</div>
        <div class="stub-btn" @click.stop="removeStub(stub.winId)"         title="Schließen">×</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useIRCStore } from '../stores/useIRCStore'
const store = useIRCStore()

const srvColors = { li: '#285838', ef: '#283858', ri: '#583828' }
const srvShorts = { li: 'li', ef: 'ef', ri: 'ri' }

function srvColor(id) { return srvColors[id] || '#404050' }
function srvShort(id) { return srvShorts[id] || id }

function removeStub(winId) {
  store.stubs = store.stubs.filter(s => s.winId !== winId)
}
</script>

<style scoped>
.stub-title.unread { color: #4878d0; }
</style>