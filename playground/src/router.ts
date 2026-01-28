import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    component: () => import('./views/MainLayout.vue'),
    children: [
      {
        path: '/',
        name: 'query',
        component: () => import('./views/Home.vue'),
      },
      {
        path: '/local-storage',
        name: 'local-storage',
        component: () => import('./views/LocalStorageDemo.vue'),
      },
      {
        path: '/session-storage',
        name: 'session-storage',
        component: () => import('./views/SessionStorageDemo.vue'),
      },
    ],
  },
]

export const router = createRouter({
  history: import.meta.env.PROD
    ? createWebHashHistory(import.meta.env.BASE_URL)
    : createWebHistory(import.meta.env.BASE_URL),
  routes,
})
