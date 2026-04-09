import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { i18n } from './i18n.js'
import { applyTheme } from './composables/useTheme.js'
import App from './App.vue'
import './style.css'
import './themes/2000.css'
import './themes/midnight.css'
import './themes/y2k.css'
import './themes/glass.css'

const app = createApp(App)
app.use(createPinia())
app.use(i18n)
app.mount('#app')

applyTheme(localStorage.getItem('birc-theme') || 'origin')