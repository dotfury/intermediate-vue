<script setup lang="ts">
import { ref, useSlots } from 'vue'

const currentCount = ref(10)
const doubleCount = () => {
  currentCount.value = currentCount.value * 2
}
const isOpen = ref(true)

function closeModal() {
  isOpen.value = false
}

const slots = useSlots()

defineExpose({
  closeModal,
  currentCount,
  doubleCount,
})
</script>

<template>
  <main>
    <slot name="header">
      <h1>Slot Demo Title</h1>
    </slot>
    <slot :count="currentCount">
      <p>Current count is: {{ currentCount }}</p>
    </slot>
    <footer v-if="slots.footer" class="my-custom-footer-classes">
      <slot name="footer" />
    </footer>
  </main>
</template>

<style lang="scss" scoped></style>
