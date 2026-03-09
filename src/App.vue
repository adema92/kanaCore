<script setup>
import { computed, onMounted, ref, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  BarChart2, BookOpen, Brain, X, Volume2,
  Info, AlertTriangle, CheckSquare, Eraser, Save,
} from 'lucide-vue-next'
import { useAppStore, BASE_PRESETS, INITIAL_KANA, INITIAL_VOCAB } from './stores/appStore'
import NavItem from './components/ui/NavItem.vue'
import StrokeOrderSvg from './components/features/StrokeOrderSvg.vue'

const store = useAppStore()
const route = useRoute()
const router = useRouter()

const isKanaQuiz = computed(() => store.quizType === 'kana')

const currentQuestion = computed(() =>
  store.quizQueue.length && store.currentQuestionIndex < store.quizQueue.length
    ? store.quizQueue[store.currentQuestionIndex]
    : null
)

const quizModeLabel = computed(() => {
  const type = store.quizType
  const dir = store.quizDirection
  if (type === 'vocab-kana-read' || type === 'vocab-romaji-input') return '👁 Leggi i kana → scrivi romaji'
  if (type === 'vocab-romaji') return '🗣️ Significato → scrivi il romaji'
  if (type === 'kana') return dir === 'ja-to-romaji' ? '👁 Kana → Lettura' : '👁 Lettura → Kana'
  if (type === 'vocab') return dir === 'ja-to-romaji' ? '👁 Parola → Significato' : '👁 Romaji → Parola'
  return 'Quiz'
})

const questionText = computed(() => {
  if (!currentQuestion.value) return ''
  if (store.quizType === 'vocab-kana-read' || store.quizType === 'vocab-romaji-input') return currentQuestion.value.meaning
  if (store.quizType === 'vocab-romaji') return currentQuestion.value.meaning
  if (store.quizDirection === 'ja-to-romaji')
    return isKanaQuiz.value ? currentQuestion.value.character : currentQuestion.value.word
  return currentQuestion.value.romaji.split('/')[0]
})

// Per vocab-romaji: titolo fisso + sottotitolo con tono
const vocabRomajiSubtitle = computed(() => {
  if (store.quizType !== 'vocab-romaji' || !currentQuestion.value) return null
  return currentQuestion.value.tone
    ? `in modo ${currentQuestion.value.tone.toLowerCase()}`
    : 'in romaji'
})

const finalInputClass = computed(() => {
  const base = 'w-full p-5 rounded-2xl border-4 text-center font-black text-2xl focus:outline-none transition-all duration-150 '
  if (!store.isAnswered) return base + 'border-slate-100 focus:border-pink-300 bg-white shadow-lg'
  const userText = store.manualInput.trim().toLowerCase()
  const q = currentQuestion.value
  let correctText = ''
  if (store.quizType === 'kana') {
    correctText = store.quizDirection === 'ja-to-romaji'
      ? (q?.romaji?.split('/')[0]?.trim()?.toLowerCase() || '')
      : (q?.character?.trim() || '')
  } else if (store.quizType === 'vocab') {
    correctText = store.quizDirection === 'ja-to-romaji'
      ? (q?.meaning?.trim()?.toLowerCase() || '')
      : (q?.word?.split('/')[0]?.trim()?.toLowerCase() || '')
  } else if (store.quizType === 'vocab-romaji') {
    correctText = q?.romaji?.split('/')[0]?.trim()?.toLowerCase() || ''
  } else {
    correctText = q?.romaji?.split('/')[0]?.trim()?.toLowerCase() || ''
  }
  const correct = userText === correctText.toLowerCase()
  return base + (correct
    ? 'border-emerald-400 bg-emerald-50 text-emerald-600'
    : 'border-rose-400 bg-rose-50 text-rose-600 shadow-lg')
})

const selectedKanaModalLive = computed(() => {
  if (!store.selectedKanaModal) return null
  const live = store.kanaData.find(k => k.id === store.selectedKanaModal.id)
  return live || store.selectedKanaModal
})

const selectedVocabModalLive = computed(() => {
  if (!store.selectedVocabModal) return null
  const live = store.vocabData.find(v => v.id === store.selectedVocabModal.id)
  return live || store.selectedVocabModal
})

// Tag tono/registro per il vocabolario
const toneConfig = {
  'Formale':   { emoji: '🎩', bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100' },
  'Informale': { emoji: '😊', bg: 'bg-amber-50',  text: 'text-amber-600',  border: 'border-amber-100' },
  'Neutro':    { emoji: '✨', bg: 'bg-slate-50',   text: 'text-slate-500',  border: 'border-slate-100' },
}
function getToneConfig(tone) {
  return toneConfig[tone] || toneConfig['Neutro']
}

function getOptionLabel(opt) {
  if (store.quizType === 'vocab-romaji') return opt.romaji.split('/')[0]
  if (store.quizDirection === 'ja-to-romaji')
    return store.quizType === 'kana' ? opt.romaji : opt.meaning
  return store.quizType === 'kana' ? opt.character : opt.word.split('/')[0]
}

function getOptionTone(opt) {
  if (store.quizType !== 'vocab-romaji' && store.quizType !== 'vocab') return null
  return opt.tone && opt.tone !== 'Neutro' ? opt.tone : null
}

function getOptionClass(opt) {
  const base = 'w-full py-3 px-3 rounded-2xl border-2 text-center font-black shadow-md transition-all flex flex-col items-center justify-center min-h-[72px] active:scale-95 gap-0.5 overflow-hidden '
  if (!store.isAnswered)
    return base + 'bg-white border-slate-100 text-slate-700 active:bg-slate-50'
  if (opt.id === currentQuestion.value?.id)
    return base + 'bg-emerald-400 border-emerald-500 text-white scale-[1.02]'
  if (store.selectedOption?.id === opt.id)
    return base + 'bg-rose-400 border-rose-500 text-white'
  return base + 'bg-white opacity-30 border-slate-100'
}

function isNavActive(path) {
  return route.path === path
}

const quizScrollRef = ref(null)
const quizCardRef = ref(null)
const manualInputRef = ref(null)

async function onInputFocus() {
  await nextTick()
  setTimeout(() => {
    if (quizCardRef.value && quizScrollRef.value) {
      quizCardRef.value.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, 350)
}

async function handleManualSubmitEvent(e) {
  e.preventDefault()
  store.handleManualSubmit()
  // Rifocussa dopo che _advanceQuiz resetta isAnswered e carica la domanda successiva (~600ms per corretto)
  setTimeout(async () => {
    await nextTick()
    if (manualInputRef.value) {
      manualInputRef.value.focus()
    }
  }, 680)
}

function resetKana() {
  store.confirmModal = {
    title: 'Reset Kana',
    text: 'Vuoi azzerare i progressi dei Kana?',
    onConfirm: () => {
      store.kanaData = INITIAL_KANA.map((k) => ({ ...k, score: 0, attempts: 0 }))
      store.sync()
      store.confirmModal = null
    },
  }
}

function resetVocab() {
  store.confirmModal = {
    title: 'Reset Parole',
    text: 'Vuoi azzerare i progressi delle Parole?',
    onConfirm: () => {
      store.vocabData = INITIAL_VOCAB.map((v) => ({ ...v, score: 0, attempts: 0 }))
      store.sync()
      store.confirmModal = null
    },
  }
}

const romajiBlockInputRef = ref(null)

async function submitRomajiBlock() {
  store.confirmRomajiBlock()
  await nextTick()
  setTimeout(async () => {
    await nextTick()
    if (romajiBlockInputRef.value) {
      romajiBlockInputRef.value.focus()
    }
  }, 350)
}

const mainScrollRef = ref(null)

function scrollToTop() {
  nextTick(() => {
    if (mainScrollRef.value) mainScrollRef.value.scrollTop = 0
    window.scrollTo({ top: 0 })
  })
}

// Scroll in cima quando il quiz finisce
watch(() => store.quizActive, (active) => {
  if (!active) scrollToTop()
})

// Scroll in cima ad ogni cambio di pagina
watch(() => route.path, () => {
  scrollToTop()
})

onMounted(() => {
  store.init()
})
</script>

<template>
  <!-- overflow-hidden sul root impedisce lo scroll del body quando una modale è aperta -->
  <div class="min-h-screen bg-[#fff0f5] font-sans text-slate-800 flex flex-col items-center overflow-x-hidden">

    <!-- LOADING SCREEN -->
    <template v-if="!store.isCloudLoaded">
      <div class="min-h-screen bg-[#fff0f5] flex items-center justify-center flex-col gap-5 px-6">
        <div class="text-6xl animate-bounce">🌸</div>
        <p class="text-pink-400 font-black text-base uppercase tracking-widest">
          Caricamento...
        </p>
      </div>
    </template>

    <template v-else>

      <!-- ===== SCHERMATA SELEZIONE PROFILO ===== -->
      <template v-if="store.profileSelectOpen">
        <div class="min-h-screen w-full flex flex-col items-center justify-center px-6 bg-gradient-to-br from-pink-50 via-rose-50 to-purple-50 relative overflow-hidden">
          <!-- Decorazioni sfondo -->
          <div class="absolute top-8 left-6 text-6xl opacity-10 select-none animate-spin" style="animation-duration:18s">🌸</div>
          <div class="absolute top-20 right-4 text-5xl opacity-10 select-none animate-spin" style="animation-duration:22s;animation-direction:reverse">✨</div>
          <div class="absolute bottom-24 left-8 text-5xl opacity-10 select-none animate-bounce" style="animation-duration:3s">🌺</div>
          <div class="absolute bottom-16 right-10 text-4xl opacity-10 select-none animate-bounce" style="animation-duration:4s">🎋</div>
          <div class="absolute top-1/2 left-2 text-3xl opacity-5 select-none">あ</div>
          <div class="absolute top-1/3 right-2 text-3xl opacity-5 select-none">い</div>

          <!-- Logo / titolo -->
          <div class="text-center mb-10 z-10">
            <div class="text-7xl mb-3">🎌</div>
            <h1 class="text-3xl font-black text-slate-700 tracking-tight leading-tight">Hiragana<span class="text-pink-400">Study</span></h1>
            <p class="text-slate-400 text-sm font-semibold mt-1 tracking-widest uppercase">日本語 練習</p>
            <div class="flex justify-center gap-1 mt-3 text-xl">
              <span>🌸</span><span>🌸</span><span>🌸</span>
            </div>
          </div>

          <!-- Card selezione -->
          <div class="bg-white/80 backdrop-blur-sm rounded-[2.5rem] shadow-2xl border border-pink-100 px-8 py-8 w-full max-w-xs z-10">
            <p class="text-center text-[11px] font-black text-pink-300 uppercase tracking-[0.3em] mb-6">
              👤 Chi sei?
            </p>

            <!-- Bottone Andrea -->
            <button
              class="w-full mb-4 rounded-3xl border-4 border-indigo-100 bg-gradient-to-br from-indigo-50 to-blue-50 px-6 py-6 flex flex-col items-center gap-2 active:scale-95 transition-all shadow-md hover:shadow-lg hover:border-indigo-300 group"
              @click="store.selectProfile('andrea')"
            >
              <span class="text-5xl group-active:scale-110 transition-transform">🧑‍💻</span>
              <span class="text-xl font-black text-indigo-600 tracking-wide">Andrea</span>
              <span class="text-xs font-semibold text-indigo-300 uppercase tracking-widest">Il mio profilo</span>
            </button>

            <!-- Bottone Erica -->
            <button
              class="w-full rounded-3xl border-4 border-pink-100 bg-gradient-to-br from-pink-50 to-rose-50 px-6 py-6 flex flex-col items-center gap-2 active:scale-95 transition-all shadow-md hover:shadow-lg hover:border-pink-300 group"
              @click="store.selectProfile('erica')"
            >
              <span class="text-5xl group-active:scale-110 transition-transform">👩‍🎨</span>
              <span class="text-xl font-black text-pink-500 tracking-wide">Erica</span>
              <span class="text-xs font-semibold text-pink-300 uppercase tracking-widest">Il mio profilo</span>
            </button>
          </div>

          <p class="text-slate-300 text-xs font-semibold mt-8 z-10">I progressi vengono salvati separatamente 🌟</p>
        </div>
      </template>

      <!-- ===== APP PRINCIPALE ===== -->
      <template v-else>

      <!-- ===== MODAL SELEZIONE KANA ===== -->
      <div
        v-if="store.quizSetupModalOpen"
        class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center overflow-hidden"
        style="touch-action:none;"
        @click.self="store.quizSetupModalOpen = false"
      >
        <div class="bg-white w-full max-w-xl rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col h-[97dvh] sm:max-h-[97dvh]">
          <!-- Handle bar + header -->
          <div class="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
            <div class="w-10 h-1 bg-slate-200 rounded-full"></div>
          </div>
          <div class="flex justify-between items-center px-6 pt-4 pb-3 shrink-0">
            <div class="flex items-center gap-2">
              <span class="text-2xl">🎯</span>
              <h3 class="text-lg font-black text-slate-700 uppercase tracking-widest">Selezione Kana</h3>
            </div>
            <button
              class="bg-slate-100 p-2.5 rounded-full text-slate-500 active:bg-rose-50 active:text-rose-500 transition-all"
              @click="store.quizSetupModalOpen = false"
            >
              <X :size="18" />
            </button>
          </div>

          <div class="overflow-y-auto flex-1 px-6 space-y-5 pb-2">
            <!-- Preset rapidi -->
            <div>
              <p class="text-[11px] font-black text-slate-300 uppercase tracking-[0.3em] mb-3">✨ Preset rapidi</p>
              <div class="flex flex-wrap gap-2 mb-4">
                <button
                  v-for="p in BASE_PRESETS"
                  :key="p.id"
                  class="px-5 py-2.5 bg-pink-50 text-pink-600 font-black rounded-xl uppercase text-xs border-2 border-pink-100 active:bg-pink-100 transition-all"
                  @click="store.selectedKanaIds = [...p.kanaIds]"
                >{{ p.name }}</button>
                <div
                  v-for="p in store.kanaPresets"
                  :key="p.id"
                  class="flex items-center bg-pink-50 border-2 border-pink-100 rounded-xl overflow-hidden"
                >
                  <button
                    class="px-4 py-2.5 text-pink-600 font-black uppercase text-xs active:bg-pink-100"
                    @click="store.selectedKanaIds = [...p.kanaIds]"
                  >{{ p.name }}</button>
                  <button
                    class="px-3 text-pink-300 border-l-2 border-pink-100 h-full py-2.5"
                    @click="() => {
                      store.kanaPresets = store.kanaPresets.filter(x => x.id !== p.id)
                      store.sync()
                    }"
                  ><X :size="13" /></button>
                </div>
              </div>
              <!-- Nuovo preset: input + Salva + icona svuota + icona seleziona tutto -->
              <div class="flex gap-1.5 items-center">
                <input
                  type="text"
                  placeholder="Nuovo preset..."
                  :value="store.newPresetName"
                  class="flex-1 border-2 border-slate-100 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-pink-200 bg-slate-50 min-w-0"
                  @input="store.newPresetName = $event.target.value"
                />
                <button
                  class="bg-pink-400 text-white px-4 py-2.5 rounded-xl font-black uppercase text-xs tracking-widest active:scale-95 active:bg-pink-500 transition-all shrink-0"
                  @click="() => {
                    if (!store.newPresetName.trim() || store.selectedKanaIds.length === 0) return
                    store.kanaPresets = [...store.kanaPresets, { id: 'p' + Date.now(), name: store.newPresetName, kanaIds: [...store.selectedKanaIds] }]
                    store.sync()
                    store.newPresetName = ''
                  }"
                >Salva</button>
                <!-- Seleziona tutto -->
                <button
                  title="Seleziona tutti"
                  class="p-2.5 rounded-xl bg-pink-50 text-pink-400 active:bg-pink-100 transition-all shrink-0"
                  @click="store.selectedKanaIds = store.kanaData.map(k => k.id)"
                ><CheckSquare :size="18" /></button>
                <!-- Svuota selezione -->
                <button
                  title="Svuota selezione"
                  class="p-2.5 rounded-xl bg-rose-50 text-rose-400 active:bg-rose-100 transition-all shrink-0"
                  @click="store.selectedKanaIds = []"
                ><Eraser :size="18" /></button>
              </div>
            </div>

            <!-- Griglia kana selezionabili -->
            <div class="grid grid-cols-8 gap-2 pb-2">
              <button
                v-for="k in store.kanaData"
                :key="k.id"
                :class="[
                  'aspect-square rounded-xl flex items-center justify-center text-lg font-black border-2 transition-all active:scale-90',
                  store.selectedKanaIds.includes(k.id)
                    ? 'bg-pink-400 border-pink-400 text-white shadow-md'
                    : 'bg-white border-slate-100 text-slate-300'
                ]"
                @click="() => {
                  if (store.selectedKanaIds.includes(k.id))
                    store.selectedKanaIds = store.selectedKanaIds.filter(id => id !== k.id)
                  else
                    store.selectedKanaIds = [...store.selectedKanaIds, k.id]
                }"
              >{{ k.character }}</button>
            </div>
          </div>

          <div class="px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] shrink-0 border-t border-slate-50">
            <button
              class="w-full bg-pink-400 text-white font-black py-5 rounded-2xl shadow-xl uppercase tracking-widest active:scale-95 active:bg-pink-500 transition-all text-base"
              @click="store.proceedFromSetup()"
            >Continua →</button>
          </div>
        </div>
      </div>

      <!-- ===== QUIZ ATTIVO ===== -->
      <div
        v-if="store.quizActive"
        class="fixed inset-0 bg-[#fff0f5] z-[300] flex flex-col"
        style="height: 100dvh;"
      >
        <!-- Header quiz -->
        <div class="shrink-0 flex items-center gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 bg-white border-b border-pink-50">
          <button
            class="p-3 bg-slate-50 rounded-full text-slate-400 active:bg-rose-50 active:text-rose-500 transition-all shrink-0"
            @click="store.endQuiz()"
          ><X :size="22" /></button>
          <div class="flex-1 min-w-0">
            <p class="text-[11px] font-black text-pink-300 uppercase tracking-[0.3em] truncate">{{ quizModeLabel }}</p>
            <div class="flex items-center gap-2 mt-1">
              <div class="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  :class="['h-full transition-all duration-300', isKanaQuiz ? 'bg-pink-400' : 'bg-emerald-500']"
                  :style="{ width: `${(store.currentQuestionIndex / store.quizQueue.length) * 100}%` }"
                ></div>
              </div>
              <span class="text-xs font-black text-slate-400 shrink-0">
                {{ store.currentQuestionIndex + 1 }}/{{ store.quizQueue.length }}
              </span>
            </div>
          </div>
        </div>

        <!-- ===== QUIZ VOCAB-KANA-READ: leggi il kana, scrivi il romaji ===== -->
        <div
          v-if="store.quizType === 'vocab-kana-read' || store.quizType === 'vocab-romaji-input'"
          ref="quizScrollRef"
          class="flex-1 overflow-y-auto overscroll-contain px-4 py-5 flex flex-col items-center gap-5"
        >
          <!-- Card: mostra il significato → l'utente deve leggere i kana della parola -->
          <div
            ref="quizCardRef"
            class="bg-white rounded-3xl shadow-lg border border-emerald-100 flex flex-col items-center w-full max-w-sm px-6 py-5 shrink-0"
          >
            <p class="text-[11px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-3">🌿 Come si scrive in kana?</p>
            <!-- Significato grande -->
            <p class="text-4xl font-black text-slate-700 text-center leading-tight">{{ questionText }}</p>
            <!-- Parola in kana in piccolo sotto, sempre visibile come riferimento -->
            <div class="mt-3 flex items-center gap-2">
              <p class="text-2xl font-black text-emerald-600 tracking-widest leading-none">{{ currentQuestion?.word?.split('/')[0] }}</p>
              <button
                class="text-emerald-200 active:text-emerald-500 transition-all p-1"
                @click="store.speakText(currentQuestion?.word)"
              ><Volume2 :size="20" /></button>
            </div>
            <p class="text-slate-300 text-xs font-semibold mt-2">Leggi ogni kana e scrivi il romaji nei blocchi</p>
          </div>

          <!-- Blocchi kana con progress -->
          <div class="w-full max-w-sm flex flex-col gap-4">

            <!-- Riga di blocchi: ogni kana della parola -->
            <div class="flex flex-wrap justify-center gap-3">
              <div
                v-for="(block, i) in store.vocabRomajiBlocks"
                :key="i"
                :class="[
                  'flex flex-col items-center rounded-2xl border-2 px-4 py-3 min-w-[64px] transition-all duration-200',
                  block.state === 'ok'    ? 'bg-emerald-50 border-emerald-300 shadow-sm' :
                  block.state === 'wrong' ? 'bg-rose-50 border-rose-300 shadow-sm' :
                  i === store.vocabRomajiCurrentIdx ? 'bg-emerald-50 border-emerald-500 shadow-lg scale-110 ring-2 ring-emerald-300' :
                  i < store.vocabRomajiCurrentIdx  ? 'bg-slate-50 border-slate-200 opacity-60' :
                  'bg-white border-slate-100 opacity-40'
                ]"
              >
                <!-- Kana sempre visibile -->
                <span
                  :class="[
                    'text-4xl font-black leading-none',
                    block.state === 'ok'    ? 'text-emerald-500' :
                    block.state === 'wrong' ? 'text-rose-400' :
                    i === store.vocabRomajiCurrentIdx ? 'text-emerald-700' :
                    'text-slate-400'
                  ]"
                >{{ block.kana }}</span>
                <!-- Sotto il kana: romaji inserito / corretto / punto interrogativo -->
                <span v-if="block.state === 'ok'" class="text-[12px] font-black text-emerald-500 mt-1">{{ block.romaji }}</span>
                <span v-else-if="block.state === 'wrong'" class="text-[11px] font-black text-rose-400 mt-1">
                  <span class="line-through">{{ block.userInput }}</span>
                  <span class="block text-emerald-500 no-underline">{{ block.romaji }}</span>
                </span>
                <span v-else-if="i === store.vocabRomajiCurrentIdx" class="text-[13px] font-black text-emerald-500 mt-1 animate-pulse">?</span>
                <span v-else class="text-[13px] font-black text-slate-300 mt-1">·</span>
              </div>
            </div>

            <!-- Form input per il blocco corrente -->
            <form
              v-if="store.vocabRomajiCurrentIdx < store.vocabRomajiBlocks.length"
              class="flex flex-col gap-3"
              @submit.prevent="submitRomajiBlock()"
            >
              <!-- Box con il kana da leggere ben visibile -->
              <div class="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4 text-center">
                <p class="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-1">
                  {{ store.vocabRomajiCurrentIdx + 1 }} / {{ store.vocabRomajiBlocks.length }} — come si legge?
                </p>
                <div class="text-8xl font-black text-emerald-700 leading-none my-1">
                  {{ store.vocabRomajiBlocks[store.vocabRomajiCurrentIdx]?.kana }}
                </div>
                <p class="text-xs text-emerald-400 font-semibold">Scrivi il romaji ↓</p>
              </div>
              <input
                ref="romajiBlockInputRef"
                type="text"
                :value="store.vocabRomajiBlockInput"
                autocomplete="off"
                autocorrect="off"
                autocapitalize="off"
                spellcheck="false"
                enterkeyhint="done"
                placeholder="es: a, i, ka, shi..."
                class="w-full p-5 rounded-2xl border-4 border-emerald-100 focus:border-emerald-400 bg-white text-center font-black text-2xl shadow-lg focus:outline-none transition-all"
                @input="store.vocabRomajiBlockInput = $event.target.value"
                @focus="onInputFocus"
              />
              <button
                type="submit"
                :disabled="!store.vocabRomajiBlockInput.trim()"
                class="w-full bg-emerald-500 text-white font-black py-5 rounded-2xl uppercase shadow-xl tracking-widest active:scale-95 active:bg-emerald-600 text-base disabled:opacity-40 transition-all"
              >Conferma →</button>
            </form>

            <div v-else class="text-center py-6">
              <p class="text-3xl font-black text-emerald-500">🌸 Parola completata!</p>
            </div>
          </div>

          <div class="h-8 shrink-0"></div>
        </div>

        <!-- ===== QUIZ STANDARD ===== -->
        <div
          v-else
          ref="quizScrollRef"
          class="flex-1 overflow-y-auto overscroll-contain px-4 py-5 flex flex-col items-center gap-5"
        >
          <div
            ref="quizCardRef"
            class="bg-white rounded-3xl shadow-lg border border-pink-100 flex flex-col items-center w-full max-w-sm px-6 py-5 shrink-0"
          >
            <!-- Layout vocab-romaji: titolo + parola grande + sottotitolo tono -->
            <template v-if="store.quizType === 'vocab-romaji'">
              <p class="text-[11px] font-black text-blue-300 uppercase tracking-[0.3em] mb-3">🗣️ Come si legge?</p>
              <p :class="[
                'font-black text-slate-700 text-center leading-tight break-words w-full',
                questionText.length > 20 ? 'text-2xl' : questionText.length > 12 ? 'text-[2.2rem]' : 'text-[3rem]'
              ]">{{ questionText }}</p>
              <p class="text-sm font-semibold text-slate-400 mt-2 text-center italic">{{ vocabRomajiSubtitle }}</p>
              <button
                class="text-slate-200 active:text-blue-400 transition-all p-3 mt-1"
                @click="store.speakText(currentQuestion?.word)"
              ><Volume2 :size="28" /></button>
            </template>
            <!-- Layout standard: kana / parola -->
            <template v-else>
              <p class="text-[11px] font-black text-pink-300 uppercase tracking-[0.3em] mb-2">
                {{ store.quizDirection === 'ja-to-romaji' ? (isKanaQuiz ? '👁 Kana' : '👁 Parola') : '👁 Lettura' }}
              </p>
              <div
                :class="[
                  'font-black text-slate-700 text-center leading-tight break-words w-full',
                  store.quizDifficulty === 'difficile' ? 'text-4xl' : 'text-[4.5rem]'
                ]"
              >{{ questionText }}</div>
              <button
                class="text-slate-200 active:text-pink-400 transition-all p-3 mt-1"
                @click="store.speakText(isKanaQuiz ? currentQuestion?.character : currentQuestion?.word)"
              ><Volume2 :size="28" /></button>
            </template>
          </div>

          <!-- Input difficile -->
          <form
            v-if="store.quizDifficulty === 'difficile'"
            class="w-full max-w-sm flex flex-col gap-3"
            @submit="handleManualSubmitEvent"
          >
            <input
              ref="manualInputRef"
              type="text"
              :value="store.manualInput"
              :disabled="store.isAnswered"
              autocomplete="off"
              autocorrect="off"
              autocapitalize="off"
              spellcheck="false"
              enterkeyhint="done"
              :placeholder="store.quizType === 'kana'
                ? (store.quizDirection === 'ja-to-romaji' ? 'es: a, ka, shi...' : 'Scrivi il kana...')
                : store.quizType === 'vocab-romaji'
                  ? 'es: ohayō, arigatō...'
                  : (store.quizDirection === 'ja-to-romaji' ? 'Scrivi il significato...' : 'Scrivi la parola in kana...')"
              :class="finalInputClass"
              @input="store.manualInput = $event.target.value"
              @focus="onInputFocus"
            />
            <button
              type="submit"
              :disabled="store.isAnswered || !store.manualInput.trim()"
              class="w-full bg-pink-400 text-white font-black py-5 rounded-2xl uppercase shadow-xl tracking-widest active:scale-95 active:bg-pink-500 text-base disabled:opacity-40"
            >Conferma</button>
          </form>

          <!-- Scelta multipla -->
          <div
            v-else
            class="w-full max-w-sm grid grid-cols-2 gap-3"
          >
            <button
              v-for="(opt, i) in store.options"
              :key="i"
              :disabled="store.isAnswered"
              :class="getOptionClass(opt)"
              @click="store.handleAnswer(opt)"
            >
              <span :class="[
                'font-black leading-tight w-full text-center break-words line-clamp-2',
                getOptionLabel(opt).length > 12 ? 'text-sm' : getOptionLabel(opt).length > 8 ? 'text-base' : 'text-xl'
              ]">{{ getOptionLabel(opt) }}</span>
              <span v-if="getOptionTone(opt)" class="text-[10px] font-semibold opacity-70 leading-none">{{ getOptionTone(opt) === 'Informale' ? '😊' : '🎩' }} {{ getOptionTone(opt) }}</span>
            </button>
          </div>

          <div class="h-8 shrink-0"></div>
        </div>
      </div>

      <!-- ===== MODAL SELEZIONE CATEGORIE VOCAB ===== -->
      <div
        v-if="store.vocabSetupModalOpen"
        class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center overflow-hidden"
        style="touch-action:none;"
        @click.self="store.vocabSetupModalOpen = false"
      >
        <div class="bg-white w-full max-w-xl rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col max-h-[80dvh]">
          <div class="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
            <div class="w-10 h-1 bg-slate-200 rounded-full"></div>
          </div>
          <div class="flex justify-between items-center px-6 pt-4 pb-3 shrink-0">
            <div class="flex items-center gap-2">
              <span class="text-2xl">📚</span>
              <h3 class="text-lg font-black text-slate-700 uppercase tracking-widest">Categorie</h3>
            </div>
            <button
              class="bg-slate-100 p-2.5 rounded-full text-slate-500 active:bg-rose-50 active:text-rose-500 transition-all"
              @click="store.vocabSetupModalOpen = false"
            ><X :size="18" /></button>
          </div>

          <!-- Lista categorie -->
          <div class="flex-1 overflow-y-auto px-6 pb-4 space-y-2">
            <p class="text-xs font-semibold text-slate-400 mb-3">Seleziona le categorie da includere nel quiz</p>
            <button
              v-for="cat in [...new Set(store.vocabData.map(v => v.category))]"
              :key="cat"
              class="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border-2 transition-all active:scale-95 font-black text-sm uppercase tracking-wide"
              :class="store.selectedVocabCategories.includes(cat)
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-slate-50 border-slate-100 text-slate-400'"
              @click="store.selectedVocabCategories.includes(cat)
                ? store.selectedVocabCategories = store.selectedVocabCategories.filter(c => c !== cat)
                : store.selectedVocabCategories = [...store.selectedVocabCategories, cat]"
            >
              <div class="flex items-center gap-3">
                <span class="text-xl">{{ store.selectedVocabCategories.includes(cat) ? '✅' : '⬜' }}</span>
                <div class="text-left">
                  <div>{{ cat }}</div>
                  <div class="text-[10px] font-semibold normal-case opacity-60">
                    {{ store.vocabData.filter(v => v.category === cat).length }} parole
                  </div>
                </div>
              </div>
            </button>
          </div>

          <!-- Footer: seleziona tutto + avanti -->
          <div class="px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 border-t border-slate-50 flex gap-3 shrink-0">
            <button
              class="px-4 py-3 rounded-2xl bg-slate-100 text-slate-500 font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
              @click="store.selectedVocabCategories = [...new Set(store.vocabData.map(v => v.category))]"
            >Tutte</button>
            <button
              class="flex-1 py-3 rounded-2xl bg-blue-500 text-white font-black uppercase tracking-widest text-sm active:scale-95 active:bg-blue-600 transition-all shadow-md"
              @click="store.proceedFromVocabSetup()"
            >Avanti →</button>
          </div>
        </div>
      </div>

      <!-- ===== MODAL DIFFICOLTÀ ===== -->
      <div
        v-if="store.difficultyModalOpen"
        class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center"
        @click.self="store.difficultyModalOpen = false"
      >
        <div class="bg-white w-full max-w-xl rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden">
          <div class="flex justify-center pt-3 pb-1 sm:hidden">
            <div class="w-10 h-1 bg-slate-200 rounded-full"></div>
          </div>
          <!-- Header con X -->
          <div class="flex items-start justify-between px-6 pt-5 pb-3">
            <div>
              <h3 class="text-2xl font-black text-slate-800 uppercase flex items-center gap-2">
                <span>🎮</span> Setup Quiz
              </h3>
              <p class="text-slate-400 font-semibold mt-1 text-sm leading-relaxed">
                <template v-if="store.quizType === 'kana' && store.quizDirection === 'ja-to-romaji'">Vedi il <b>kana</b> → indovina la <b>lettura</b></template>
                <template v-else-if="store.quizType === 'kana' && store.quizDirection === 'romaji-to-ja'">Vedi il <b>romaji</b> → indovina il <b>kana</b></template>
                <template v-else-if="store.quizType === 'vocab' && store.quizDirection === 'ja-to-romaji'">Vedi la <b>parola</b> → indovina il <b>significato</b></template>
                <template v-else-if="store.quizType === 'vocab' && store.quizDirection === 'romaji-to-ja'">Vedi il <b>romaji</b> → indovina la <b>parola</b></template>
                <template v-else-if="store.quizType === 'vocab-romaji'">Vedi il <b>significato</b> con il tono → scrivi come si dice in <b>romaji</b></template>
                <template v-else-if="store.quizType === 'vocab-kana-read' || store.quizType === 'vocab-romaji-input'">Vedi il <b>significato</b> → leggi ogni <b>kana</b> della parola e scrivi il suo <b>romaji</b></template>
              </p>
            </div>
            <button
              class="bg-slate-100 p-2.5 rounded-full text-slate-500 active:bg-rose-50 active:text-rose-500 transition-all shrink-0 ml-4 mt-0.5"
              @click="store.difficultyModalOpen = false"
            >
              <X :size="18" />
            </button>
          </div>

          <!-- Toggle direzione (solo per kana e vocab standard) -->
          <div v-if="store.quizType === 'kana' || store.quizType === 'vocab'" class="px-6 pb-4">
            <p class="text-[11px] font-black text-slate-300 uppercase mb-2 tracking-[0.3em]">Direzione</p>
            <div class="flex bg-slate-50 p-1 rounded-2xl gap-1 border border-slate-100">
              <button
                :class="['flex-1 py-3 text-sm font-black rounded-xl transition-all', store.quizDirection === 'ja-to-romaji' ? 'bg-white text-pink-500 shadow-md' : 'text-slate-400']"
                @click="store.quizDirection = 'ja-to-romaji'"
              >🇯🇵 → 🇮🇹</button>
              <button
                :class="['flex-1 py-3 text-sm font-black rounded-xl transition-all', store.quizDirection === 'romaji-to-ja' ? 'bg-white text-pink-500 shadow-md' : 'text-slate-400']"
                @click="store.quizDirection = 'romaji-to-ja'"
              >🇮🇹 → 🇯🇵</button>
            </div>
          </div>

          <!-- Difficoltà -->
          <div v-if="store.quizType !== 'vocab-kana-read' && store.quizType !== 'vocab-romaji-input'" class="px-6 space-y-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <button
              class="w-full py-4 rounded-2xl border-2 border-emerald-100 bg-emerald-50 text-emerald-600 font-black uppercase tracking-widest text-sm active:scale-95 transition-all flex items-center justify-between px-5"
              @click="store.startQuizFinal('facile')"
            >
              <span>🌱 Facile</span>
              <span class="text-xs font-semibold normal-case opacity-70">3 opzioni</span>
            </button>
            <button
              class="w-full py-4 rounded-2xl border-2 border-amber-100 bg-amber-50 text-amber-600 font-black uppercase tracking-widest text-sm active:scale-95 transition-all flex items-center justify-between px-5"
              @click="store.startQuizFinal('medio')"
            >
              <span>🌟 Medio</span>
              <span class="text-xs font-semibold normal-case opacity-70">4 opzioni</span>
            </button>
            <button
              class="w-full py-4 rounded-2xl border-2 border-rose-100 bg-rose-50 text-rose-500 font-black uppercase tracking-widest text-sm active:scale-95 transition-all flex items-center justify-between px-5"
              @click="store.startQuizFinal('difficile')"
            >
              <span>🔥 Difficile</span>
              <span class="text-xs font-semibold normal-case opacity-70">Input libero</span>
            </button>
          </div>

          <div v-else class="px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <button
              class="w-full py-5 rounded-2xl bg-emerald-500 text-white font-black uppercase tracking-widest text-base active:scale-95 active:bg-emerald-600 transition-all shadow-xl"
              @click="store.startQuizFinal('medio')"
            >
              👁 Inizia Quiz →
            </button>
          </div>
        </div>
      </div>

      <!-- ===== MODAL DETTAGLIO KANA ===== -->
      <div
        v-if="selectedKanaModalLive"
        class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center"
        @click.self="store.selectedKanaModal = null"
      >
        <div class="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90dvh]">
          <div class="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
            <div class="w-10 h-1 bg-slate-200 rounded-full"></div>
          </div>
          <!-- Header con X -->
          <div class="flex items-center justify-between px-5 pt-4 pb-2 shrink-0">
            <span class="text-[11px] font-black text-pink-300 uppercase tracking-[0.3em]">🌸 Dettaglio Kana</span>
            <button
              class="bg-slate-100 p-2.5 rounded-full text-slate-500 active:bg-rose-50 active:text-rose-500 transition-all"
              @click="store.selectedKanaModal = null"
            ><X :size="18" /></button>
          </div>
          <div class="flex flex-col items-center px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] gap-5 overflow-y-auto">
            <div class="bg-pink-50 px-10 py-3 rounded-full">
              <h2 class="text-3xl font-black text-pink-400 uppercase tracking-widest">{{ selectedKanaModalLive.romaji }}</h2>
            </div>
            <div class="border-4 border-pink-100 rounded-3xl w-48 h-48 flex items-center justify-center p-6 shadow-inner bg-white">
              <StrokeOrderSvg :character="selectedKanaModalLive.character" />
            </div>
            <!-- Barra progressi mastery -->
            <div class="w-full bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <div class="flex justify-between text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">
                <span>Padronanza</span>
                <span>{{ selectedKanaModalLive.score }}%</span>
              </div>
              <div class="h-3 bg-slate-200 rounded-full overflow-hidden">
                <div
                  :class="[
                    'h-full rounded-full transition-all duration-500',
                    selectedKanaModalLive.score >= 80 ? 'bg-emerald-400' :
                    selectedKanaModalLive.score >= 40 ? 'bg-amber-400' : 'bg-rose-400'
                  ]"
                  :style="{ width: selectedKanaModalLive.score + '%' }"
                ></div>
              </div>
              <div class="flex items-center justify-between mt-1.5">
                <p class="text-[10px] text-slate-300 font-semibold">{{ selectedKanaModalLive.attempts }} tentativi</p>
                <button
                  class="text-[10px] font-black text-rose-400 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-lg uppercase tracking-wide active:bg-rose-100 transition-all"
                  @click="store.resetKanaScore(selectedKanaModalLive.id)"
                >↺ Reset</button>
              </div>
            </div>
            <textarea
              class="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-base outline-none resize-none focus:border-pink-200 transition-all"
              rows="4"
              placeholder="Nota personale..."
              :value="selectedKanaModalLive.personalNote"
              @input="store.updateKanaNoteLocal(selectedKanaModalLive.id, $event.target.value)"
            />
            <button
              class="w-full bg-pink-400 active:bg-pink-500 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 uppercase shadow-lg transition-all active:scale-95 text-lg tracking-widest"
              @click="store.speakText(selectedKanaModalLive.character)"
            >
              <Volume2 :size="26" /> Pronuncia
            </button>
          </div>
        </div>
      </div>

      <!-- ===== MODAL DETTAGLIO VOCAB ===== -->
      <div
        v-if="selectedVocabModalLive"
        class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center"
        @click.self="store.selectedVocabModal = null"
      >
        <div class="bg-white w-full max-w-xl rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90dvh]">
          <div class="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
            <div class="w-10 h-1 bg-slate-200 rounded-full"></div>
          </div>
          <!-- Header con X -->
          <div class="flex items-center justify-between px-5 pt-4 pb-2 shrink-0">
            <span class="text-[11px] font-black text-emerald-400 uppercase tracking-[0.3em]">✨ Dettaglio Parola</span>
            <button
              class="bg-slate-100 p-2.5 rounded-full text-slate-500 active:bg-rose-50 active:text-rose-500 transition-all"
              @click="store.selectedVocabModal = null"
            ><X :size="18" /></button>
          </div>

          <div class="flex flex-col items-center px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] gap-4 overflow-y-auto">
            <!-- Parola grande -->
            <h2 class="text-5xl font-black text-slate-700 leading-tight text-center">
              {{ selectedVocabModalLive.word }}
            </h2>

            <!-- Romaji + Significato -->
            <div class="flex gap-2 flex-wrap justify-center">
              <div class="text-sm font-bold text-emerald-600 bg-emerald-50 px-5 py-2 rounded-2xl border border-emerald-100 tracking-[0.2em]">
                {{ selectedVocabModalLive.romaji }}
              </div>
              <div class="text-sm font-bold text-slate-500 bg-slate-50 px-5 py-2 rounded-2xl border border-slate-100 italic">
                "{{ selectedVocabModalLive.meaning }}"
              </div>
            </div>

            <!-- Tag informativi sintetici -->
            <div class="flex flex-wrap gap-2 justify-center w-full">
              <!-- Tono/Registro -->
              <template v-if="selectedVocabModalLive.tone">
                <div
                  :class="[
                    'flex items-center gap-1.5 px-4 py-2 rounded-xl border text-xs font-black uppercase tracking-widest',
                    getToneConfig(selectedVocabModalLive.tone).bg,
                    getToneConfig(selectedVocabModalLive.tone).text,
                    getToneConfig(selectedVocabModalLive.tone).border
                  ]"
                >
                  <span>{{ getToneConfig(selectedVocabModalLive.tone).emoji }}</span>
                  <span>{{ selectedVocabModalLive.tone }}</span>
                </div>
              </template>
              <!-- Categoria -->
              <div
                v-if="selectedVocabModalLive.category"
                class="flex items-center gap-1.5 px-4 py-2 rounded-xl border text-xs font-black uppercase tracking-widest bg-pink-50 text-pink-500 border-pink-100"
              >
                <span>🏷️</span>
                <span>{{ selectedVocabModalLive.category }}</span>
              </div>
            </div>

            <!-- Separatore -->
            <div class="w-full border-t border-slate-100"></div>

            <!-- Barra progressi mastery -->
            <div class="w-full bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <div class="flex justify-between text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">
                <span>Padronanza</span>
                <span>{{ selectedVocabModalLive.score }}%</span>
              </div>
              <div class="h-3 bg-slate-200 rounded-full overflow-hidden">
                <div
                  :class="[
                    'h-full rounded-full transition-all duration-500',
                    selectedVocabModalLive.score >= 80 ? 'bg-emerald-400' :
                    selectedVocabModalLive.score >= 40 ? 'bg-amber-400' : 'bg-rose-400'
                  ]"
                  :style="{ width: selectedVocabModalLive.score + '%' }"
                ></div>
              </div>
              <div class="flex items-center justify-between mt-1.5">
                <p class="text-[10px] text-slate-300 font-semibold">{{ selectedVocabModalLive.attempts }} tentativi</p>
                <button
                  class="text-[10px] font-black text-rose-400 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-lg uppercase tracking-wide active:bg-rose-100 transition-all"
                  @click="store.resetVocabScore(selectedVocabModalLive.id)"
                >↺ Reset</button>
              </div>
            </div>

            <textarea
              class="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-base outline-none resize-none focus:border-emerald-200 transition-all"
              rows="4"
              placeholder="Appunti personali..."
              :value="selectedVocabModalLive.personalNote"
              @input="store.updateVocabNoteLocal(selectedVocabModalLive.id, $event.target.value)"
            />
            <button
              class="w-full bg-emerald-500 active:bg-emerald-600 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 uppercase shadow-lg transition-all active:scale-95 text-lg tracking-widest"
              @click="store.speakText(selectedVocabModalLive.word)"
            >
              <Volume2 :size="26" /> Pronuncia
            </button>
          </div>
        </div>
      </div>

      <!-- ===== BOTTONE SALVA (solo icona) ===== -->
      <button
        v-if="store.currentProfile && !store.quizActive"
        class="fixed top-[calc(0.75rem+env(safe-area-inset-top))] right-4 z-[300] flex items-center justify-center w-11 h-11 rounded-2xl shadow-lg transition-all duration-300 disabled:pointer-events-none"
        :class="store.isSyncing
          ? 'bg-amber-400 text-white'
          : store.saveSuccess
            ? 'bg-emerald-500 text-white'
            : 'bg-white/90 backdrop-blur text-slate-400 border border-slate-100 active:scale-95 active:bg-pink-50 active:text-pink-500'"
        :title="store.isSyncing ? 'Salvataggio in corso...' : store.saveSuccess ? 'Salvato!' : 'Salva progressi'"
        :disabled="store.isSyncing"
        @click="store.saveNow()"
      >
        <Save
          v-if="!store.isSyncing"
          :size="20"
          :class="store.saveSuccess ? 'scale-110 transition-transform duration-200' : ''"
        />
        <svg v-else class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </button>

      <!-- ===== OVERLAY SPINNER durante salvataggio ===== -->
      <div
        v-if="store.isSyncing"
        class="fixed inset-0 z-[250] bg-slate-900/20 backdrop-blur-[2px] flex items-center justify-center pointer-events-auto"
      >
        <div class="bg-white/95 rounded-2xl px-6 py-4 flex items-center gap-3 shadow-xl">
          <svg class="animate-spin h-6 w-6 text-amber-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span class="text-slate-600 font-bold">Salvataggio...</span>
        </div>
      </div>

      <!-- ===== CONTENUTO PRINCIPALE ===== -->
      <main ref="mainScrollRef" class="w-full flex-1 overflow-y-auto bg-[#fff0f5] pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))] flex flex-col items-center">
        <div class="w-full max-w-2xl mx-auto flex flex-col items-center">
          <RouterView />
        </div>
      </main>

      <!-- ===== BARRA NAVIGAZIONE BOTTOM ===== -->
      <nav class="fixed bottom-0 w-full bg-white/95 backdrop-blur-xl border-t border-pink-50 z-50 shadow-[0_-8px_30px_rgba(236,72,153,0.06)]"
        style="padding-bottom: max(env(safe-area-inset-bottom), 0px);"
      >
        <div class="w-full max-w-lg mx-auto flex justify-around px-2 h-16 items-center">
          <NavItem label="Home" :active="isNavActive('/')" color="indigo" @click="router.push('/')">
            <BarChart2 :size="22" />
          </NavItem>
          <NavItem label="Hiragana" :active="isNavActive('/hiragana')" color="pink" @click="router.push('/hiragana')">
            <span class="text-xl font-black">あ</span>
          </NavItem>
          <NavItem label="Vocaboli" :active="isNavActive('/vocab')" color="blue" @click="router.push('/vocab')">
            <BookOpen :size="22" />
          </NavItem>
          <NavItem label="Ripasso" :active="isNavActive('/review')" color="red" @click="router.push('/review')">
            <Brain :size="22" />
          </NavItem>
          <!-- Avatar profilo + spinner sync -->
          <button
            class="flex flex-col items-center justify-center w-[76px] h-14 rounded-2xl transition-all duration-200 text-slate-400 active:scale-95 group relative"
            @click="store.switchProfile()"
          >
            <span class="text-xl">{{ store.currentProfile === 'andrea' ? '🧑‍💻' : '👩‍🎨' }}</span>
            <span class="text-[10px] font-black uppercase tracking-[0.08em] mt-0.5 leading-none capitalize">{{ store.currentProfile }}</span>
            <!-- Indicatore sync in corso -->
            <span
              v-if="store.isSyncing"
              class="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400 animate-pulse"
              title="Salvataggio in corso..."
            ></span>
            <span
              v-else
              class="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400"
              title="Dati salvati"
            ></span>
          </button>
        </div>
      </nav>

      <!-- ===== MODALE ERRORE SALVATAGGIO ===== -->
      <div
        v-if="store.saveErrorModal"
        class="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[600] flex items-end sm:items-center justify-center p-4 overflow-hidden"
        @click.self="store.saveErrorModal = null"
      >
        <div class="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center relative">
          <button
            class="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:bg-slate-100 active:bg-slate-200 transition-colors"
            aria-label="Chiudi"
            @click="store.saveErrorModal = null"
          >
            <X :size="20" />
          </button>
          <div class="text-5xl mb-4">❌</div>
          <h3 class="font-black text-slate-700 text-xl mb-2">{{ store.saveErrorModal.title }}</h3>
          <p class="text-slate-500 text-sm mb-8 leading-relaxed">{{ store.saveErrorModal.text }}</p>
          <button
            class="bg-rose-500 active:bg-rose-600 text-white font-black py-4 rounded-2xl w-full uppercase tracking-widest shadow-xl transition-all text-base"
            @click="store.saveErrorModal = null"
          >OK</button>
        </div>
      </div>

      <!-- ===== ALERT BOX ===== -->
      <div
        v-if="store.customAlert"
        class="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[600] flex items-end sm:items-center justify-center p-4"
      >
        <div class="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center">
          <div class="text-5xl mb-4">🌸</div>
          <p class="text-slate-700 font-black mb-8 text-xl leading-relaxed uppercase tracking-widest">
            {{ store.customAlert }}
          </p>
          <button
            class="bg-pink-400 active:bg-pink-500 text-white font-black py-4 rounded-2xl w-full uppercase tracking-widest shadow-xl transition-all text-base"
            @click="store.customAlert = null"
          >OK</button>
        </div>
      </div>

      <!-- ===== CONFIRM BOX ===== -->
      <div
        v-if="store.confirmModal"
        class="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[400] flex items-end sm:items-center justify-center p-4"
      >
        <div class="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center">
          <div class="text-5xl mb-4">⚠️</div>
          <h3 class="font-black text-slate-700 text-2xl mb-2">{{ store.confirmModal.title }}</h3>
          <p class="text-slate-500 text-base mb-8 leading-relaxed">{{ store.confirmModal.text }}</p>
          <div class="flex gap-3">
            <button
              class="flex-1 bg-rose-500 active:bg-rose-600 text-white font-black py-4 rounded-2xl shadow-lg uppercase tracking-widest transition-all text-sm"
              @click="store.confirmModal.onConfirm()"
            >Reset</button>
            <button
              class="flex-1 bg-slate-100 text-slate-500 font-black py-4 rounded-2xl uppercase tracking-widest transition-all active:bg-slate-200 text-sm"
              @click="store.confirmModal = null"
            >Annulla</button>
          </div>
        </div>
      </div>

      <!-- ===== FEEDBACK RISPOSTA (solo sbagliato) ===== -->
      <!-- Sbagliato: modale dal basso con spiegazione, richiede "Avanti" -->
      <Transition name="slide-up">
        <div
          v-if="store.answerFeedback && !store.answerFeedback.ok"
          class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[500] flex items-end justify-center"
        >
          <div class="bg-white w-full max-w-lg rounded-t-[2.5rem] shadow-2xl pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <!-- Handle -->
            <div class="flex justify-center pt-3 pb-2">
              <div class="w-10 h-1 bg-slate-200 rounded-full"></div>
            </div>

            <!-- Contenuto errore -->
            <div class="px-6 pt-2 pb-5 flex flex-col gap-5">
              <!-- Titolo -->
              <div class="flex items-center gap-3">
                <div class="text-4xl">😅</div>
                <div>
                  <p class="font-black text-rose-500 text-xl uppercase tracking-widest">Quasi!</p>
                  <p class="text-slate-400 text-sm font-semibold">Ripassala e vai avanti</p>
                </div>
              </div>

              <!-- Confronto risposta tua vs corretta -->
              <div class="grid grid-cols-2 gap-3">
                <div class="bg-rose-50 border-2 border-rose-200 rounded-2xl p-4 text-center">
                  <p class="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-2">Hai risposto</p>
                  <p class="font-black text-rose-500 text-lg leading-tight break-words">
                    {{ store.answerFeedback.userAnswer || '—' }}
                  </p>
                </div>
                <div class="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4 text-center">
                  <p class="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">Risposta corretta</p>
                  <p class="font-black text-emerald-600 text-lg leading-tight break-words">
                    {{ store.answerFeedback.correctAnswer }}
                  </p>
                </div>
              </div>

              <!-- Info extra sulla parola -->
              <div class="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-center">
                <p class="text-3xl font-black text-slate-700 mb-1">{{ store.answerFeedback.questionLabel }}</p>
                <p
                  v-if="store.answerFeedback.romaji && store.answerFeedback.romaji !== store.answerFeedback.questionLabel"
                  class="text-sm font-bold text-emerald-500 uppercase tracking-widest"
                >{{ store.answerFeedback.romaji }}</p>
                <p
                  v-if="store.answerFeedback.meaning"
                  class="text-sm text-slate-400 italic mt-0.5"
                >{{ store.answerFeedback.meaning }}</p>
              </div>

              <!-- Avanti -->
              <button
                class="w-full bg-slate-800 text-white font-black py-5 rounded-2xl uppercase tracking-widest shadow-xl active:scale-95 active:bg-slate-900 text-base transition-all"
                @click="store.advanceAfterFeedback()"
              >Avanti →</button>
            </div>
          </div>
        </div>
      </Transition>

      </template><!-- fine v-else app principale -->

    </template><!-- fine v-else profileSelectOpen -->
  </div>
</template>

<style>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
