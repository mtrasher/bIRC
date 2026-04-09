<template>
  <Teleport to="body">
    <div
        v-if="store.ctxMenu.visible"
        class="ctx-menu"
        ref="menuEl"
        :style="menuStyle"
        @click.stop
    >
      <template v-if="store.ctxMenu.type === 'user'">
        <div class="ctx-item" :class="{ disabled: isMe }" @click="act('query')">
          <span class="ctx-icon">@</span> {{ t('ctx.query') }}
        </div>
        <div class="ctx-item" @click="act('whois')">
          <span class="ctx-icon">?</span> {{ t('ctx.whois') }}
        </div>
        <div class="ctx-sep"></div>
        <div class="ctx-item" :class="{ disabled: isMe }" @click="act('mention')">
          <span class="ctx-icon">↩</span> {{ t('ctx.mention') }}
        </div>
        <div class="ctx-item" @click="act('dcc')">
          <span class="ctx-icon">↑</span> {{ t('ctx.dcc') }}
        </div>
        <template v-if="!isMe">
          <div class="ctx-sep"></div>
          <div class="ctx-item" @click="act('op')">+o  {{ t('ctx.op') }}</div>
          <div class="ctx-item" @click="act('deop')">-o  {{ t('ctx.deop') }}</div>
          <div class="ctx-item" @click="act('voice')">+v  {{ t('ctx.voice') }}</div>
          <div class="ctx-sep"></div>
          <div class="ctx-item danger" @click="act('kick')">
            <span class="ctx-icon">✕</span> {{ t('ctx.kick') }}
          </div>
          <div class="ctx-item danger" @click="act('ban')">
            <span class="ctx-icon">✕</span> {{ t('ctx.ban') }}
          </div>
        </template>
      </template>

      <template v-else-if="store.ctxMenu.type === 'channel'">
        <div class="ctx-item" @click="act('focus')">
          <span class="ctx-icon">↗</span> {{ t('ctx.focus') }}
        </div>
        <div class="ctx-item" @click="act('restore')" v-if="isMinimized">
          <span class="ctx-icon">□</span> {{ t('ctx.restore') }}
        </div>
        <div class="ctx-sep"></div>
        <div class="ctx-item danger" @click="act('leave')">
          <span class="ctx-icon">←</span> {{ t('ctx.leave') }}
        </div>
      </template>

      <template v-else-if="store.ctxMenu.type === 'server'">
        <div class="ctx-item" @click="act('connect')" v-if="!isConnected">
          <span class="ctx-icon">●</span> {{ t('ctx.connect') }}
        </div>
        <div class="ctx-item" @click="act('disconnect')" v-if="isConnected">
          <span class="ctx-icon">○</span> {{ t('ctx.disconnect') }}
        </div>
        <div class="ctx-sep"></div>
        <div class="ctx-item" @click="act('join')">
          <span class="ctx-icon">+</span> {{ t('ctx.joinChannel') }}
        </div>
        <div class="ctx-item" @click="act('edit')">
          <span class="ctx-icon">✎</span> {{ t('ctx.editServer') }}
        </div>
        <div class="ctx-sep"></div>
        <div class="ctx-item danger" @click="act('delete')">
          <span class="ctx-icon">✕</span> {{ t('ctx.deleteServer') }}
        </div>
      </template>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useIRCStore } from '../stores/useIRCStore'
import { connectServer, disconnectServer } from '../composables/ircConnect.js'

const { t }  = useI18n()
const emit   = defineEmits(['editServer'])
const store  = useIRCStore()
const menuEl = ref(null)
const menuStyle = ref({ left: '0px', top: '0px' })

const isMe        = computed(() => store.ctxMenu.role === 'me')
const isConnected = computed(() => {
  const srv = store.getServer(store.ctxMenu.serverId)
  return srv?.connected || false
})
const isMinimized = computed(() => {
  const win = store.getWindow(store.ctxMenu.winId)
  return win?.minimized || false
})

watch(() => store.ctxMenu.visible, async (visible) => {
  if (!visible) return
  await nextTick()
  if (!menuEl.value) return
  const x   = store.ctxMenu.x
  const y   = store.ctxMenu.y
  const w   = menuEl.value.offsetWidth
  const h   = menuEl.value.offsetHeight
  const vpW = window.innerWidth
  const vpH = window.innerHeight
  const finalX = x + w > vpW ? x - w : x
  const finalY = y + h > vpH ? y - h : y
  menuStyle.value = { left: finalX + 'px', top: finalY + 'px' }
})

function act(type) {
  const { nick, winId, serverId } = store.ctxMenu

  if (type === 'query')   console.log('/query', nick)
  if (type === 'whois')   console.log('/whois', nick)
  if (type === 'mention') console.log('mention', nick)
  if (type === 'dcc')     console.log('/dcc send', nick)
  if (type === 'op')      console.log('/mode +o', nick)
  if (type === 'deop')    console.log('/mode -o', nick)
  if (type === 'voice')   console.log('/mode +v', nick)
  if (type === 'kick')    console.log('/kick', nick)
  if (type === 'ban')     console.log('/kickban', nick)

  if (type === 'focus') {
    const win = store.getWindow(winId)
    if (win) { win.visible = true; store.bringToFront(winId) }
  }
  if (type === 'restore') store.restoreWindow(winId)
  if (type === 'leave') {
    console.log('/part', winId)
    store.closeWindow(winId)
  }

  if (type === 'connect')    connectServer(serverId)
  if (type === 'disconnect') disconnectServer(serverId)
  if (type === 'join')       console.log('join dialog for', serverId)

  if (type === 'edit') {
    const srv = store.getServer(serverId)
    emit('editServer', srv)
  }

  if (type === 'delete') {
    const idx = store.servers.findIndex(s => s.id === serverId)
    if (idx !== -1) store.servers.splice(idx, 1)
  }

  store.hideCtxMenu()
}

document.addEventListener('click', () => store.hideCtxMenu())
document.addEventListener('contextmenu', (e) => {
  if (!e.target.dataset.ctx) store.hideCtxMenu()
})
</script>