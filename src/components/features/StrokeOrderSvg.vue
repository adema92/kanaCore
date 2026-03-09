<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  character: String,
})
const svgData = ref(null)

watch(
  () => props.character,
  (character) => {
    if (!character) {
      svgData.value = null
      return
    }
    const code = character.charCodeAt(0).toString(16).toLowerCase()
    const url = `https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg@master/kanji/0${code}.svg`
    fetch(url)
      .then((res) => res.text())
      .then((text) => {
        const cleaned = text
          .replace(/<!DOCTYPE[\s\S]*?\[[\s\S]*?\]>\n?/g, '')
          .replace(/<!DOCTYPE[\s\S]*?>\n?/g, '')
          .replace(/\]>\n?/g, '')
        const style = `<style>g[id^="kvg:StrokePaths"] path { stroke-width: 6px !important; stroke: #334155 !important; stroke-linecap: round !important; stroke-linejoin: round !important; } g[id^="kvg:StrokeNumbers"] text { font-size: 14px !important; fill: #ef4444 !important; font-weight: bold !important; }</style></style>`
        svgData.value = cleaned.replace('</svg>', style)
      })
      .catch(() => { svgData.value = '' })
  },
  { immediate: true }
)
</script>

<template>
  <div v-if="svgData" class="w-full h-full [&>svg]:w-full [&>svg]:h-full" v-html="svgData" />
  <div v-else class="animate-pulse flex items-center justify-center text-slate-300">...</div>
</template>
