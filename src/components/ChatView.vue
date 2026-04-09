<template>
  <div class="mw-chat" ref="chatEl">
    <template v-for="(msg, idx) in messages" :key="idx">
      <div v-if="msg.type === 'sep'" class="ch-sep"></div>
      <div v-else class="ln" :class="msgClass(msg)">
        <span v-if="ts(msg.ts)" class="ts">[{{ ts(msg.ts) }}]&nbsp;</span>
        <span class="nick" :style="nickStyle(msg)">{{ formatNick(msg) }}&nbsp;</span>
        <span class="txt" v-html="renderText(msg)"></span>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { formatIRC } from '../utils/ircFormat.js'
import { useIRCStore } from '../stores/useIRCStore'

const props = defineProps({ messages: { type: Array, default: () => [] } })
const store  = useIRCStore()
const chatEl = ref(null)

const RANK_COLORS = {
  owner:  () => store.prefs.rankColors.owner  || '#f97583',
  admin:  () => store.prefs.rankColors.admin  || '#e36209',
  op:     () => store.prefs.rankColors.op     || '#f85149',
  halfop: () => store.prefs.rankColors.halfop || '#d29922',
  voice:  () => store.prefs.rankColors.voice  || '#3fb950',
  me:     () => store.prefs.rankColors.me     || '#388bfd',
}

function ts(raw) {
  if (!raw || !store.prefs.showTimestamp || store.prefs.tsFormat === 'none') return ''
  if (store.prefs.tsFormat === 'short') {
    // extract HH:MM from "DD.MM.YYYY - HH:MM:SS"
    const m = raw.match(/(\d{2}:\d{2}):\d{2}$/)
    return m ? m[1] : raw
  }
  if (store.prefs.tsFormat === 'time') {
    const m = raw.match(/(\d{2}:\d{2}:\d{2})$/)
    return m ? m[1] : raw
  }
  // full — reformat date part according to dateFormat pref
  return raw
}

function nickStyle(msg) {
  if (msg.type === 'sys' || msg.type === 'join' || msg.type === 'part' || !msg.role) return {}
  if (!store.prefs.coloredNicks) return {}
  const colorFn = RANK_COLORS[msg.role]
  if (colorFn) return { color: colorFn() }
  return {}
}

function formatNick(msg) {
  if (!msg.nick) return ''
  if (msg.type === 'sys' || msg.type === 'join' || msg.type === 'part') return msg.nick
  if (msg.type === 'action') return `* ${msg.nick}`
  return `<${msg.nick}>`
}

function msgClass(msg) {
  return {
    sys:     msg.type === 'sys',
    join:    msg.type === 'join',
    part:    msg.type === 'part',
    mention: msg.type === 'mention',
    action:  msg.type === 'action',
    notice:  msg.type === 'notice',
  }
}

function renderText(msg) {
  if (msg.type === 'action') return '<em>' + formatIRC(msg.text, store.prefs) + '</em>'
  return formatIRC(msg.text, store.prefs)
}

watch(() => props.messages.length, async () => {
  await nextTick()
  if (chatEl.value) chatEl.value.scrollTop = chatEl.value.scrollHeight
}, { immediate: true })
</script>