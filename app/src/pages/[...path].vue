<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { RouterLink } from 'vue-router'

const router = useRouter()

const goBack = () => {
  router.back()
}
</script>

<template>
  <div class="min-h-screen hero bg-base-200">
    <div class="hero-content text-center">
      <div class="max-w-md">
        <!-- 404 Icon -->
        <div class="mb-8">
          <Icon
            icon="lucide:bug"
            width="120"
            height="120"
            class="mx-auto text-error animate-bounce"
          />
        </div>

        <!-- Error Code -->
        <div class="text-9xl font-bold text-primary mb-4">404</div>

        <!-- Nerdy Error Message -->
        <h1 class="text-3xl font-bold text-base-content mb-4">Page Not Found</h1>

        <div class="space-y-4 mb-8">
          <div class="mockup-code text-left">
            <pre data-prefix="$"><code>cd /page/you/wanted</code></pre>
            <pre
              data-prefix=">"
              class="text-warning"
            ><code>bash: cd: No such file or directory</code></pre>
            <pre data-prefix="$"><code>ls -la</code></pre>
            <pre data-prefix=">" class="text-error"><code>total 0</code></pre>
            <pre data-prefix="$"><code>echo "Where am I?"</code></pre>
            <pre data-prefix=">" class="text-info"><code>404 Land</code></pre>
          </div>

          <div class="alert alert-warning">
            <Icon icon="lucide:terminal" width="20" height="20" />
            <span>
              <strong>Debug tip:</strong> Have you tried turning it off and on again? Or maybe check
              your URL for typos...
            </span>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <button @click="goBack" class="btn btn-ghost">
            <Icon icon="lucide:arrow-left" width="20" height="20" class="mr-2" />
            Go Back
          </button>

          <RouterLink to="/" class="btn btn-primary">
            <Icon icon="lucide:home" width="20" height="20" class="mr-2" />
            Return to Home
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Custom animations for the bug icon */
@keyframes bounce {
  0%,
  20%,
  53%,
  80%,
  100% {
    transform: translate3d(0, 0, 0);
  }
  40%,
  43% {
    transform: translate3d(0, -8px, 0);
  }
  70% {
    transform: translate3d(0, -4px, 0);
  }
  90% {
    transform: translate3d(0, -2px, 0);
  }
}

.animate-bounce {
  animation: bounce 2s infinite;
}
</style>
