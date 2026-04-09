<template>
  <div class="statusbar">
    <div
        v-for="srv in store.servers"
        :key="srv.id"
        class="sb"
    >
      <div class="sb-dot" :style="{ background: srv.connected ? '#28c840' : '#febc2e' }"></div>
      {{ srv.shortName }}
    </div>
    <div class="sb">{{ activeTitle }}</div>
    <div class="sb" style="margin-left:auto">{{ currentTime }}</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useIRCStore } from '../stores/useIRCStore'

const { t } = useI18n()
const store = useIRCStore()

const activeTitle = computed(() => {
  const win = store.focusedWindow
  if (!win) return '—'
  return win.channel + (win.channel ? ' — ' + t('statusbar.focused') : '')
})

const currentTime = ref('')

function updateTime() {
  const now = new Date()
  const p   = n => String(n).padStart(2, '0')
  const date = p(now.getDate()) + '.' + p(now.getMonth() + 1) + '.' + now.getFullYear()
  const time = p(now.getHours()) + ':' + p(now.getMinutes()) + ':' + p(now.getSeconds())
  currentTime.value = date + ' ' + time
}

let timer
onMounted(() => { updateTime(); timer = setInterval(updateTime, 1000) })
onUnmounted(() => clearInterval(timer))
</script>