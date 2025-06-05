<script setup lang="ts">
import { watch } from 'vue'
import { ref } from 'vue'

const themes = ['light', 'dark', 'emerald', 'corporate', 'synthwave', 'retro', 'cyberpunk']

const currentTheme = ref('light')

const setTheme = (theme: string) => {
  currentTheme.value = theme
  document.documentElement.setAttribute('data-theme', theme)
}

watch(currentTheme, () => {
  setTheme(currentTheme.value)
})
</script>

<template>
  <div class="container mx-auto p-6">
    <h1 class="text-3xl font-bold mb-6">Settings</h1>

    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <h2 class="card-title">Theme</h2>
        <p class="mb-4">Choose your preferred theme</p>

        <div class="form-control">
          <select
            v-model="currentTheme"
            @change="onThemeChange"
            class="select select-bordered w-full max-w-xs"
          >
            <option v-for="theme in themes" :key="theme" :value="theme">
              {{ theme }}
            </option>
          </select>
        </div>
      </div>
    </div>
  </div>
</template>
