<template>
  <div class="mdi" ref="mdiEl">
    <MDIWindow
      v-for="win in store.visibleWindows"
      :key="win.id"
      :win="win"
      :mdiEl="mdiEl"
    />
    <StubBar :mdiEl="mdiEl" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import MDIWindow from './MDIWindow.vue'
import StubBar   from './StubBar.vue'
import { useIRCStore } from '../stores/useIRCStore'

const store = useIRCStore()
const mdiEl = ref(null)

defineExpose({ mdiEl })
</script>
