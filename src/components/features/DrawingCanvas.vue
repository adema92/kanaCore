<script setup>
import { ref, watch } from 'vue'
import { Eraser } from 'lucide-vue-next'

const props = defineProps({
  id: [String, Number],
})
const emit = defineEmits(['draw'])
const canvasRef = ref(null)
const isDrawing = ref(false)

watch(
  () => props.id,
  () => {
    const canvas = canvasRef.value
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = 14
    ctx.strokeStyle = '#334155'
  },
  { immediate: true }
)

const start = (e) => {
  e.preventDefault()
  isDrawing.value = true
  draw(e)
}

const stop = () => {
  isDrawing.value = false
  const canvas = canvasRef.value
  if (canvas) canvas.getContext('2d').beginPath()
  emit('draw')
}

const draw = (e) => {
  if (!isDrawing.value || !canvasRef.value) return
  e.preventDefault()
  const rect = canvasRef.value.getBoundingClientRect()
  const clientX = e.clientX ?? (e.touches && e.touches[0]?.clientX) ?? 0
  const clientY = e.clientY ?? (e.touches && e.touches[0]?.clientY) ?? 0
  const x = clientX - rect.left
  const y = clientY - rect.top
  const ctx = canvasRef.value.getContext('2d')
  if (!ctx) return
  ctx.lineTo(x, y)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x, y)
}

const clear = () => {
  canvasRef.value?.getContext('2d')?.clearRect(0, 0, 280, 280)
}
</script>

<template>
  <div class="relative w-full max-w-[280px] mx-auto flex flex-col items-center">
    <canvas
      id="drawing-board"
      ref="canvasRef"
      width="280"
      height="280"
      class="bg-white rounded-[2rem] shadow-inner border-4 border-pink-100 touch-none w-full h-auto aspect-square mx-auto"
      @pointerdown="start"
      @pointermove="draw"
      @pointerup="stop"
    />
    <button
      type="button"
      class="absolute -bottom-2 right-4 bg-white p-3 rounded-full text-slate-400 shadow-lg border border-slate-100 active:scale-90"
      @click="clear"
    >
      <Eraser :size="20" />
    </button>
  </div>
</template>
