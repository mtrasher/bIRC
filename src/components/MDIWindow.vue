<template>
  <div
      v-if="win"
      class="mw"
      :class="[win.serverId, { 'is-focused': store.focusedId === win.id }]"
      :style="windowStyle"
      @mousedown.capture="onWindowMousedown"
  >
    <div class="mw-tb" @mousedown="onTitlebarMousedown" @dblclick="onTitlebarDblclick">
      <div
          v-if="!win.isDM && !win.isStatus && !win.isListResult"
          class="mw-btn"
          :title="isAutojoined ? 'Aus Autojoin entfernen' : 'Zu Autojoin hinzufügen'"
          @click.stop="toggleAutojoin"
      >{{ isAutojoined ? '✓' : '+' }}</div>
      <div class="mw-title">{{ win.title }}</div>
      <div class="mw-btns">
        <div class="mw-btn" @click.stop="store.minimizeWindow(win.id)">_</div>
        <div class="mw-btn" @click.stop="store.toggleMaximize(win.id)">{{ win.maximized ? '❐' : '□' }}</div>
        <div class="mw-btn cl" @click.stop="closeWin">×</div>
      </div>
    </div>

    <TopicBar v-if="!win.isListResult && !win.isStatus" :win="win" />

    <div class="uwrap">
      <ChannelListView v-if="win.isListResult" :win="win" />
      <template v-else>
        <ChatView :messages="win.messages" />
        <UserList v-if="!win.isDM && !win.isStatus" :users="win.users" :win="win" />
      </template>
    </div>

    <InputBar v-if="!win.isListResult" :win="win" />

    <div v-if="!win.maximized" class="rh" @mousedown.stop="onResizeMousedown"></div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import ChatView        from './ChatView.vue'
import ChannelListView from './ChannelListView.vue'
import UserList        from './UserList.vue'
import InputBar        from './InputBar.vue'
import TopicBar        from './TopicBar.vue'
import { useIRCStore } from '../stores/useIRCStore'
import { formatIRC }   from '../utils/ircFormat.js'

const props = defineProps({
  win:   { type: Object, required: false, default: null },
  mdiEl: { type: Object, default: null },
})

const store = useIRCStore()

function renderTopic(topic) { return formatIRC(topic, store.prefs) }

const windowStyle = computed(() => {
  const w = props.win
  const style = { zIndex: w.z || 1 }
  if (w.maximized) {
    const stubH = store.stubs.length > 0 ? 20 : 0
    style.left = '0'; style.top = '0'; style.right = '0'; style.bottom = stubH + 'px'
  } else {
    style.left = w.x + 'px'; style.top = w.y + 'px'
    if (w.useRight)  { style.right  = '0' } else { style.width  = (w.w || 400) + 'px' }
    if (w.useBottom) { style.bottom = '19px' } else if (w.h) { style.height = w.h + 'px' }
  }
  return style
})

const isAutojoined = computed(() => {
  const srv = store.getServer(props.win.serverId)
  if (!srv) return false
  return srv.autojoin?.split(',').map(c => c.trim()).includes(props.win.channel)
})

function toggleAutojoin() {
  const srv = store.getServer(props.win.serverId)
  if (!srv) return
  const current = srv.autojoin ? srv.autojoin.split(',').map(c => c.trim()).filter(Boolean) : []
  if (current.includes(props.win.channel)) {
    srv.autojoin = current.filter(c => c !== props.win.channel).join(',')
  } else {
    srv.autojoin = [...current, props.win.channel].join(',')
  }
}

function onWindowMousedown(e) {
  if (!e.target.classList.contains('mw-btn') && !e.target.classList.contains('rh')) {
    store.bringToFront(props.win.id)
  }
}

let dragging = false
let dragStartMX, dragStartMY, dragStartWX, dragStartWY

function onTitlebarMousedown(e) {
  if (e.target.classList.contains('mw-btn')) return
  if (props.win.maximized) return
  store.bringToFront(props.win.id)
  dragging    = true
  dragStartMX = e.clientX
  dragStartMY = e.clientY
  dragStartWX = props.win.x
  dragStartWY = props.win.y
  props.win.useRight  = false
  props.win.useBottom = false
  if (!props.win.w) props.win.w = props.mdiEl ? props.mdiEl.offsetWidth  - props.win.x : 400
  if (!props.win.h) props.win.h = props.mdiEl ? props.mdiEl.offsetHeight - props.win.y : 300
  e.preventDefault()
}

function onTitlebarDblclick(e) {
  if (e.target.classList.contains('mw-btn')) return
  store.toggleMaximize(props.win.id)
}

let resizing = false
let resizeStartMX, resizeStartMY, resizeStartW, resizeStartH

function onResizeMousedown(e) {
  store.bringToFront(props.win.id)
  resizing      = true
  resizeStartMX = e.clientX
  resizeStartMY = e.clientY
  resizeStartW  = props.win.w || (props.mdiEl ? props.mdiEl.offsetWidth  - props.win.x : 400)
  resizeStartH  = props.win.h || (props.mdiEl ? props.mdiEl.offsetHeight - props.win.y : 300)
  props.win.useRight  = false
  props.win.useBottom = false
  e.preventDefault()
}

function onMousemove(e) {
  const mdi = props.mdiEl
  if (!mdi) return
  if (dragging) {
    const dx   = e.clientX - dragStartMX
    const dy   = e.clientY - dragStartMY
    const winW = props.win.w || 400
    const winH = props.win.h || 300
    const mdiW = mdi.offsetWidth
    const mdiH = mdi.offsetHeight
    const minX = -(winW * 0.4)
    const maxX = mdiW - winW * 0.6
    const minY = 0
    const maxY = mdiH - 20
    const nx   = Math.max(minX, Math.min(maxX, dragStartWX + dx))
    const ny   = Math.max(minY, Math.min(maxY, dragStartWY + dy))
    store.moveWindow(props.win.id, nx, ny)
  }
  if (resizing) {
    const nw = Math.max(200, resizeStartW + (e.clientX - resizeStartMX))
    const nh = Math.max(100, resizeStartH + (e.clientY - resizeStartMY))
    store.resizeWindow(props.win.id, nw, nh)
  }
}

function onMouseup() { dragging = false; resizing = false }

onMounted(() => {
  document.addEventListener('mousemove', onMousemove)
  document.addEventListener('mouseup',   onMouseup)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onMousemove)
  document.removeEventListener('mouseup',   onMouseup)
})

function closeWin() {
  const w = props.win
  if (!w.isListResult && !w.isStatus && !w.isDM && w.channel) {
    window.neutron?.part(w.serverId, w.channel, 'bIRC')
  }
  store.closeWindow(w.id)
}
</script>