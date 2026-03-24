<script setup>
import { ref, watch } from 'vue'
import { HIRAGANA_STROKE_OVERRIDES } from '../../data/hiragana-stroke-overrides.js'

const props = defineProps({
  character: String,
})

/** @type {import('vue').Ref<string[] | null>} */
const svgParts = ref(null)

let loadSeq = 0

function injectStrokeStyles(svgMarkup) {
  const style =
    '<style>g[id^="kvg:StrokePaths"] path { stroke-width: 6px !important; stroke: #334155 !important; stroke-linecap: round !important; stroke-linejoin: round !important; } g[id^="kvg:StrokeNumbers"] text { font-size: 14px !important; fill: #ef4444 !important; font-weight: bold !important; }</style>'
  if (svgMarkup.includes('</svg>')) return svgMarkup.replace('</svg>', `${style}</svg>`)
  return svgMarkup
}

function loadCharSvg(ch) {
  const local = HIRAGANA_STROKE_OVERRIDES[ch]
  if (local) return Promise.resolve(injectStrokeStyles(local))
  const code = ch.codePointAt(0).toString(16).toLowerCase()
  const url = `https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg@master/kanji/0${code}.svg`
  return fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error('fetch failed')
      return res.text()
    })
    .then((text) => {
      const cleaned = text
        .replace(/<!DOCTYPE[\s\S]*?\[[\s\S]*?\]>\n?/g, '')
        .replace(/<!DOCTYPE[\s\S]*?>\n?/g, '')
        .replace(/\]>\n?/g, '')
      return injectStrokeStyles(cleaned)
    })
}

watch(
  () => props.character,
  (character) => {
    if (!character) {
      svgParts.value = null
      return
    }
    const local = HIRAGANA_STROKE_OVERRIDES[character]
    if (local) {
      svgParts.value = [injectStrokeStyles(local)]
      return
    }
    const chars = [...character]
    const id = ++loadSeq
    svgParts.value = null
    Promise.all(chars.map((ch) => loadCharSvg(ch)))
      .then((parts) => {
        if (id !== loadSeq) return
        svgParts.value = parts
      })
      .catch(() => {
        if (id !== loadSeq) return
        svgParts.value = []
      })
  },
  { immediate: true }
)
</script>

<template>
  <div
    v-if="character && svgParts && svgParts.length"
    class="w-full h-full"
    :class="svgParts.length > 1 ? 'flex items-center justify-center gap-0.5' : ''"
  >
    <div
      v-for="(part, i) in svgParts"
      :key="i"
      class="h-full flex items-center justify-center min-w-0"
      :class="svgParts.length > 1 ? 'flex-1 [&>svg]:max-h-full [&>svg]:w-full [&>svg]:object-contain' : '[&>svg]:w-full [&>svg]:h-full'"
      v-html="part"
    />
  </div>
  <div v-else class="animate-pulse flex items-center justify-center text-slate-300">...</div>
</template>
