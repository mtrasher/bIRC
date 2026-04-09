<template>
  <div class="menubar" @click.stop @mouseleave="onBarLeave">

    <div class="mi" @click="toggle('file')" @mouseenter="hover('file')" :class="{ active: open === 'file' }">{{ t('menu.file') }}
      <div v-if="open === 'file'" class="mdrop">
        <div class="mdi-item" @click="close(); emit('addServer')">{{ t('menu.connect') }}</div>
        <div class="mdi-sep"></div>
        <div class="mdi-item" @click="close(); emit('prefs')">{{ t('menu.prefs') }}</div>
        <div class="mdi-sep"></div>
        <div class="mdi-item" @click="close(); quit()">{{ t('menu.exit') }}</div>
      </div>
    </div>

    <div class="mi" @click="toggle('net')" @mouseenter="hover('net')" :class="{ active: open === 'net' }">{{ t('menu.network') }}
      <div v-if="open === 'net'" class="mdrop">
        <div class="mdi-item" @click="close(); emit('addServer')">{{ t('menu.addServer') }}</div>
        <div class="mdi-item" @click="close(); emit('join')">{{ t('menu.joinChannel') }}</div>
        <div class="mdi-sep"></div>
        <div class="mdi-item" @click="close(); emit('dcc')">{{ t('menu.dcc') }}</div>
      </div>
    </div>

    <div class="mi" @click="toggle('view')" @mouseenter="hover('view')" :class="{ active: open === 'view' }">{{ t('menu.view') }}
      <div v-if="open === 'view'" class="mdrop">
        <div class="mdi-item" @click="close(); emit('tile')">{{ t('menu.tile') }}</div>
        <div class="mdi-item" @click="close(); emit('cascade')">{{ t('menu.cascade') }}</div>
        <div class="mdi-sep"></div>
        <div class="mdi-item" @click="close()">✓ {{ t('menu.toolbar') }}</div>
        <div class="mdi-item" @click="close()">✓ {{ t('menu.statusbar') }}</div>
        <div class="mdi-item" @click="close()">✓ {{ t('menu.servertree') }}</div>
      </div>
    </div>

    <div class="mi" @click="toggle('win')" @mouseenter="hover('win')" :class="{ active: open === 'win' }">{{ t('menu.window') }}
      <div v-if="open === 'win'" class="mdrop" style="min-width:200px">
        <div v-if="!store.visibleWindows.length" class="mdi-item disabled">—</div>
        <div
            v-for="win in store.visibleWindows"
            :key="win.id"
            class="mdi-item"
            :class="{ checked: store.focusedId === win.id }"
            @click="close(); store.bringToFront(win.id)"
        >{{ win.title }}</div>
      </div>
    </div>

    <div class="mi" @click="toggle('help')" @mouseenter="hover('help')" :class="{ active: open === 'help' }">{{ t('menu.help') }}
      <div v-if="open === 'help'" class="mdrop">
        <div class="mdi-item" @click="close(); showAbout = true">{{ t('menu.about') }}</div>
        <div class="mdi-sep"></div>
        <div class="mdi-item" @click="close(); openUrl('https://github.com/mtrash/birc')">{{ t('menu.github') }}</div>
      </div>
    </div>

  </div>

  <Teleport to="body">
    <div v-if="showAbout" class="dlg-overlay" @click.self="showAbout = false">
      <div class="dlg" style="width:340px">
        <div class="dlg-tb">
          <span class="dlg-title">About bIRC</span>
          <div class="dlg-close" @click="showAbout = false">✕</div>
        </div>
        <div class="dlg-body" style="align-items:center; text-align:center; gap:12px; padding:24px">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect width="48" height="48" rx="6" fill="#000080"/>
            <polygon points="28,6 14,26 22,26 20,42 34,22 26,22" fill="#ffdd00" stroke="#cc9900" stroke-width="0.5"/>
          </svg>
          <div style="font-size:18px; font-weight:bold; color:#000080">bIRC</div>
          <div style="font-size:11px; color:#444">Version 0.1.0 Alpha</div>
          <div style="font-size:11px; color:#444">blackflag crew IRC client built with Electron + Vue 3</div>
          <div style="font-size:10px; color:#808080; margin-top:4px">© 2026 mtrash (blackflagcrew.net) — MIT License</div>
        </div>
        <div class="dlg-footer">
          <button class="dlg-btn primary" @click="showAbout = false">OK</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useIRCStore } from '../stores/useIRCStore'

const { t } = useI18n()
const emit = defineEmits(['join', 'addServer', 'prefs', 'dcc', 'tile', 'cascade'])
const store     = useIRCStore()
const open      = ref(null)
const showAbout = ref(false)

function toggle(menu) { open.value = open.value === menu ? null : menu }
function close()      { open.value = null }
function hover(menu)  { if (open.value && open.value !== menu) open.value = menu }
function onBarLeave() {}

function quit() {
  if (window.neutron) window.neutron.raw?.('', '')
  window.close()
}

function openUrl(url) {
  if (window.electronShell) window.electronShell.openExternal(url)
  else window.open(url, '_blank')
}

document.addEventListener('click', () => close())
</script>

<style scoped>
.mdrop {
  position: absolute; top: 100%; left: 0; z-index: 9000;
  background: #d4d0c8; min-width: 160px;
  border-top: 1px solid #ffffff; border-left: 1px solid #ffffff;
  border-bottom: 1px solid #404040; border-right: 1px solid #404040;
  box-shadow: 2px 2px 4px rgba(0,0,0,0.3);
  padding: 2px 0;
}
.mi { position: relative; }
.mdi-item {
  padding: 3px 20px 3px 20px; font-size: 11px; color: #000;
  cursor: pointer; white-space: nowrap;
}
.mdi-item:hover     { background: #000080; color: #fff; }
.mdi-item.disabled  { color: #808080; cursor: default; }
.mdi-item.disabled:hover { background: transparent; color: #808080; }
.mdi-item.checked::before { content: '✓'; position: absolute; left: 6px; }
.mdi-sep { height: 1px; background: #808080; margin: 2px 2px; box-shadow: 0 1px 0 #fff; }
</style>