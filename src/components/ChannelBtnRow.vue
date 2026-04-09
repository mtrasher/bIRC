<template>
  <div class="btn-row">
    <template v-for="srv in store.servers" :key="srv.id">
      <span class="srv-prefix" :class="srv.colorClass">{{ srv.shortName }}:</span>

      <template v-for="win in windowsForServer(srv.id)" :key="win.id">
        <div
            class="ch-btn"
            :class="{
            active:    store.focusedId === win.id,
            unread:    win.unread   && store.focusedId !== win.id,
            'dm-unread': win.dmUnread && store.focusedId !== win.id,
          }"
            @click="activateWindow(win.id)"
        >
          {{ win.channel }}
        </div>
      </template>

      <div v-if="srv.id !== store.servers[store.servers.length - 1].id" class="btn-divider"></div>
    </template>
  </div>
</template>

<script setup>
import { useIRCStore } from '../stores/useIRCStore'
const store = useIRCStore()

function windowsForServer(serverId) {
  return store.windows.filter(w => w.serverId === serverId)
}

function activateWindow(winId) {
  const win = store.getWindow(winId)
  if (!win) return
  if (win.minimized) {
    store.restoreWindow(winId)
  } else {
    win.visible = true
    store.bringToFront(winId)
  }
}
</script>