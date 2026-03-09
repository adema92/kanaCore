<script setup>
import { computed, ref } from 'vue'
import { useAppStore } from '../stores/appStore'

const store = useAppStore()

const vocabByCategory = computed(() => {
  return store.vocabData.reduce((acc, curr) => {
    if (!acc[curr.category]) acc[curr.category] = []
    acc[curr.category].push(curr)
    return acc
  }, {})
})

// Accordion: tutte le categorie chiuse di default
const openCategories = ref(new Set())

function toggleCategory(cat) {
  const s = new Set(openCategories.value)
  s.has(cat) ? s.delete(cat) : s.add(cat)
  openCategories.value = s
}

const toneEmoji = {
  'Formale':   '🎩',
  'Informale': '😊',
}

function getMasteryIcon(score) {
  if (score >= 80) return { color: 'text-emerald-500', title: 'Padronanza' }
  if (score >= 40) return { color: 'text-amber-400',   title: 'In corso'   }
  return                  { color: 'text-rose-400',    title: 'Da studiare'}
}

// Conteggio per livello per categoria
function catStats(words) {
  const padronanza = words.filter(w => w.score >= 80).length
  const inCorso    = words.filter(w => w.score >= 40 && w.score < 80).length
  const daStud     = words.filter(w => w.score < 40).length
  return { padronanza, inCorso, daStud, total: words.length }
}
</script>

<template>
  <div class="w-full px-4 space-y-4 pb-6">

    <!-- Header Vocabolario -->
    <div class="bg-gradient-to-br from-emerald-400 via-teal-500 to-green-600 p-6 rounded-3xl text-white shadow-lg text-center w-full relative overflow-hidden">
      <div class="absolute -top-3 -right-3 opacity-10 text-[80px] leading-none">📗</div>
      <div class="text-4xl mb-1">📗</div>
      <h1 class="text-2xl font-black mb-0.5 uppercase tracking-tight">Vocabolario</h1>
      <p class="text-emerald-50 text-xs font-semibold mb-5 opacity-80 uppercase tracking-widest">
        {{ store.vocabData.length }} parole
      </p>
      <div class="flex gap-3 mb-2">
        <button
          class="flex-1 bg-white/95 text-emerald-700 font-black py-3.5 rounded-2xl text-xs shadow-md active:scale-95 transition-all uppercase tracking-widest flex flex-col items-center gap-0.5"
          @click="store.handleStartQuizClick('vocab-romaji')"
        >
          <span class="text-lg">🌸</span>
          <span>Quiz Parole</span>
        </button>
        <button
          class="flex-1 bg-white/30 backdrop-blur text-white font-black py-3.5 rounded-2xl text-xs shadow-md active:scale-95 transition-all uppercase tracking-widest border border-white/50 flex flex-col items-center gap-0.5"
          @click="store.handleStartQuizClick('vocab-kana-to-romaji')"
        >
          <span class="text-xl font-black">あ</span>
          <span>Kana → Romaji</span>
        </button>
      </div>
    </div>

    <!-- Accordion per categoria -->
    <div
      v-for="[cat, words] in Object.entries(vocabByCategory)"
      :key="cat"
      class="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden"
    >
      <!-- Header accordion (sempre visibile) -->
      <button
        type="button"
        class="w-full px-5 py-4 flex items-center justify-between active:bg-slate-50 transition-colors"
        @click="toggleCategory(cat)"
      >
        <div class="flex items-center gap-3 min-w-0">
          <span class="text-base">🏷️</span>
          <div class="text-left min-w-0">
            <p class="font-black text-slate-700 uppercase text-sm tracking-wide leading-tight">{{ cat }}</p>
            <p class="text-[11px] text-slate-400 font-semibold mt-0.5">{{ words.length }} parole</p>
          </div>
        </div>
        <!-- Mini barre mastery + chevron -->
        <div class="flex items-center gap-3 shrink-0">
          <!-- Pill: verde / arancio / rosso -->
          <div class="flex gap-1 items-center">
            <span class="text-[10px] font-black text-emerald-500">{{ catStats(words).padronanza }}</span>
            <div class="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
            <span class="text-[10px] font-black text-amber-400">{{ catStats(words).inCorso }}</span>
            <div class="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
            <span class="text-[10px] font-black text-rose-400">{{ catStats(words).daStud }}</span>
            <div class="w-1.5 h-1.5 rounded-full bg-rose-400"></div>
          </div>
          <!-- Chevron -->
          <span
            class="text-slate-300 font-black text-lg transition-transform duration-200"
            :class="openCategories.has(cat) ? 'rotate-180' : ''"
          >⌄</span>
        </div>
      </button>

      <!-- Lista parole (collassabile) -->
      <div v-show="openCategories.has(cat)" class="border-t border-slate-50">
        <button
          v-for="w in words"
          :key="w.id"
          type="button"
          class="w-full px-4 py-3 border-b border-slate-50 last:border-b-0 flex items-center gap-3 active:bg-emerald-50/40 transition-colors text-left"
          @click="store.selectedVocabModal = w"
        >
          <div class="flex-1 min-w-0">
            <span
              :class="['text-xl font-black leading-tight block mb-0.5', getMasteryIcon(w.score).color]"
              :title="getMasteryIcon(w.score).title"
            >{{ w.word.split('/')[0] }}</span>
            <span class="text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full tracking-wide">{{ w.romaji.split('/')[0] }}</span>
            <div class="mt-1">
              <span class="text-sm font-semibold text-slate-600">{{ w.meaning }}</span>
              <span v-if="w.tone && w.tone !== 'Neutro'" class="text-xs text-slate-400 ml-1">({{ w.tone.toLowerCase() }})</span>
            </div>
          </div>
        </button>
      </div>
    </div>

  </div>
</template>
