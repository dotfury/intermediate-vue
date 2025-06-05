<script setup lang="ts">
import SlotDemo from '@/components/SlotDemo.vue'
import { shallowRef } from 'vue'
import { useTemplateRef } from 'vue'

const slotDemoRef = useTemplateRef('slotDemo')

if (slotDemoRef) {
  slotDemoRef.value?.currentCount
  slotDemoRef.value?.closeModal()
}
</script>

<template>
  <main>
    <h1>Sandbox Page</h1>
    <SlotDemo ref="slotDemo">
      <template v-slot:default="{ count }">
        <p>This is my cool {{ count }}!</p>
      </template>
    </SlotDemo>
  </main>
</template>

<style scoped></style>
