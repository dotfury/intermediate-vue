<script setup lang="ts">
import { ref } from 'vue'

const currentCount = ref(10)
</script>

<template>
  <main>
    <slot name="header">
      <h1>Slot Demo Title</h1>
    </slot>
    <slot :count="currentCount">
      <p>Current count is: {{ currentCount }}</p>
    </slot>
    <slot name="footer">
      <p>This is the bottom</p>
    </slot>
  </main>
</template>

<style lang="scss" scoped></style>
