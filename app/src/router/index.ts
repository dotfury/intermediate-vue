import { createRouter, createWebHistory } from 'vue-router'
import { routes } from './routes'
import { routes as autoRoutes, handleHotUpdate } from 'vue-router/auto-routes'

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [...autoRoutes, ...routes],
})

if (import.meta.hot) {
  handleHotUpdate(router)
}
