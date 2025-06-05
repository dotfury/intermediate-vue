<script setup lang="ts">
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { Icon } from '@iconify/vue'

import { computed } from 'vue'
import BaseIcon from './components/BaseIcon.vue'

const route = useRoute()

const isHomePage = computed(() => route.path === '/')
</script>

<template>
  <div class="app">
    <header
      v-if="!isHomePage"
      class="navbar bg-base-100 shadow-lg sticky top-0 z-50 flex justify-between"
    >
      <div class="navbar-start">
        <RouterLink to="/" class="btn btn-ghost text-xl font-bold text-primary">
          <BaseIcon source="custom" name="IconMountain" />
          Point of Vue
        </RouterLink>
      </div>

      <div class="navbar-center hidden lg:flex">
        <ul class="menu menu-horizontal px-1">
          <li>
            <RouterLink to="/" class="nav-item">
              <Icon icon="lucide:home" width="18" height="18" />
              Home
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/tasks" class="nav-item">
              <Icon icon="lucide:check-square" width="18" height="18" />
              Tasks
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/planner" class="nav-item">
              <Icon icon="lucide:calendar" width="18" height="18" />
              Planner
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/reflection" class="nav-item">
              <Icon icon="lucide:bar-chart-3" width="18" height="18" />
              Reflection
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/settings" class="nav-item">
              <Icon icon="lucide:settings" width="18" height="18" />
              Settings
            </RouterLink>
          </li>
        </ul>
      </div>

      <div class="navbar-end lg:hidden">
        <div class="dropdown dropdown-end">
          <div tabindex="0" role="button" class="btn btn-ghost">
            <Icon icon="lucide:menu" width="20" height="20" />
          </div>
          <ul
            tabindex="0"
            class="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52"
          >
            <li>
              <RouterLink to="/" class="nav-item-mobile">
                <Icon icon="lucide:home" width="18" height="18" />
                Home
              </RouterLink>
            </li>
            <li>
              <RouterLink to="/tasks" class="nav-item-mobile">
                <Icon icon="lucide:check-square" width="18" height="18" />
                Tasks
              </RouterLink>
            </li>
            <li>
              <RouterLink to="/planner" class="nav-item-mobile">
                <Icon icon="lucide:calendar" width="18" height="18" />
                Planner
              </RouterLink>
            </li>
            <li>
              <RouterLink to="/reflection" class="nav-item-mobile">
                <Icon icon="lucide:bar-chart-3" width="18" height="18" />
                Reflection
              </RouterLink>
            </li>
            <li>
              <RouterLink to="/settings" class="nav-item-mobile">
                <Icon icon="lucide:settings" width="18" height="18" />
                Settings
              </RouterLink>
            </li>
          </ul>
        </div>
      </div>
    </header>

    <main class="app-main">
      <RouterView v-slot="{ Component }">
        <template v-if="Component">
          <Suspense>
            <component :is="Component" />
            <template #fallback>
              <div class="loading-state">
                <Icon icon="lucide:loader-2" width="32" height="32" class="animate-spin" />
                <span>Loading...</span>
              </div>
            </template>
          </Suspense>
        </template>
      </RouterView>
    </main>
  </div>
</template>

<style>
@import 'tailwindcss';
@plugin "daisyui" {
  themes:
    light --default,
    dark,
    emerald,
    corporate,
    synthwave,
    retro,
    cyberpunk;
}

/* Smooth scroll behavior for anchor links */
html {
  scroll-behavior: smooth;
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-main {
  flex: 1;
  background: var(--fallback-b1, oklch(var(--b1) / 1));
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 3rem;
  color: var(--fallback-bc, oklch(var(--bc) / 1));
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Custom navigation styles for active states */
.nav-item.router-link-active {
  background-color: hsl(var(--p));
  color: hsl(var(--pc));
  font-weight: 600;
}

.nav-item-mobile.router-link-active {
  background-color: hsl(var(--p));
  color: hsl(var(--pc));
  font-weight: 600;
}

.nav-item:hover {
  background-color: hsl(var(--p) / 0.1);
  color: hsl(var(--p));
}

.nav-item-mobile:hover {
  background-color: hsl(var(--p) / 0.1);
  color: hsl(var(--p));
}
</style>
