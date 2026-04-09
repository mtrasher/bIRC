<template>
  <div class="dlg-overlay" @mousedown.self="emit('close')">
    <div class="dlg" style="width:560px; height:460px; display:flex; flex-direction:column;">
      <div class="dlg-tb">
        <span class="dlg-title">Chat Logs</span>
        <div class="dlg-close" @click="emit('close')">✕</div>
      </div>

      <div class="log-toolbar">
        <span class="log-dir-label">{{ store.prefs.logDir }}</span>
        <button class="dlg-btn small" @click="openDir">📂 Öffnen</button>
        <button class="dlg-btn small" @click="loadFiles">↻ Aktualisieren</button>
      </div>

      <div class="log-body">
        <div class="log-list">
          <div
              v-for="f in files"
              :key="f.name"
              class="log-row"
              :class="{ sel: selected === f.name }"
              @click="selectFile(f)"
          >
            <span class="log-name">{{ f.name }}</span>
            <span class="log-size">{{ formatSize(f.size) }}</span>
          </div>
          <div v-if="files.length === 0" class="log-empty">
            {{ loading ? 'Lädt…' : 'Keine Logs vorhanden' }}
          </div>
        </div>

        <div class="log-preview">
          <div class="log-preview-header">
            {{ selected || 'Datei auswählen' }}
          </div>
          <div class="log-preview-body">
            <pre v-if="preview">{{ preview }}</pre>
            <div v-else class="log-empty">Datei auswählen um Vorschau zu sehen</div>
          </div>
        </div>
      </div>

      <div class="dlg-footer">
        <button class="dlg-btn small" @click="exportFile" :disabled="!selected">💾 Exportieren</button>
        <button class="dlg-btn small" @click="deleteFile" :disabled="!selected" style="color:#cc0000">🗑 Löschen</button>
        <button class="dlg-btn" @click="emit('close')">Schließen</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useIRCStore } from '../stores/useIRCStore'

const emit  = defineEmits(['close'])
const store = useIRCStore()

const files    = ref([])
const selected = ref(null)
const preview  = ref('')
const loading  = ref(false)

onMounted(() => loadFiles())

async function loadFiles() {
  if (!window.neutron) return
  loading.value = true
  const res = await window.neutron.logList(store.prefs.logDir)
  files.value   = res.files || []
  loading.value = false
}

async function selectFile(f) {
  selected.value = f.name
  preview.value  = ''
  const res = await window.neutron.logRead(store.prefs.logDir, f.name)
  if (res.ok) {
    const lines = res.content.split('\n')
    preview.value = lines.slice(-200).join('\n')
  }
}

async function exportFile() {
  if (!selected.value) return
  const res = await window.neutron.logExport(store.prefs.logDir, selected.value)
  if (res.ok) alert(`Exportiert nach: ${res.dest}`)
}

async function deleteFile() {
  if (!selected.value) return
  if (!confirm(`Log "${selected.value}" wirklich löschen?`)) return
  await window.neutron.logDelete(store.prefs.logDir, selected.value)
  selected.value = null
  preview.value  = ''
  await loadFiles()
}

function openDir() {
  window.neutron?.logOpenDir(store.prefs.logDir)
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB'
  return (bytes/1024/1024).toFixed(1) + ' MB'
}
</script>

<style scoped>
.log-toolbar {
  display: flex; align-items: center; gap: 6px; padding: 4px 8px;
  background: #d4d0c8; border-bottom: 1px solid #808080; flex-shrink: 0;
}
.log-dir-label {
  flex: 1; font-size: 10px; color: #444; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.log-body {
  display: flex; flex: 1; overflow: hidden; min-height: 0;
}
.log-list {
  width: 200px; flex-shrink: 0; overflow-y: auto;
  border-right: 1px solid #808080; background: #fff;
}
.log-row {
  padding: 3px 6px; cursor: pointer; font-size: 11px;
  border-bottom: 1px solid #f0f0f0;
  display: flex; justify-content: space-between; gap: 4px;
}
.log-row:hover { background: #e8f0ff; }
.log-row.sel   { background: #000080; color: #fff; }
.log-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.log-size { font-size: 9px; color: #808080; flex-shrink: 0; }
.log-row.sel .log-size { color: #ccc; }
.log-empty { padding: 16px; text-align: center; color: #808080; font-size: 11px; }

.log-preview { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.log-preview-header {
  padding: 3px 6px; background: #d4d0c8; border-bottom: 1px solid #808080;
  font-size: 10px; color: #444; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.log-preview-body {
  flex: 1; overflow-y: auto; background: #fff; padding: 4px 6px;
}
.log-preview-body pre {
  font-family: 'Consolas', monospace; font-size: 10px; white-space: pre-wrap;
  word-break: break-all; margin: 0; color: #000;
}
</style>