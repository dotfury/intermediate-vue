import { watch } from 'vue'
import { ref } from 'vue'

export const themes = ['light', 'dark', 'emerald', 'corporate', 'synthwave', 'retro', 'cyberpunk']

export const currentTheme = ref('light')

export const setTheme = (theme: string) => {
  currentTheme.value = theme
  document.documentElement.setAttribute('data-theme', theme)
}

export function useTheme() {
  watch(currentTheme, () => {
    setTheme(currentTheme.value)
  })
}
