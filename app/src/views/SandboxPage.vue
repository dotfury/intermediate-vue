<script setup lang="ts">
import SlotDemo from '@/components/SlotDemo.vue'
</script>

<template>
  <main>
    <h1>Sandbox Page</h1>
    <SlotDemo>
      <template v-slot:default="{ count }">
        <p>This is my cool {{ count }}!</p>
      </template>
      <template v-slot:footer>
        <p>This is my footer content.</p>
      </template>
    </SlotDemo>
  </main>
</template>

<style scoped></style>
