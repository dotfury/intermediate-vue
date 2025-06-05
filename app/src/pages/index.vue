<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Icon } from '@iconify/vue'
</script>

<template>
  <main class="landing-page">
    <!-- Hero Section with DaisyUI -->
    <div class="hero min-h-screen bg-primary text-primary-content">
      <div class="hero-content text-center">
        <div class="max-w-md">
          <img
            src="/pov-logo.png"
            alt="Point of Vue Logo"
            class="w-32 h-32 mx-auto mb-6 object-contain"
          />
          <h1 class="text-5xl font-bold mb-5">Point of Vue</h1>
          <p class="text-xl mb-8">Your personal productivity dashboard</p>
          <a href="#choose-your-focus" class="btn btn-secondary btn-lg">
            Get Started
            <Icon icon="lucide:chevron-down" width="20" height="20" class="ml-2" />
          </a>
        </div>
      </div>
    </div>

    <!-- Navigation Cards Section -->
    <section class="py-16 bg-base-100" id="choose-your-focus">
      <div class="container mx-auto px-4">
        <h2 class="text-4xl font-bold text-center mb-12">Choose Your Focus</h2>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <!-- Tasks Card -->
          <div
            class="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
          >
            <RouterLink to="/tasks" class="card-body text-center">
              <div class="flex justify-center mb-4">
                <Icon icon="lucide:check-square" width="64" height="64" class="text-primary" />
              </div>
              <h3 class="card-title justify-center text-2xl mb-4">Tasks</h3>
              <p class="text-base-content/70 mb-6">
                Manage your tasks, track time, and stay organized with powerful productivity tools.
              </p>
              <div class="card-actions justify-center">
                <span class="btn btn-primary btn-outline">
                  Manage Tasks
                  <Icon icon="lucide:arrow-right" width="16" height="16" class="ml-2" />
                </span>
              </div>
            </RouterLink>
          </div>

          <!-- Planner Card -->
          <div
            class="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
          >
            <RouterLink to="/planner" class="card-body text-center">
              <div class="flex justify-center mb-4">
                <Icon icon="lucide:calendar" width="64" height="64" class="text-secondary" />
              </div>
              <h3 class="card-title justify-center text-2xl mb-4">Weekly Planner</h3>
              <p class="text-base-content/70 mb-6">
                Plan your weeks strategically and track your progress across different life areas.
              </p>
              <div class="card-actions justify-center">
                <span class="btn btn-secondary btn-outline">
                  Plan Week
                  <Icon icon="lucide:arrow-right" width="16" height="16" class="ml-2" />
                </span>
              </div>
            </RouterLink>
          </div>

          <!-- Reflection Card -->
          <div
            class="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
          >
            <RouterLink to="/reflection" class="card-body text-center">
              <div class="flex justify-center mb-4">
                <Icon icon="lucide:bar-chart-3" width="64" height="64" class="text-warning" />
              </div>
              <h3 class="card-title justify-center text-2xl mb-4">Weekly Reflection</h3>
              <p class="text-base-content/70 mb-6">
                Analyze your productivity patterns and gain valuable insights for improvement.
              </p>
              <div class="card-actions justify-center">
                <span class="btn btn-warning btn-outline">
                  View Analytics
                  <Icon icon="lucide:arrow-right" width="16" height="16" class="ml-2" />
                </span>
              </div>
            </RouterLink>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="py-16 bg-base-200" id="features">
      <div class="container mx-auto px-4">
        <div class="text-center mb-12">
          <h2 class="text-4xl font-bold mb-4">Powerful Features</h2>
          <p class="text-xl text-base-content/70">Everything you need to boost your productivity</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div class="card bg-base-100 shadow-lg">
            <div class="card-body text-center">
              <div class="flex justify-center mb-4">
                <Icon icon="lucide:clock" width="48" height="48" class="text-primary" />
              </div>
              <h4 class="card-title justify-center text-lg mb-2">Time Tracking</h4>
              <p class="text-sm text-base-content/70">
                Track time spent on tasks with precision and detailed analytics.
              </p>
            </div>
          </div>

          <div class="card bg-base-100 shadow-lg">
            <div class="card-body text-center">
              <div class="flex justify-center mb-4">
                <Icon icon="lucide:target" width="48" height="48" class="text-secondary" />
              </div>
              <h4 class="card-title justify-center text-lg mb-2">Goal Setting</h4>
              <p class="text-sm text-base-content/70">
                Set meaningful goals and track your progress towards achieving them.
              </p>
            </div>
          </div>

          <div class="card bg-base-100 shadow-lg">
            <div class="card-body text-center">
              <div class="flex justify-center mb-4">
                <Icon icon="lucide:bar-chart" width="48" height="48" class="text-warning" />
              </div>
              <h4 class="card-title justify-center text-lg mb-2">Progress Analytics</h4>
              <p class="text-sm text-base-content/70">
                Visualize your productivity patterns with comprehensive analytics.
              </p>
            </div>
          </div>

          <div class="card bg-base-100 shadow-lg">
            <div class="card-body text-center">
              <div class="flex justify-center mb-4">
                <Icon icon="lucide:layers" width="48" height="48" class="text-error" />
              </div>
              <h4 class="card-title justify-center text-lg mb-2">Area Organization</h4>
              <p class="text-sm text-base-content/70">
                Organize tasks by life areas for better balance and focus.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Call to Action -->
    <section class="py-16 bg-base-100">
      <div class="container mx-auto px-4 text-center">
        <h2 class="text-3xl font-bold mb-4">Ready to boost your productivity?</h2>
        <p class="text-xl mb-8 text-base-content/70">
          Start organizing your life with Point of Vue today.
        </p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <RouterLink to="/tasks" class="btn btn-primary btn-lg">
            <Icon icon="lucide:check" width="20" height="20" class="mr-2" />
            Start with Tasks
          </RouterLink>
          <RouterLink to="/planner" class="btn btn-secondary btn-lg">
            <Icon icon="lucide:calendar" width="20" height="20" class="mr-2" />
            Plan Your Week
          </RouterLink>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
/* Ensure consistent card heights in grid */
.card {
  height: 100%;
}

/* Custom styling for router links in cards */
.card a {
  text-decoration: none;
  color: inherit;
  display: block;
  height: 100%;
}

.card a:hover {
  text-decoration: none;
}
</style>
