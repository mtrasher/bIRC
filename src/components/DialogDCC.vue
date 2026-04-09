<template>
  <div class="dlg-overlay" @mousedown.self="close">
    <div class="dlg dcc-dlg" style="width:560px; height:360px;">
      <div class="dlg-tb">
        <span class="dlg-title">DCC Transfers</span>
        <div class="dlg-close" @click="close">×</div>
      </div>

      <div class="dcc-tabs">
        <div class="dcc-tab" :class="{ active: tab === 'transfers' }" @click="tab = 'transfers'">Transfers</div>
        <div class="dcc-tab" :class="{ active: tab === 'chat' }"      @click="tab = 'chat'">DCC Chat</div>
      </div>

      <div v-if="tab === 'transfers'" class="dcc-body">
        <div class="dcc-toolbar">
          <button class="dlg-btn small" @click="clearDone">Clear finished</button>
          <button class="dlg-btn small" @click="cancelSelected" :disabled="!selected">Cancel</button>
        </div>
        <div class="dcc-table-wrap">
          <table class="dcc-table">
            <thead>
            <tr>
              <th>File</th>
              <th>From/To</th>
              <th>Size</th>
              <th>Progress</th>
              <th>Speed</th>
              <th>Status</th>
            </tr>
            </thead>
            <tbody>
            <tr v-if="transfers.length === 0">
              <td colspan="6" class="dcc-empty">No transfers</td>
            </tr>
            <tr
                v-for="t in transfers"
                :key="t.id"
                class="dcc-row"
                :class="{ sel: selected === t.id }"
                @click="selected = t.id"
            >
              <td class="dcc-cell">
                <span class="dcc-dir">{{ t.direction === 'recv' ? '↓' : '↑' }}</span>
                {{ t.filename }}
              </td>
              <td class="dcc-cell">{{ t.peer }}</td>
              <td class="dcc-cell dcc-num">{{ fmtSize(t.size) }}</td>
              <td class="dcc-cell dcc-prog-cell">
                <div class="dcc-prog-wrap">
                  <div class="dcc-prog-bar" :style="{ width: pct(t) + '%', background: barColor(t) }"></div>
                  <span class="dcc-prog-pct">{{ pct(t) }}%</span>
                </div>
              </td>
              <td class="dcc-cell dcc-num">{{ t.speed ? fmtSize(t.speed) + '/s' : '—' }}</td>
              <td class="dcc-cell">
                <span class="dcc-status" :class="'s-' + t.status">{{ t.status }}</span>
              </td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-if="tab === 'chat'" class="dcc-body">
        <div class="dcc-empty" style="padding:20px;">DCC Chat connections will appear here.</div>
      </div>

      <div class="dlg-footer">
        <button class="dlg-btn" @click="close">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'

const emit = defineEmits(['close'])
const tab      = ref('transfers')
const selected = ref(null)

const transfers = reactive([
  { id: 1, direction: 'recv', filename: 'kernel-patch-6.8.3.diff', peer: 'rx_overflow', size: 48210, bytes: 48210, speed: 0,    status: 'done'   },
  { id: 2, direction: 'recv', filename: 'screenshot.png',           peer: 'h4xx0r',     size: 1240000, bytes: 620000, speed: 98304, status: 'active' },
  { id: 3, direction: 'send', filename: 'birc-0.1.0.AppImage',      peer: 'berliner',   size: 85000000, bytes: 12000000, speed: 524288, status: 'active' },
])

function pct(t) {
  if (!t.size) return 0
  return Math.round((t.bytes / t.size) * 100)
}

function fmtSize(n) {
  if (!n) return '0 B'
  if (n < 1024) return n + ' B'
  if (n < 1048576) return (n / 1024).toFixed(1) + ' KB'
  return (n / 1048576).toFixed(1) + ' MB'
}

function barColor(t) {
  if (t.status === 'done')   return '#287848'
  if (t.status === 'error')  return '#783028'
  if (t.status === 'active') return '#285888'
  return '#283848'
}

function clearDone() {
  const idx = transfers.findIndex(t => t.status === 'done' || t.status === 'error')
  if (idx !== -1) transfers.splice(idx, 1)
}

function cancelSelected() {
  if (!selected.value) return
  const t = transfers.find(t => t.id === selected.value)
  if (t) t.status = 'cancelled'
}

function close() { emit('close') }
</script>