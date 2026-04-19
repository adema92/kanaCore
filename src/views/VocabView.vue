<script setup>
import { computed, onActivated, onMounted, ref } from 'vue'
import { BookOpen, Languages } from 'lucide-vue-next'
import { useAppStore, vocabCategoryLabelForScript } from '../stores/appStore'

const store = useAppStore()

const homeScriptFilter = ref('capitoli')

const resetScriptFilter = () => {
  homeScriptFilter.value = 'capitoli'
}

onMounted(resetScriptFilter)
onActivated(resetScriptFilter)

const filteredVocabData = computed(() =>
  store.filterVocabByScript(store.vocabData, homeScriptFilter.value)
)

const vocabByCategory = computed(() => {
  return filteredVocabData.value.reduce((acc, curr) => {
    if (!acc[curr.category]) acc[curr.category] = []
    acc[curr.category].push(curr)
    return acc
  }, {})
})

const orderedCategoryEntries = computed(() => {
  const orderedNames = store.orderVocabCategories(Object.keys(vocabByCategory.value))
  return orderedNames.map((name) => [name, vocabByCategory.value[name]])
})

// Accordion: categorie chiuse di default.
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

// Conteggio parole per livello (padronanza) e categoria.
function catStats(words) {
  const padronanza = words.filter(w => w.score >= 80).length
  const inCorso    = words.filter(w => w.score >= 40 && w.score < 80).length
  const daStud     = words.filter(w => w.score < 40).length
  return { padronanza, inCorso, daStud, total: words.length }
}
</script>

<template>
  <div class="w-full px-4 space-y-4 pb-6 vocab-view">

    <!-- Header Vocabolario -->
    <div class="vocab-header p-6 rounded-3xl text-white shadow-lg text-center w-full relative overflow-hidden">
      <div class="absolute -top-3 -right-3 opacity-10 text-[80px] leading-none">📗</div>
      <img
        src="/vocaboli-logo.png"
        alt="Vocabolario"
        class="mx-auto object-contain drop-shadow-sm w-[190px] h-[190px]"
      />
      <h1 class="text-2xl font-black mb-0.5 uppercase tracking-tight">Vocabolario</h1>
      <p class="text-white/90 text-xs font-semibold mb-5 opacity-90 uppercase tracking-widest">
        {{ filteredVocabData.length }} parole
      </p>
      <div class="flex gap-3 mb-2">
        <button
          class="flex-1 bg-white/25 backdrop-blur text-white font-black py-3.5 rounded-2xl text-xs shadow-md active:scale-95 transition-all uppercase tracking-widest border border-white/50 flex flex-col items-center gap-0.5"
          @click="store.handleStartQuizClick('vocab-romaji')"
        >
          <Languages
            :size="22"
            class="lucide lucide-languages-icon shrink-0 text-white mb-1 drop-shadow-sm"
          />
          <span>Traduci</span>
        </button>
        <button
          class="flex-1 bg-white/25 backdrop-blur text-white font-black py-3.5 rounded-2xl text-xs shadow-md active:scale-95 transition-all uppercase tracking-widest border border-white/50 flex flex-col items-center gap-0.5"
          @click="store.handleStartQuizClick('vocab-kana-to-romaji')"
        >
          <BookOpen :size="22" class="shrink-0 text-white mb-1" />
          <span>Quiz Parole</span>
        </button>
      </div>
    </div>

    <div class="vocab-script-nav rounded-3xl p-1">
      <div class="flex p-1 rounded-2xl gap-1">
        <button
          type="button"
          :class="[
            'flex-1 py-2 text-[11px] font-black rounded-xl transition-all uppercase tracking-wider border border-solid',
            homeScriptFilter === 'capitoli'
              ? 'bg-white text-amber-600 border-amber-400'
              : 'text-slate-500 border-transparent bg-transparent',
          ]"
          @click="homeScriptFilter = 'capitoli'"
        >Capitoli</button>
        <button
          type="button"
          :class="[
            'flex-1 py-2 text-[11px] font-black rounded-xl transition-all uppercase tracking-wider border border-solid',
            homeScriptFilter === 'hiragana'
              ? 'bg-white text-amber-600 border-amber-400'
              : 'text-slate-500 border-transparent bg-transparent',
          ]"
          @click="homeScriptFilter = 'hiragana'"
        >Hiragana</button>
        <button
          type="button"
          :class="[
            'flex-1 py-2 text-[11px] font-black rounded-xl transition-all uppercase tracking-wider border border-solid',
            homeScriptFilter === 'katakana'
              ? 'bg-white text-amber-600 border-amber-400'
              : 'text-slate-500 border-transparent bg-transparent',
          ]"
          @click="homeScriptFilter = 'katakana'"
        >Katakana</button>
      </div>
    </div>

    <!-- Accordion per categoria -->
    <div
      v-for="[cat, words] in orderedCategoryEntries"
      :key="cat"
      class="vocab-section rounded-3xl shadow-sm overflow-hidden"
    >
      <!-- Header accordion (sempre visibile) -->
      <button
        type="button"
        class="w-full px-5 py-4 flex items-center justify-between vocab-section-header transition-colors"
        @click="toggleCategory(cat)"
      >
        <div class="flex items-center gap-3 min-w-0">
          <div class="text-left min-w-0">
            <p class="font-black text-slate-500 uppercase text-sm tracking-wide leading-tight">{{ vocabCategoryLabelForScript(cat, homeScriptFilter) }}</p>
            <p class="text-[11px] text-slate-400 font-semibold mt-0.5">{{ words.length }} parole</p>
          </div>
        </div>
        <!-- Mini barre mastery + chevron -->
        <div class="flex items-center gap-3 shrink-0">
          <!-- Pill: verde / arancio / rosso -->
          <div class="flex gap-1 items-center">
            <span class="text-[10px] font-black text-emerald-600">{{ catStats(words).padronanza }}</span>
            <div class="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
            <span class="text-[10px] font-black text-amber-600">{{ catStats(words).inCorso }}</span>
            <div class="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
            <span class="text-[10px] font-black text-rose-700">{{ catStats(words).daStud }}</span>
            <div class="w-1.5 h-1.5 rounded-full bg-rose-400"></div>
          </div>
          <!-- Chevron -->
          <span
            class="text-slate-400 font-black text-lg transition-transform duration-200"
            :class="openCategories.has(cat) ? 'rotate-180' : ''"
          >⌄</span>
        </div>
      </button>

      <!-- Lista parole (collassabile) -->
      <div v-show="openCategories.has(cat)" class="border-t border-[var(--vocab-light)]/60">
        <button
          v-for="w in words"
          :key="w.id"
          type="button"
          class="w-full px-4 py-3 border-b border-[var(--vocab-light)]/40 last:border-b-0 flex items-center gap-3 vocab-row transition-colors text-left"
          @click="store.selectedVocabModal = w"
        >
          <div class="flex-1 min-w-0">
            <span
              :class="['text-xl font-black leading-tight block mb-0.5', getMasteryIcon(w.score).color]"
              :title="getMasteryIcon(w.score).title"
            >{{ w.word.split('/')[0] }}</span>
            <span class="vocab-romaji-badge">{{ w.romaji.split('/')[0] }}</span>
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

<style scoped>
.vocab-view {
  background: transparent;
  min-height: 100%;
}

.vocab-header {
  background: var(--vocab-gradient);
  color: #fff;
}

.vocab-section {
  background: var(--vocab-bg);
  border: 1px solid rgba(255, 201, 158, 0.4);
}

.vocab-script-nav {
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(255, 201, 158, 0.45);
}

.vocab-section-header {
  background: linear-gradient(180deg, rgba(255, 248, 242, 0.98) 0%, rgba(255, 234, 217, 0.6) 100%);
}
.vocab-section-header:active {
  background: rgba(255, 201, 158, 0.2);
}

.vocab-row:active {
  background: rgba(255, 201, 158, 0.25);
}

.vocab-romaji-badge {
  font-size: 11px;
  font-weight: 700;
  color: var(--vocab-darker);
  background: var(--vocab-lighter);
  border: 1px solid var(--vocab-light);
  padding: 2px 8px;
  border-radius: 9999px;
  display: inline-block;
  letter-spacing: 0.025em;
}
</style>
