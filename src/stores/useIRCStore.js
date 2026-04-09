import { defineStore } from 'pinia'
import { ref, computed, reactive } from 'vue'

export function prefixToRole(prefix) {
  return { '~':'owner','&':'admin','@':'op','%':'halfop','+':'voice' }[prefix] || 'user'
}

export const useIRCStore = defineStore('irc', () => {

  const servers = ref([])

  const prefs = reactive({
    nick:          '',
    nickAlt:       '',
    realname:      'bIRC User',
    username:      'birc',
    font:          'Consolas',
    fontSize:      10,
    showTimestamp: true,
    tsFormat:      'full',
    dateFormat:    'DD.MM.YYYY',
    showTopic:     true,
    coloredNicks:  true,
    showJoinPart:  true,
    rankColors: {
      owner:  '#f97583',
      admin:  '#e36209',
      op:     '#f85149',
      halfop: '#d29922',
      voice:  '#3fb950',
      me:     '#388bfd',
    },
    anonLinks:     false,
    anonProxy:     'https://anon.to/?',
    notifyMention: true,
    notifyDM:      true,
    notifyJoin:    false,
    notifySound:   true,
    highlights:    '',
    logEnabled:    false,
    logDir:        '~/birc-logs',
    logTimestamp:  true,
    logSystem:     false,
    dccDir:        '~/Downloads',
    dccAutoAccept: false,
    dccPortMin:    1024,
    dccPortMax:    5000,
  })

  function formatTs(date = new Date()) {
    const p = n => String(n).padStart(2, '0')
    const d = p(date.getDate()), m = p(date.getMonth()+1), Y = date.getFullYear()
    const H = p(date.getHours()), M = p(date.getMinutes()), S = p(date.getSeconds())
    if (!prefs.showTimestamp || prefs.tsFormat === 'none') return ''
    if (prefs.tsFormat === 'short') return H+':'+M
    if (prefs.tsFormat === 'time')  return H+':'+M+':'+S
    let dp = prefs.dateFormat.replace('DD',d).replace('MM',m).replace('YYYY',Y).replace('YY',String(Y).slice(2))
    return dp+' - '+H+':'+M+':'+S
  }

  const windows       = ref([])
  const statusWindows = ref([])
  const stubs         = ref([])
  const focusedId      = ref(null)
  const zCounter       = ref(10)
  const selectedTreeId = ref(null)
  const ctxMenu = ref({ visible: false, x: 0, y: 0, type: '', nick: '', role: '', winId: '', serverId: '' })

  const focusedWindow  = computed(() => windows.value.find(w => w.id === focusedId.value) || statusWindows.value.find(w => w.id === focusedId.value))
  const visibleWindows = computed(() => [...windows.value.filter(w => w.visible && !w.minimized), ...statusWindows.value.filter(w => w.visible && !w.minimized)])

  function getServer(id) { return servers.value.find(s => s.id === id) }
  function getWindow(id) { return windows.value.find(w => w.id === id) || statusWindows.value.find(w => w.id === id) }
  function windowsForServer(serverId) { return windows.value.filter(w => w.serverId === serverId) }

  function bringToFront(winId) {
    focusedId.value = winId; zCounter.value++
    const win = getWindow(winId); if (win) win.z = zCounter.value
    selectedTreeId.value = winId
  }

  function minimizeWindow(winId) {
    const win = getWindow(winId); if (!win) return
    win.minimized = true
    if (!win.isStatus) { const srv = getServer(win.serverId); stubs.value.push({ winId, serverId: win.serverId, title: (srv ? srv.shortName+':' : '')+win.channel, unread: win.unread || win.dmUnread }) }
    if (focusedId.value === winId) focusedId.value = null
  }

  function restoreWindow(winId) {
    const win = getWindow(winId); if (!win) return
    win.minimized = false; win.visible = true
    if (!win.isStatus) stubs.value = stubs.value.filter(s => s.winId !== winId)
    bringToFront(winId)
  }

  function closeWindow(winId) {
    const win = getWindow(winId); if (!win) return
    if (win.isListResult) {
      const idx = windows.value.findIndex(w => w.id === winId)
      if (idx !== -1) windows.value.splice(idx, 1)
    } else if (win.isStatus) {
      win.visible = false
    } else {
      stubs.value = stubs.value.filter(s => s.winId !== winId)
      windows.value.splice(windows.value.findIndex(w => w.id === winId), 1)
    }
    if (focusedId.value === winId) focusedId.value = null
  }

  function toggleMaximize(winId) {
    const win = getWindow(winId); if (!win) return
    if (win.maximized) {
      win.x = win.savedX; win.y = win.savedY; win.w = win.savedW; win.h = win.savedH
      win.useRight = win.savedUseRight || false; win.useBottom = win.savedUseBottom || false
      win.maximized = false
    } else {
      win.savedX = win.x; win.savedY = win.y; win.savedW = win.w; win.savedH = win.h
      win.savedUseRight = win.useRight; win.savedUseBottom = win.useBottom
      win.x = 0; win.y = 0; win.w = 0; win.h = 0; win.useRight = true; win.useBottom = true; win.maximized = true
    }
    bringToFront(winId)
  }

  function moveWindow(winId, x, y) { const win = getWindow(winId); if (!win || win.maximized) return; win.x = x; win.y = y; win.useRight = false; win.useBottom = false }
  function resizeWindow(winId, w, h) { const win = getWindow(winId); if (!win || win.maximized) return; win.w = w; win.h = h; win.useRight = false; win.useBottom = false }

  function tileWindows(mdiW, mdiH) {
    const wins = windows.value.filter(w => w.visible && !w.minimized && !w.maximized); if (!wins.length) return
    const cols = Math.ceil(Math.sqrt(wins.length)), rows = Math.ceil(wins.length / cols)
    const ww = Math.floor(mdiW / cols), wh = Math.floor(mdiH / rows)
    wins.forEach((win, i) => { win.x = (i%cols)*ww; win.y = Math.floor(i/cols)*wh; win.w = ww; win.h = wh; win.useRight = false; win.useBottom = false; win.maximized = false; win.z = ++zCounter.value })
    if (wins.length) focusedId.value = wins[wins.length-1].id
  }

  function cascadeWindows() {
    const wins = windows.value.filter(w => w.visible && !w.minimized && !w.maximized); if (!wins.length) return
    wins.forEach((win, i) => { win.x = i*24; win.y = i*24; win.w = 420; win.h = 320; win.useRight = false; win.useBottom = false; win.maximized = false; win.z = ++zCounter.value })
    if (wins.length) focusedId.value = wins[wins.length-1].id
  }

  function openStatus(serverId) {
    const sw = statusWindows.value.find(w => w.serverId === serverId); if (!sw) return
    sw.visible = true; sw.minimized = false; bringToFront(sw.id); selectedTreeId.value = 'status-'+serverId
  }

  function toggleServerExpanded(serverId) { const srv = getServer(serverId); if (srv) srv.expanded = !srv.expanded }
  function showCtxMenu(x, y, type, payload) { ctxMenu.value = { visible: true, x, y, type, ...payload } }
  function hideCtxMenu() { ctxMenu.value.visible = false }

  return {
    servers, windows, statusWindows, stubs, focusedId, zCounter, selectedTreeId, ctxMenu, prefs,
    focusedWindow, visibleWindows,
    getServer, getWindow, windowsForServer,
    bringToFront, minimizeWindow, restoreWindow, closeWindow, toggleMaximize, moveWindow, resizeWindow,
    tileWindows, cascadeWindows, openStatus, toggleServerExpanded, showCtxMenu, hideCtxMenu,
    formatTs, prefixToRole,
  }
})