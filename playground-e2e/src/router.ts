import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/schema-default',
  },
  {
    path: '/schema-default',
    name: 'schema-default',
    component: () => import('./views/SchemaDefault.vue'),
  },
  {
    path: '/nested-default',
    name: 'nested-default',
    component: () => import('./views/NestedDefault.vue'),
  },
  {
    path: '/query-sync',
    name: 'query-sync',
    component: () => import('./views/QuerySync.vue'),
  },
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})
