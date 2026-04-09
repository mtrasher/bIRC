<template>
  <div class="mw-topic" v-if="win.topic || canEdit">

    <template v-if="!editing">
      <span class="mw-topic-label">Topic</span>
      <span
          class="mw-topic-text"
          v-html="win.topic ? renderTopic(win.topic) : '<em style=\'opacity:0.4\'>Kein Topic gesetzt</em>'"
          :title="canEdit ? 'Doppelklick zum Bearbeiten' : ''"
          @dblclick="canEdit && startEdit()"
      ></span>
      <button v-if="canEdit" class="topic-edit-btn" @click="startEdit" title="Topic ändern">✏️</button>
    </template>

    <template v-else>
      <span class="mw-topic-label">Topic</span>
      <div class="topic-editor">
        <div class="topic-colors">
          <button class="tc-btn tc-bold"      @mousedown.prevent="insert('\x02')"  title="Bold (Strg+B)"><b>B</b></button>
          <button class="tc-btn tc-italic"    @mousedown.prevent="insert('\x1D')"  title="Italic (Strg+I)"><i>I</i></button>
          <button class="tc-btn tc-underline" @mousedown.prevent="insert('\x1F')"  title="Underline (Strg+U)"><u>U</u></button>
          <button class="tc-btn"             @mousedown.prevent="insert('\x16')"  title="Reverse">◑</button>
          <button class="tc-btn tc-reset"    @mousedown.prevent="insert('\x0F')"  title="Reset">✕</button>
          <span class="tc-sep"></span>
          <button
              v-for="c in MIRC_COLORS" :key="c.code"
              class="tc-color"
              :style="{ background: c.hex, border: c.code === '00' ? '1px solid #aaa' : '1px solid transparent' }"
              :title="c.name"
              @mousedown.prevent="insertColor(c.code)"
          ></button>
        </div>
        <div v-for="grp in SYMBOL_GROUPS" :key="grp.label" class="topic-symrow">
          <span class="tc-grouplabel">{{ grp.label }}</span>
          <button
              v-for="ch in grp.chars" :key="ch"
              class="tc-sym" :title="ch"
              @mousedown.prevent="insert(ch)"
          >{{ ch }}</button>
        </div>
        <div class="topic-input-row">
          <input
              ref="inputEl"
              class="topic-input"
              v-model="editText"
              @keydown.enter="saveTopic"
              @keydown.esc="cancelEdit"
              placeholder="Topic eingeben… (Strg+B = Bold, Strg+K = Farbe)"
              @keydown.ctrl.b.prevent="insert('\x02')"
              @keydown.ctrl.k.prevent="insert('\x03')"
              @keydown.ctrl.u.prevent="insert('\x1F')"
          />
          <button class="topic-save-btn" @click="saveTopic">✓</button>
          <button class="topic-cancel-btn" @click="cancelEdit">✕</button>
        </div>
      </div>
    </template>

  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { useIRCStore } from '../stores/useIRCStore'
import { formatIRC } from '../utils/ircFormat.js'

const props = defineProps({ win: { type: Object, required: true } })
const store    = useIRCStore()
const editing  = ref(false)
const editText = ref('')
const inputEl  = ref(null)

const MIRC_COLORS = [
  { code: '00', hex: '#ffffff', name: 'White'   },
  { code: '01', hex: '#000000', name: 'Black'   },
  { code: '02', hex: '#00007f', name: 'Navy'    },
  { code: '03', hex: '#009300', name: 'Green'   },
  { code: '04', hex: '#ff0000', name: 'Red'     },
  { code: '05', hex: '#7f0000', name: 'Maroon'  },
  { code: '06', hex: '#9c009c', name: 'Purple'  },
  { code: '07', hex: '#fc7f00', name: 'Orange'  },
  { code: '08', hex: '#ffff00', name: 'Yellow'  },
  { code: '09', hex: '#00fc00', name: 'LtGreen' },
  { code: '10', hex: '#009393', name: 'Teal'    },
  { code: '11', hex: '#00ffff', name: 'Cyan'    },
  { code: '12', hex: '#0000fc', name: 'Blue'    },
  { code: '13', hex: '#ff00ff', name: 'Pink'    },
  { code: '14', hex: '#7f7f7f', name: 'Grey'    },
  { code: '15', hex: '#d2d2d2', name: 'LtGrey'  },
]

const SYMBOL_GROUPS = [
  {
    label: 'Blöcke',
    chars: ['█','▓','▒','░','■','□','▪','▫','▬','∎','▮','▯'],
  },
  {
    label: 'Pfeile',
    chars: ['►','◄','▲','▼','▶','◀','»','«','→','←','↑','↓','⇒','⇐','↔','↕'],
  },
  {
    label: 'Sterne & Punkte',
    chars: ['★','☆','✦','✧','✩','✪','•','·','◉','○','●','◎','✿','❀','♦','◆','◇'],
  },
  {
    label: 'Linien',
    chars: ['─','│','═','║','┌','┐','└','┘','├','┤','┬','┴','┼','╔','╗','╚','╝','╠','╣','╦','╩','╬'],
  },
  {
    label: 'Symbole',
    chars: ['♠','♣','♥','♦','♪','♫','☺','☻','☼','⌂','†','‡','§','¶','©','®','™','°','±','×','÷','∞','≈','≠','≤','≥'],
  },
  {
    label: 'Sonderzeichen',
    chars: ['¡','¿','Ä','Ö','Ü','ä','ö','ü','ß','ñ','ç','é','è','ê','à','â','ù','û','î','ï','ô'],
  },
]

const canEdit = computed(() => {
  if (!props.win.users) return false
  const me = props.win.users.find(u =>
      u.nick?.toLowerCase() === props.win.myNick?.toLowerCase()
  )
  if (!me) return false
  return ['owner','admin','op'].includes(me.role)
      || ['~','&','@'].includes(me.prefix)
})

function renderTopic(topic) {
  return formatIRC(topic, store.prefs)
}

async function startEdit() {
  editText.value = props.win.topic || ''
  editing.value = true
  await nextTick()
  inputEl.value?.focus()
}

function cancelEdit() {
  editing.value = false
  editText.value = ''
}

function saveTopic() {
  if (!window.neutron) return cancelEdit()
  window.neutron.topic(props.win.serverId, props.win.channel, editText.value)
  props.win.topic = editText.value
  editing.value = false
}

function insert(code) {
  const el  = inputEl.value
  if (!el) return
  const s   = el.selectionStart
  const e   = el.selectionEnd
  const val = editText.value
  editText.value = val.slice(0, s) + code + val.slice(e)
  nextTick(() => {
    el.selectionStart = el.selectionEnd = s + code.length
    el.focus()
  })
}

function insertColor(code) {
  insert(`\x03${code}`)
}
</script>

<style>
.topic-edit-btn {
  flex-shrink: 0; background: none; border: none; cursor: pointer;
  font-size: 12px; padding: 0 4px; opacity: 0.5; line-height: 1;
}
.topic-edit-btn:hover { opacity: 1; }

.topic-editor { flex: 1; display: flex; flex-direction: column; gap: 2px; padding: 2px 0; }

.topic-colors {
  display: flex; align-items: center; gap: 2px; flex-wrap: wrap;
}
.tc-btn {
  height: 16px; padding: 0 5px; font-size: 10px; cursor: pointer; border-radius: 2px;
  background: #d4d0c8;
  border-top: 1px solid #ffffff; border-left: 1px solid #ffffff;
  border-bottom: 1px solid #404040; border-right: 1px solid #404040;
  line-height: 1;
}
.tc-btn:hover { background: #e0ddd8; }
.tc-bold      { font-weight: bold; }
.tc-italic    { font-style: italic; }
.tc-underline { text-decoration: underline; }
.tc-reset     { font-size: 9px; }
.tc-sep       { width: 1px; height: 14px; background: #808080; margin: 0 2px; }
.tc-color {
  width: 14px; height: 14px; border-radius: 2px; cursor: pointer; flex-shrink: 0;
  border: 1px solid #404040;
}
.tc-color:hover { transform: scale(1.3); border-color: #000; }

.topic-input-row { display: flex; gap: 3px; align-items: center; }
.topic-input {
  flex: 1; font-family: 'Consolas', 'Courier New', monospace; font-size: 11px;
  padding: 1px 4px; outline: none;
  background: #ffffff;
  border-top: 1px solid #808080; border-left: 1px solid #808080;
  border-bottom: 1px solid #ffffff; border-right: 1px solid #ffffff;
}
.topic-save-btn, .topic-cancel-btn {
  height: 18px; padding: 0 6px; font-size: 11px; cursor: pointer;
  background: #d4d0c8;
  border-top: 1px solid #ffffff; border-left: 1px solid #ffffff;
  border-bottom: 1px solid #404040; border-right: 1px solid #404040;
}
.topic-save-btn:hover   { background: #c0e0c0; }
.topic-cancel-btn:hover { background: #e0c0c0; }

.topic-symrow {
  display: flex; align-items: center; flex-wrap: wrap; gap: 1px;
  border-top: 1px solid #d0d0d0; padding-top: 2px;
}
.tc-grouplabel {
  font-size: 9px; color: #808080; width: 52px; flex-shrink: 0;
  text-align: right; padding-right: 4px;
}
.tc-sym {
  min-width: 16px; height: 16px; padding: 0 2px; font-size: 11px;
  cursor: pointer; background: none; border: 1px solid transparent;
  border-radius: 2px; line-height: 1; display: flex; align-items: center; justify-content: center;
}
.tc-sym:hover { background: #000080; color: #fff; border-color: #000060; }

.theme-midnight .tc-btn         { background: var(--bg3); color: var(--text); border-color: var(--border-hi) var(--border-lo) var(--border-lo) var(--border-hi); }
.theme-midnight .topic-input    { background: var(--input-bg); color: var(--text); border-color: var(--border-lo) var(--border-hi) var(--border-hi) var(--border-lo); }
.theme-midnight .topic-save-btn,
.theme-midnight .topic-cancel-btn { background: var(--bg3); color: var(--text); border-color: var(--border-hi) var(--border-lo) var(--border-lo) var(--border-hi); }

.theme-glass .tc-btn         { background: rgba(255,255,255,0.1); color: var(--text); border-color: var(--glass-border); }
.theme-glass .topic-input    { background: rgba(255,255,255,0.08); color: #fff; border-color: var(--glass-border); }
.theme-glass .topic-save-btn,
.theme-glass .topic-cancel-btn { background: rgba(255,255,255,0.1); color: var(--text); border-color: var(--glass-border); }
.theme-glass .topic-save-btn:hover   { background: rgba(100,200,100,0.3); }
.theme-glass .topic-cancel-btn:hover { background: rgba(200,100,100,0.3); }
</style>