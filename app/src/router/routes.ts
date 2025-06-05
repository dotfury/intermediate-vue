export const routes = [
  {
    path: '/planner',
    component: () => import('../views/PlannerPage.vue'),
  },
  {
    path: '/planner/week/:id',
    component: () => import('../views/WeekDetailPage.vue'),
  },
  {
    path: '/reflection',
    component: () => import('../views/ReflectionPage.vue'),
  },
  {
    path: '/settings',
    component: () => import('../views/SettingsPage.vue'),
  },
  {
    path: '/sandbox',
    component: () => import('../views/SandboxPage.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../views/NotFoundPage.vue'),
  },
]

/**
 * domain.com/product/:id/product-detail
 */
