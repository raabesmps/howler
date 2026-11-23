import { createRouter, createWebHashHistory } from 'vue-router'

/** Hash routing: the prototype is a static site, so a link such as /#/h/<token> works on any static host. */
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'compose', component: () => import('./views/ComposeView.vue') },
    { path: '/sent/:token', name: 'sent', component: () => import('./views/ShareView.vue'), props: true },
    { path: '/h/:token', name: 'open', component: () => import('./views/OpenView.vue'), props: true },
    { path: '/:rest(.*)*', name: 'notfound', component: () => import('./views/NotFoundView.vue') },
  ],
  scrollBehavior: () => ({ top: 0 }),
})
