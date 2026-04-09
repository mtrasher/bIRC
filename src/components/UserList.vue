<template>
  <div class="ulist">
    <div class="u-head">{{ users.length }} users</div>
    <div class="u-scroll">
      <div
          v-for="u in sorted"
          :key="u.nick"
          class="u-row"
          @contextmenu.prevent="onRightClick($event, u)"
          @dblclick="openDM(u)"
      >
        <template v-if="u.nick === 'ChanServ' && u.prefix === '@'">
          <span class="u-p op">@</span>
          <span class="u-n op">ChanServ</span>
        </template>
        <template v-else>
          <span class="u-p" :class="rowRole(u)">{{ u.prefix || '' }}</span>
          <span class="u-n" :class="rowRole(u)">{{ u.nick }}</span>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useIRCStore } from '../stores/useIRCStore'

const props = defineProps({
  users: { type: Array, default: () => [] },
  win:   { type: Object, required: true }
})

const store = useIRCStore()

const RANK = { owner: 0, admin: 1, op: 2, halfop: 3, voice: 4, user: 5 }

const sorted = computed(() =>
    [...props.users].sort((a, b) => {
      const rd = (RANK[a.role] ?? 5) - (RANK[b.role] ?? 5)
      if (rd !== 0) return rd
      return a.nick.toLowerCase().localeCompare(b.nick.toLowerCase())
    })
)

function rowRole(u) {
  if (u.nick === 'ChanServ' && u.prefix === '@') return 'op'
  return u.role === 'me' ? 'user' : u.role
}

function onRightClick(e, user) {
  store.showCtxMenu(e.clientX, e.clientY, 'user', { nick: user.nick, role: user.role })
}

function openDM(user) {
  if (user.role === 'me') return
  const existing = store.windows.find(w => w.serverId === props.win.serverId && w.channel === user.nick && w.isDM)
  if (existing) {
    existing.visible = true
    store.bringToFront(existing.id)
    return
  }
  const srv = store.getServer(props.win.serverId)
  const id  = `win-${props.win.serverId}-dm-${user.nick}-${Date.now()}`
  store.windows.push({
    id, serverId: props.win.serverId, channel: user.nick,
    title: `[${srv?.shortName || props.win.serverId}] ${user.nick}`,
    topic: '', unread: false, dmUnread: false, isDM: true,
    visible: true, minimized: false, maximized: false,
    x: 80 + Math.random()*60, y: 80 + Math.random()*60,
    w: 420, h: 320, z: ++store.zCounter,
    messages: [], users: [],
    myNick: props.win.myNick, nickClass: srv?.colorClass || '',
  })
  store.bringToFront(id)
}
</script>