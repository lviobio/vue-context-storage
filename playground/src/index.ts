import { createApp } from 'vue'
import App from './App.vue'
import { createRouter, createWebHistory } from 'vue-router'
import VueContextStoragePlugin from '../../src/plugin'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: () => import('./views/MainLayout.vue'),
      children: [
        {
          path: '/',
          name: 'home',
          component: () => import('./views/Home.vue'),
        },
      ],
    },
  ],
})

const app = createApp(App)

app.use(router)
app.use(VueContextStoragePlugin)

app.mount('#app')
