<template>
  <div class="tree" id="tree" @contextmenu.prevent="onTreeCtx">
    <template v-for="srv in store.servers" :key="srv.id">

      <div
          class="t-server"
          :class="{ connected: srv.connected, disconnected: !srv.connected }"
          @click="store.toggleServerExpanded(srv.id)"
          @contextmenu.prevent.stop="onServerCtx($event, srv)"
      >
        <span class="srv-fold-icon">{{ srv.expanded ? '▼' : '▶' }}</span>
        <span class="srv-folder">{{ srv.connected ? '📂' : '📁' }}</span>
        <span class="srv-name">{{ srv.name }}</span>
        <div class="srv-dot" :style="{ background: srv.connected ? '#3fb950' : '#484f58' }"></div>
      </div>

      <template v-if="srv.expanded">
        <div
            class="t-status"
            :class="{ sel: store.selectedTreeId === 'status-' + srv.id }"
            @click="selectStatus(srv.id)"
            @contextmenu.prevent.stop="onServerCtx($event, srv)"
        >
          <div class="i v-end"></div>
          <span class="t-lbl status">{{ srv.shortName }} (status)</span>
        </div>

        <template v-for="(win, idx) in regularChannels(srv.id)" :key="win.id">
          <div
              class="t-row"
              :class="{ sel: store.selectedTreeId === win.id }"
              @click="selectWindow(win.id)"
              @contextmenu.prevent.stop="onChannelCtx($event, win)"
          >
            <div
                class="i"
                :class="idx === regularChannels(srv.id).length - 1 && !listResults(srv.id).length ? 'v-end' : 'vh'"
            ></div>
            <span
                class="t-lbl"
                :class="{
                unread: win.unread,
                dm:     win.dmUnread,
                away:   win.minimized,
              }"
            >{{ win.channel }}</span>
            <span v-if="win.unread" class="bdg">{{ win.unreadCount || '!' }}</span>
            <span v-if="win.dmUnread" class="bdg dm">!</span>
          </div>
        </template>

        <template v-if="listResults(srv.id).length">
          <div class="t-list-sep"></div>
          <div
              v-for="win in listResults(srv.id)"
              :key="win.id"
              class="t-row list-result"
              :class="{ sel: store.selectedTreeId === win.id }"
              @click="selectWindow(win.id)"
          >
            <div class="i v-end"></div>
            <span class="t-lbl">📋 Channel List</span>
            <span style="font-size:9px; color:#484f58; margin-right:4px;">[{{ (win.listItems || []).length }}]</span>
          </div>
        </template>

      </template>

      <div class="t-gap"></div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useIRCStore } from '../stores/useIRCStore'

const store = useIRCStore()

function regularChannels(serverId) {
  return store.windows.filter(w => w.serverId === serverId && !w.isListResult)
}

const allListResults = computed(() =>
    store.windows.filter(w => w.isListResult)
)

function listResults(serverId) {
  return allListResults.value.filter(w => w.serverId === serverId)
}

function selectStatus(serverId) {
  store.openStatus(serverId)
}

function selectWindow(winId) {
  const win = store.getWindow(winId)
  if (!win) return
  store.selectedTreeId = winId
  if (win.minimized) store.restoreWindow(winId)
  else { win.visible = true; store.bringToFront(winId) }
}

function onServerCtx(e, srv) {
  store.showCtxMenu(e.clientX, e.clientY, 'server', { serverId: srv.id })
}

function onChannelCtx(e, win) {
  store.showCtxMenu(e.clientX, e.clientY, 'channel', { winId: win.id, serverId: win.serverId })
}

function onTreeCtx(e) {
  e.stopPropagation()
  store.hideCtxMenu()
}
</script>