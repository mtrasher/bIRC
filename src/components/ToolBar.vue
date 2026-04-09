<template>
  <div class="toolbar">
    <div class="tb" :class="anyConnected ? 'online' : 'offline'" @click="toggleConnection" :title="anyConnected ? t('toolbar.disconnect') : t('toolbar.connect')">
      <svg v-if="anyConnected" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <polygon points="9,2 4,9 8,9 7,14 12,7 8,7" fill="#cc2222" stroke="#991111" stroke-width="0.5" opacity="0.5"/>
        <line x1="2" y1="2" x2="14" y2="14" stroke="#cc0000" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <svg v-else width="16" height="16" viewBox="0 0 16 16" fill="none">
        <polygon points="9,2 4,9 8,9 7,14 12,7 8,7" fill="#28a745" stroke="#1a7a30" stroke-width="0.5"/>
      </svg>
      {{ anyConnected ? t('toolbar.disconnect') : t('toolbar.connect') }}
    </div>
    <div class="tb-sep"></div>
    <div class="tb" :title="t('toolbar.addServer')" @click="emit('addServer')">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="3" width="14" height="10" rx="1" stroke="currentColor" stroke-width="1.2"/>
        <line x1="8" y1="6" x2="8" y2="11" stroke="#28a745" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="5.5" y1="8.5" x2="10.5" y2="8.5" stroke="#28a745" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      {{ t('toolbar.addServer') }}
    </div>
    <div class="tb-sep"></div>
    <div class="tb" :title="t('toolbar.join')" @click="emit('join')">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="3" width="9" height="10" rx="1" stroke="currentColor" stroke-width="1.2"/>
        <line x1="11" y1="8" x2="15" y2="8" stroke="#388bfd" stroke-width="1.3"/>
        <polyline points="12.5,6 15,8 12.5,10" stroke="#388bfd" stroke-width="1.3" fill="none"/>
        <line x1="4" y1="6" x2="9" y2="6" stroke="currentColor" stroke-width="1"/>
        <line x1="4" y1="8" x2="7" y2="8" stroke="currentColor" stroke-width="1"/>
      </svg>
      {{ t('toolbar.join') }}
    </div>
    <div class="tb" :title="t('toolbar.part')">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="3" width="9" height="10" rx="1" stroke="currentColor" stroke-width="1.2"/>
        <line x1="11" y1="8" x2="15" y2="8" stroke="#f85149" stroke-width="1.3"/>
        <polyline points="13.5,6 11,8 13.5,10" stroke="#f85149" stroke-width="1.3" fill="none"/>
        <line x1="4" y1="6" x2="9" y2="6" stroke="currentColor" stroke-width="1"/>
        <line x1="4" y1="8" x2="7" y2="8" stroke="currentColor" stroke-width="1"/>
      </svg>
      {{ t('toolbar.part') }}
    </div>
    <div class="tb-sep"></div>
    <div class="tb" :title="t('toolbar.dcc')" @click="emit('dcc')">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="2" width="8" height="10" rx="1" stroke="currentColor" stroke-width="1.2"/>
        <polyline points="7,2 7,6 10,6" stroke="currentColor" stroke-width="1" fill="none"/>
        <line x1="11" y1="9" x2="15" y2="9" stroke="#8b5cf6" stroke-width="1.3"/>
        <polyline points="12.5,7 15,9 12.5,11" stroke="#8b5cf6" stroke-width="1.3" fill="none"/>
      </svg>
      {{ t('toolbar.dcc') }}
    </div>
    <div class="tb-sep"></div>
    <div class="tb" :title="t('toolbar.tile')" @click="emit('tile')">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="2" width="5" height="5" stroke="currentColor" stroke-width="1.2"/>
        <rect x="9" y="2" width="5" height="5" stroke="currentColor" stroke-width="1.2"/>
        <rect x="2" y="9" width="5" height="5" stroke="currentColor" stroke-width="1.2"/>
        <rect x="9" y="9" width="5" height="5" stroke="currentColor" stroke-width="1.2"/>
      </svg>
      {{ t('toolbar.tile') }}
    </div>
    <div class="tb" :title="t('toolbar.cascade')" @click="emit('cascade')">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="10" height="8" stroke="currentColor" stroke-width="1.2"/>
        <rect x="4" y="5" width="10" height="8" stroke="currentColor" stroke-width="1.2" fill="#d4d0c8"/>
      </svg>
      {{ t('toolbar.cascade') }}
    </div>
    <div class="tb-sep"></div>
    <div class="tb" :title="t('toolbar.prefs')" @click="emit('prefs')">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.2"/>
        <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.2 3.2l1.4 1.4M11.4 11.4l1.4 1.4M11.4 3.2l-1.4 1.4M4.6 11.4l-1.4 1.4" stroke="currentColor" stroke-width="1.2"/>
      </svg>
      {{ t('toolbar.prefs') }}
    </div>
    <div class="tb-sep"></div>

    <div class="tb lang-btn" @click.stop="themeOpen = !themeOpen" title="Theme">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.2"/>
        <path d="M7 2 Q9 4 9 7 Q9 10 7 12 Q5 10 5 7 Q5 4 7 2Z" fill="currentColor" opacity="0.5"/>
      </svg>
      Theme
      <span style="font-size:9px; color:#808080">▼</span>
      <div v-if="themeOpen" class="lang-drop" @click.stop>
        <div
            v-for="theme in themes"
            :key="theme.id"
            class="lang-item"
            :class="{ active: theme.id === currentTheme }"
            @click="pickTheme(theme.id)"
        >
          <span style="width:20px; text-align:center; font-size:11px">{{ theme.id === currentTheme ? '●' : '○' }}</span>
          {{ theme.name }}
        </div>
        <div class="lang-item" style="border-top:1px solid #808080; margin-top:2px; padding-top:4px" @click="loadTheme">
          <span style="width:20px; text-align:center">📂</span>
          Load CSS…
        </div>
      </div>
    </div>
    <div class="tb-sep"></div>

    <div class="tb lang-btn" @click.stop="langOpen = !langOpen">
      <span style="font-size:14px; line-height:1">{{ currentLocale.flag }}</span>
      {{ currentLocale.name }}
      <span style="font-size:9px; color:#808080">▼</span>
      <div v-if="langOpen" class="lang-drop" @click.stop>
        <div
            v-for="loc in availableLocales"
            :key="loc.code"
            class="lang-item"
            :class="{ active: loc.code === currentCode }"
            @click="pickLocale(loc.code)"
        >
          <span class="lang-flag">{{ loc.flag }}</span>
          {{ loc.name }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useIRCStore } from '../stores/useIRCStore'
import { connectServer, disconnectServer } from '../composables/ircConnect.js'
import { availableLocales, setLocale, i18n } from '../i18n.js'
import { allThemes, applyTheme, loadCustomTheme, currentTheme } from '../composables/useTheme.js'

const { t } = useI18n()
const emit  = defineEmits(['join','addServer','prefs', 'dcc','tile','cascade'])
const store = useIRCStore()
const anyConnected = computed(() => store.servers.some(s => s.connected))

const langOpen      = ref(false)
const themeOpen     = ref(false)
const currentCode   = computed(() => i18n.global.locale.value)
const currentLocale = computed(() => availableLocales.find(l => l.code === currentCode.value) || availableLocales[0])
const themes        = computed(() => allThemes())

function pickLocale(code) { setLocale(code); langOpen.value = false }
function pickTheme(id)    { applyTheme(id); themeOpen.value = false }

async function loadTheme() {
  await loadCustomTheme()
  themeOpen.value = false
}

document.addEventListener('click', () => { langOpen.value = false; themeOpen.value = false })

function toggleConnection() {
  if (anyConnected.value) {
    store.servers.filter(s => s.connected).forEach(s => disconnectServer(s.id))
  } else {
    store.servers.forEach(s => {
      const channels = store.windows
          .filter(w => w.serverId === s.id && !w.isDM && !w.isListResult)
          .map(w => w.channel)
          .join(',')
      if (channels) s.autojoin = channels
      connectServer(s.id)
    })
  }
}

</script>

<style scoped>
.lang-btn { position: relative; gap: 4px; }
.lang-drop {
  position: absolute; top: 100%; right: 0; z-index: 9999;
  background: #d4d0c8; min-width: 190px; max-height: 340px; overflow-y: auto;
  border-top: 1px solid #ffffff; border-left: 1px solid #ffffff;
  border-bottom: 1px solid #404040; border-right: 1px solid #404040;
  box-shadow: 2px 2px 6px rgba(0,0,0,0.3); padding: 2px 0;
  isolation: isolate;
}
.lang-item {
  display: flex; align-items: center; gap: 8px;
  padding: 3px 12px; font-size: 11px; cursor: pointer; color: #000; white-space: nowrap;
}
.lang-item:hover  { background: #000080; color: #fff; }
.lang-item.active { font-weight: bold; }
.lang-flag { font-size: 14px; width: 20px; text-align: center; }
</style>