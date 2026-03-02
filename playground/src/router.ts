import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    component: () => import('./views/MainLayout.vue'),
    redirect: '/query',
    children: [
      {
        path: 'query',
        name: 'demo.query',
        component: () => import('./views/demo/query/QueryDemoLayout.vue'),
        redirect: '/query/different-types',
        children: [
          {
            path: 'different-types',
            name: 'demo.query.different-types',
            component: () => import('./views/demo/query/DifferentTypes.vue'),
          },
          {
            path: 'repeater',
            name: 'demo.query.repeater',
            component: () => import('./views/demo/query/Repeater.vue'),
          },
          {
            path: 'table',
            name: 'demo.query.table',
            component: () => import('./views/demo/query/TableDemo.vue'),
          },
        ],
      },
      {
        path: 'local-storage',
        name: 'demo.local-storage',
        component: () => import('./views/demo/local-storage/LocalStorageDemo.vue'),
      },
      {
        path: 'session-storage',
        name: 'demo.session-storage',
        component: () => import('./views/demo/session-storage/SessionStorageDemo.vue'),
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
