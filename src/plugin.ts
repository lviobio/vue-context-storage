import type { App, Plugin } from 'vue'
import ContextStorageActivator from './components/ContextStorageActivator.vue'
import ContextStorageCollection from './components/ContextStorageCollection.vue'
import ContextStorageProvider from './components/ContextStorageProvider.vue'
import ContextStorageRoot from './components/ContextStorageRoot.vue'

export const VueContextStoragePlugin: Plugin = {
  install(app: App) {
    app.component('ContextStorageActivator', ContextStorageActivator)
    app.component('ContextStorageCollection', ContextStorageCollection)
    app.component('ContextStorageProvider', ContextStorageProvider)
    app.component('ContextStorageRoot', ContextStorageRoot)
  },
}

export default VueContextStoragePlugin
