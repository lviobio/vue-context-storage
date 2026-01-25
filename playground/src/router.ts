import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'

const routes = [
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
]

export const router = createRouter({
  history: import.meta.env.PROD
    ? createWebHashHistory(import.meta.env.BASE_URL)
    : createWebHistory(import.meta.env.BASE_URL),
  routes,
})
