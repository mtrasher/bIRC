<template>
  <div class="chanlist">
    <!-- Toolbar -->
    <div class="chanlist-bar">
      <span class="chanlist-count">
        {{ sorted.length !== total ? sorted.length + ' / ' : '' }}{{ total }} Channels
      </span>
      <input
          class="chanlist-filter"
          v-model="filter"
          placeholder="Filter…"
          type="text"
      />
      <button class="chanlist-btn" @click="joinSelected" :disabled="!selected">Join</button>
    </div>

    <!-- Header -->
    <div class="chanlist-head">
      <div class="cl-col cl-name"  @click="sortBy('channel')">
        Channel <span class="cl-sort-arrow">{{ sortArrow('channel') }}</span>
      </div>
      <div class="cl-col cl-users" @click="sortBy('users')">
        Users <span class="cl-sort-arrow">{{ sortArrow('users') }}</span>
      </div>
      <div class="cl-col cl-topic">Topic</div>
    </div>

    <!-- Rows -->
    <div class="chanlist-body" ref="bodyEl">
      <div
          v-for="(item, idx) in sorted"
          :key="idx"
          class="chanlist-row"
          :class="{ sel: selected === item.channel }"
          @click="selected = item.channel"
          @dblclick="joinChannel(item.channel)"
      >
        <div class="cl-col cl-name">{{ item.channel }}</div>
        <div class="cl-col cl-users">{{ item.users }}</div>
        <div class="cl-col cl-topic" v-html="renderTopic(item.topic)"></div>
      </div>
      <div v-if="sorted.length === 0" class="chanlist-empty">
        {{ win.listItems?.length ? 'Kein Treffer' : 'Warte auf Serverdaten…' }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { formatIRC } from '../utils/ircFormat.js'
import { useIRCStore } from '../stores/useIRCStore'

const props = defineProps({ win: { type: Object, required: true } })
const store  = useIRCStore()

const filter   = ref('')
const selected = ref(null)
const sortKey  = ref('users')
const sortDir  = ref(-1)

const total = computed(() => (props.win.listItems || []).length) // -1 = desc, 1 = asc

function sortBy(key) {
  if (sortKey.value === key) sortDir.value *= -1
  else { sortKey.value = key; sortDir.value = key === 'users' ? -1 : 1 }
}

function sortArrow(key) {
  if (sortKey.value !== key) return ''
  return sortDir.value === -1 ? '▼' : '▲'
}

const sorted = computed(() => {
  const items = props.win.listItems || []
  const q     = filter.value.toLowerCase()
  const filtered = q
      ? items.filter(i => i.channel.toLowerCase().includes(q) || (i.topic || '').toLowerCase().includes(q))
      : items
  return [...filtered].sort((a, b) => {
    const av = sortKey.value === 'users' ? (a.users || 0) : a.channel
    const bv = sortKey.value === 'users' ? (b.users || 0) : b.channel
    if (av < bv) return  sortDir.value
    if (av > bv) return -sortDir.value
    return 0
  })
})

function renderTopic(topic) {
  if (!topic) return ''
  return formatIRC(topic, store.prefs)
}

function joinChannel(channel) {
  if (!window.neutron) return
  window.neutron.join(props.win.serverId, channel)
}

function joinSelected() {
  if (selected.value) joinChannel(selected.value)
}
</script>

<style>
.chanlist {
  display: flex; flex-direction: column;
  flex: 1; overflow: hidden; background: #ffffff;
  border-top: 1px solid #808080; border-left: 1px solid #808080;
  border-bottom: 1px solid #ffffff; border-right: 1px solid #ffffff;
  font-family: 'Tahoma', 'MS Sans Serif', sans-serif; font-size: 11px;
}
.chanlist-bar {
  display: flex; align-items: center; gap: 6px;
  padding: 3px 5px; background: #d4d0c8;
  border-bottom: 1px solid #808080; flex-shrink: 0;
}
.chanlist-count { color: #444444; font-size: 10px; white-space: nowrap; }
.chanlist-filter {
  flex: 1; background: #ffffff;
  border-top: 1px solid #808080; border-left: 1px solid #808080;
  border-bottom: 1px solid #ffffff; border-right: 1px solid #ffffff;
  padding: 1px 4px; font-size: 11px; outline: none;
  font-family: 'Tahoma', sans-serif;
}
.chanlist-btn {
  height: 20px; padding: 0 12px; font-size: 11px; cursor: pointer;
  background: #d4d0c8;
  border-top: 1px solid #ffffff; border-left: 1px solid #ffffff;
  border-bottom: 1px solid #404040; border-right: 1px solid #404040;
  font-family: 'Tahoma', sans-serif;
}
.chanlist-btn:hover { background: #e0ddd8; }
.chanlist-btn:disabled { color: #808080; cursor: default; }
.chanlist-head {
  display: flex; flex-shrink: 0;
  background: #d4d0c8; border-bottom: 2px solid #808080; user-select: none;
}
.cl-col { padding: 2px 5px; overflow: hidden; }
.chanlist-head .cl-col { font-weight: bold; cursor: pointer; border-right: 1px solid #808080; white-space: nowrap; }
.chanlist-head .cl-col:hover { background: #e0ddd8; }
.cl-sort-arrow { font-size: 9px; color: #000080; }
.cl-name  { width: 130px; flex-shrink: 0; }
.cl-users { width: 50px; flex-shrink: 0; text-align: right; }
.cl-topic { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.chanlist-body { flex: 1; overflow-y: auto; overflow-x: hidden; }
.chanlist-body::-webkit-scrollbar { width: 12px; background: #d4d0c8; }
.chanlist-body::-webkit-scrollbar-track { background: #d4d0c8; }
.chanlist-body::-webkit-scrollbar-thumb { background: #d4d0c8; border-top: 1px solid #ffffff; border-left: 1px solid #ffffff; border-bottom: 1px solid #404040; border-right: 1px solid #404040; }
.chanlist-body::-webkit-scrollbar-button { display: none; }
.chanlist-row { display: flex; border-bottom: 1px solid #f0f0f0; cursor: pointer; }
.chanlist-row:hover { background: #e8f0ff; }
.chanlist-row.sel   { background: #000080; color: #ffffff; }
.chanlist-row.sel .cl-topic { color: #ffffff; }
.chanlist-empty { padding: 20px; text-align: center; color: #808080; }
</style>