<template>
  <div class="dlg-overlay" @mousedown.self="close">
    <div class="dlg prefs-dlg" style="width:500px; height:420px;">
      <div class="dlg-tb">
        <span class="dlg-title">Preferences</span>
        <div class="dlg-close" @click="close">×</div>
      </div>
      <div class="prefs-layout">
        <div class="prefs-nav">
          <div v-for="p in pages" :key="p.id" class="prefs-nav-item" :class="{ active: activePage === p.id }" @click="activePage = p.id">{{ p.label }}</div>
        </div>
        <div class="prefs-content">

          <template v-if="activePage === 'identity'">
            <div class="prefs-group">Identity</div>
            <div class="dlg-row"><label class="dlg-lbl">Nickname</label><input class="dlg-inp" v-model="prefs.nick" /></div>
            <div class="dlg-row"><label class="dlg-lbl">Alt. Nickname</label><input class="dlg-inp" v-model="prefs.nickAlt" /></div>
            <div class="dlg-row"><label class="dlg-lbl">Real Name</label><input class="dlg-inp" v-model="prefs.realname" /></div>
            <div class="dlg-row"><label class="dlg-lbl">Username</label><input class="dlg-inp" v-model="prefs.username" /></div>
          </template>

          <template v-if="activePage === 'appearance'">
            <div class="prefs-group">Language</div>
            <div class="dlg-row">
              <label class="dlg-lbl">Language</label>
              <select class="dlg-sel" v-model="selectedLocale" @change="onLocaleChange">
                <option v-for="loc in availableLocales" :key="loc.code" :value="loc.code">
                  {{ loc.flag }} {{ loc.name }}
                </option>
              </select>
            </div>
            <div class="prefs-group">Chat Display</div>
            <div class="dlg-row"><label class="dlg-lbl">Font</label><input class="dlg-inp" v-model="prefs.font" /></div>
            <div class="dlg-row"><label class="dlg-lbl">Font size</label><input class="dlg-inp" v-model.number="prefs.fontSize" type="number" min="8" max="20" /></div>
            <div class="dlg-row-check"><label class="dlg-check"><input type="checkbox" v-model="prefs.showTimestamp" /><span>Show timestamps</span></label></div>
            <div class="dlg-row-check"><label class="dlg-check"><input type="checkbox" v-model="prefs.showTopic" /><span>Always show topic bar</span></label></div>
            <div class="dlg-row-check"><label class="dlg-check"><input type="checkbox" v-model="prefs.coloredNicks" /><span>Colored nicknames</span></label></div>
            <div class="dlg-row-check"><label class="dlg-check"><input type="checkbox" v-model="prefs.showJoinPart" /><span>Join/Part/Quit messages anzeigen</span></label></div>
            <div class="prefs-group">Timestamp Format</div>
            <div class="dlg-row">
              <label class="dlg-lbl">Format</label>
              <select class="dlg-sel" v-model="prefs.tsFormat">
                <option value="full">[DD.MM.YYYY - HH:MM:SS]</option>
                <option value="time">[HH:MM:SS]</option>
                <option value="short">[HH:MM]</option>
                <option value="none">Disabled</option>
              </select>
            </div>
          </template>

          <template v-if="activePage === 'notify'">
            <div class="prefs-group">Notifications</div>
            <div class="dlg-row-check"><label class="dlg-check"><input type="checkbox" v-model="prefs.notifyMention" /><span>Notify on mention</span></label></div>
            <div class="dlg-row-check"><label class="dlg-check"><input type="checkbox" v-model="prefs.notifyDM" /><span>Notify on direct message</span></label></div>
            <div class="dlg-row-check"><label class="dlg-check"><input type="checkbox" v-model="prefs.notifyJoin" /><span>Notify on join/part</span></label></div>
            <div class="dlg-row-check"><label class="dlg-check"><input type="checkbox" v-model="prefs.notifySound" /><span>Play sound</span></label></div>
            <div class="prefs-group">Highlight Words</div>
            <div class="dlg-row"><label class="dlg-lbl">Words</label><input class="dlg-inp" v-model="prefs.highlights" placeholder="word1, word2" /></div>
          </template>

          <template v-if="activePage === 'logging'">
            <div class="prefs-group">Logging</div>
            <div class="dlg-row-check"><label class="dlg-check"><input type="checkbox" v-model="prefs.logEnabled" /><span>Logging aktivieren</span></label></div>
            <div class="dlg-row"><label class="dlg-lbl">Log-Verzeichnis</label><input class="dlg-inp" v-model="prefs.logDir" /></div>
            <div class="dlg-row-check"><label class="dlg-check"><input type="checkbox" v-model="prefs.logTimestamp" /><span>Timestamps in Logs</span></label></div>
            <div class="dlg-row-check"><label class="dlg-check"><input type="checkbox" v-model="prefs.logSystem" /><span>Systemnachrichten loggen</span></label></div>
            <div class="dlg-row" style="margin-top:8px">
              <button class="dlg-btn" @click="emit('openLogs')">📋 Logs verwalten…</button>
            </div>
          </template>

          <template v-if="activePage === 'dcc'">
            <div class="prefs-group">DCC</div>
            <div class="dlg-row"><label class="dlg-lbl">Download dir</label><input class="dlg-inp" v-model="prefs.dccDir" /></div>
            <div class="dlg-row-check"><label class="dlg-check"><input type="checkbox" v-model="prefs.dccAutoAccept" /><span>Auto-accept from known users</span></label></div>
            <div class="prefs-group">Port Range</div>
            <div class="dlg-row">
              <label class="dlg-lbl">Min</label>
              <input class="dlg-inp" v-model.number="prefs.dccPortMin" type="number" />
              <label class="dlg-lbl narrow" style="text-align:center;">Max</label>
              <input class="dlg-inp" v-model.number="prefs.dccPortMax" type="number" />
            </div>
          </template>

        </div>
      </div>
      <div class="dlg-footer">
        <button class="dlg-btn" @click="close">Cancel</button>
        <button class="dlg-btn" @click="apply">Apply</button>
        <button class="dlg-btn primary" @click="save">OK</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useIRCStore } from '../stores/useIRCStore'
import { availableLocales, setLocale, i18n } from '../i18n.js'

const emit  = defineEmits(['close', 'openLogs'])
const store = useIRCStore()

const pages = [
  { id: 'identity',   label: 'Identity'   },
  { id: 'appearance', label: 'Appearance'  },
  { id: 'notify',     label: 'Notify'      },
  { id: 'logging',    label: 'Logging'     },
  { id: 'dcc',        label: 'DCC'         },
]
const activePage     = ref('identity')
const selectedLocale = ref(i18n.global.locale.value)
const prefs          = store.prefs

function onLocaleChange() { setLocale(selectedLocale.value) }
function apply() {
  if (window.neutron) window.neutron.savePrefs(JSON.parse(JSON.stringify(store.prefs)))
}
function save()  { apply(); emit('close') }
function close() { emit('close') }
</script>