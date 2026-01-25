import { createApp } from 'vue'
import App from './App.vue'
import VueContextStoragePlugin from '../../src/plugin'
import naive from 'naive-ui'
import './style.css'
import { router } from './router'

const app = createApp(App)

app.use(router)
app.use(naive)
app.use(VueContextStoragePlugin)

app.mount('#app')
