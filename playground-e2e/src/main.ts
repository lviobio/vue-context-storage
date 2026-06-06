import { createApp } from 'vue'
import { VueContextStoragePlugin } from 'vue-context-storage'
import App from './App.vue'
import { router } from './router'

const app = createApp(App)

app.use(router)
app.use(VueContextStoragePlugin)

app.mount('#app')
