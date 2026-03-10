<script setup>
import { computed, onMounted, ref, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  BarChart2, BookOpen, X, Volume2,
  Info, AlertTriangle, CheckCheck, Square, Save,
} from 'lucide-vue-next'
import { useAppStore, hiraganaPresets, katakanaPresets, INITIAL_KANA, INITIAL_VOCAB } from './stores/appStore'
import NavItem from './components/ui/NavItem.vue'
import StrokeOrderSvg from './components/features/StrokeOrderSvg.vue'

const store = useAppStore()
const route = useRoute()
const router = useRouter()

const canProceedVocabSetup = computed(() => store.selectedVocabCategories.length > 0)

const quizActiveBgStyle = computed(() => {
  const t = store.quizType
  const bg = t === 'katakana' ? '#f0f6ff' : t?.startsWith('vocab') ? '#fffbeb' : '#fff0f5'
  return { background: bg, height: '100dvh' }
})

const quizAccent = computed(() => {
  const t = store.quizType
  if (t === 'katakana') return { border: 'border-blue-50', progress: 'bg-blue-400', cardBorder: 'border-blue-100', text: 'text-blue-300', textActive: 'active:text-blue-400', cta: 'bg-blue-400 active:bg-blue-500', ctaText: 'text-blue-500', focusBorder: 'focus:border-blue-300' }
  if (t?.startsWith('vocab')) return { border: 'border-amber-50', progress: 'bg-amber-400', cardBorder: 'border-amber-100', text: 'text-amber-300', textActive: 'active:text-amber-400', cta: 'bg-amber-400 active:bg-amber-500', ctaText: 'text-amber-500', focusBorder: 'focus:border-amber-300' }
  return { border: 'border-pink-50', progress: 'bg-pink-400', cardBorder: 'border-pink-100', text: 'text-pink-300', textActive: 'active:text-pink-400', cta: 'bg-pink-400 active:bg-pink-500', ctaText: 'text-pink-500', focusBorder: 'focus:border-pink-300' }
})

const homeNavWrapRef = ref(null)
const navInnerRef = ref(null)
const navSlotHiraganaRef = ref(null)
const navSlotKatakanaRef = ref(null)
const navSlotVocabRef = ref(null)
const navDragOverPath = ref(null)
const profilePickerOpen = ref(false)
const profilePickerHover = ref(null)
const profilePickerJustSelected = ref(false)
const profilePickerStyle = ref({})
const profileEricaRef = ref(null)
const profileAndreaRef = ref(null)
let homeLongPressTimer = null
const LONG_PRESS_MS = 400
const homeLongPressStart = ref(null)
const LONG_PRESS_MOVE_THRESHOLD = 18

function clearHomeLongPress() {
  if (homeLongPressTimer) {
    clearTimeout(homeLongPressTimer)
    homeLongPressTimer = null
  }
  homeLongPressStart.value = null
}

function getProfileAtPoint(clientX, clientY) {
  const ericaEl = profileEricaRef.value
  const andreaEl = profileAndreaRef.value
  if (ericaEl) {
    const r = ericaEl.getBoundingClientRect()
    if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) return 'erica'
  }
  if (andreaEl) {
    const r = andreaEl.getBoundingClientRect()
    if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) return 'andrea'
  }
  return null
}

function onHomePointerUp(e) {
  if (profilePickerJustSelected.value) {
    profilePickerJustSelected.value = false
    return
  }
  if (!profilePickerOpen.value) {
    clearHomeLongPress()
    router.push(store.currentProfile === 'erica' ? '/erica' : '/andrea')
  }
}

function getNavPathAtPoint(clientX, clientY) {
  const homeEl = homeNavWrapRef.value
  if (homeEl) {
    const r = homeEl.getBoundingClientRect()
    if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) return 'home'
  }
  const h = navSlotHiraganaRef.value
  if (h) {
    const r = h.getBoundingClientRect()
    if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) return '/hiragana'
  }
  const k = navSlotKatakanaRef.value
  if (k) {
    const r = k.getBoundingClientRect()
    if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) return '/katakana'
  }
  const v = navSlotVocabRef.value
  if (v) {
    const r = v.getBoundingClientRect()
    if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) return '/vocab'
  }
  return null
}

const currentNavPath = computed(() =>
  (route.path === '/andrea' || route.path === '/erica') ? 'home' : route.path
)

function navVibrate() {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(14)
  }
}

function goToNav(path) {
  navVibrate()
  if (path === 'home') {
    router.push(store.currentProfile === 'erica' ? '/erica' : '/andrea')
  } else {
    router.push(path)
  }
}

function onNavPointerDown(e) {
  e.preventDefault()
  navInnerRef.value?.setPointerCapture(e.pointerId)
  const path = getNavPathAtPoint(e.clientX, e.clientY)
  navDragOverPath.value = path
  if (path === 'home') {
    profilePickerHover.value = null
    clearHomeLongPress()
    homeLongPressStart.value = { x: e.clientX, y: e.clientY }
    homeLongPressTimer = setTimeout(() => {
      homeLongPressTimer = null
      homeLongPressStart.value = null
      if (homeNavWrapRef.value) {
        const rect = homeNavWrapRef.value.getBoundingClientRect()
        const pickerWidth = 72
        profilePickerStyle.value = {
          left: `${rect.left + rect.width / 2 - pickerWidth / 2}px`,
          bottom: `${window.innerHeight - rect.top + 8}px`,
        }
      }
      profilePickerOpen.value = true
      document.addEventListener('pointermove', onProfilePickerPointerMove, true)
      document.addEventListener('pointerup', onProfilePickerPointerUp, true)
      document.addEventListener('pointercancel', onProfilePickerPointerUp, true)
    }, LONG_PRESS_MS)
  }
}

function onNavPointerMove(e) {
  const path = getNavPathAtPoint(e.clientX, e.clientY)
  navDragOverPath.value = path
  if (homeLongPressStart.value != null) {
    const dx = e.clientX - homeLongPressStart.value.x
    const dy = e.clientY - homeLongPressStart.value.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (path !== 'home' || dist > LONG_PRESS_MOVE_THRESHOLD) clearHomeLongPress()
  } else {
    clearHomeLongPress()
  }
  if (path && path !== currentNavPath.value) {
    goToNav(path)
  }
}

function onNavPointerUp(e) {
  if (profilePickerOpen.value) {
    navInnerRef.value?.releasePointerCapture(e.pointerId)
    navDragOverPath.value = null
    return
  }
  if (profilePickerJustSelected.value) {
    profilePickerJustSelected.value = false
    navInnerRef.value?.releasePointerCapture(e.pointerId)
    navDragOverPath.value = null
    return
  }
  clearHomeLongPress()
  const path = getNavPathAtPoint(e.clientX, e.clientY)
  navDragOverPath.value = null
  navInnerRef.value?.releasePointerCapture(e.pointerId)
  if (!path || path === currentNavPath.value) return
  goToNav(path)
}

function onProfilePickerPointerMove(e) {
  profilePickerHover.value = getProfileAtPoint(e.clientX, e.clientY)
}

function onProfilePickerPointerUp(e) {
  const profile = profilePickerOpen.value ? getProfileAtPoint(e.clientX, e.clientY) : null
  profilePickerOpen.value = false
  profilePickerHover.value = null
  document.removeEventListener('pointermove', onProfilePickerPointerMove, true)
  document.removeEventListener('pointerup', onProfilePickerPointerUp, true)
  document.removeEventListener('pointercancel', onProfilePickerPointerUp, true)
  if (profile === 'erica') {
    store.selectProfile('erica')
    router.push('/erica')
    profilePickerJustSelected.value = true
  } else if (profile === 'andrea') {
    store.selectProfile('andrea')
    router.push('/andrea')
    profilePickerJustSelected.value = true
  }
}

const imagesPreloaded = ref(false)

const PRELOAD_IMAGES = [
  '/hiragana-logo.png',
  '/katakana-logo.png',
  '/vocaboli-logo.png',
  '/andrea-home-logo.png',
  '/erica-home-logo.png',
  '/avatar-andrea.png',
  '/avatar-erica.png',
  ...Array.from({ length: 23 }, (_, i) => `/${i + 1}.png`),
]

const preloadImages = () =>
  Promise.all(
    PRELOAD_IMAGES.map(
      (src) =>
        new Promise((resolve) => {
          const img = new Image()
          img.onload = resolve
          img.onerror = resolve
          img.src = src
        })
    )
  )

const isKanaQuiz = computed(() => store.quizType === 'kana' || store.quizType === 'katakana')

const currentQuestion = computed(() =>
  store.quizQueue.length && store.currentQuestionIndex < store.quizQueue.length
    ? store.quizQueue[store.currentQuestionIndex]
    : null
)

const quizModeLabel = computed(() => {
  const type = store.quizType
  const dir = store.quizDirection
  if (type === 'vocab-kana-read' || type === 'vocab-romaji-input') return '👁 Leggi i kana → scrivi romaji'
  if (type === 'vocab-kana-to-romaji') return '👁 Kana → scrivi romaji'
  if (type === 'vocab-romaji') return '🗣️ Significato → scrivi il romaji'
  if (type === 'kana') return dir === 'ja-to-romaji' ? '👁 Kana → Lettura' : '👁 Lettura → Kana'
  if (type === 'katakana') return dir === 'ja-to-romaji' ? '👁 Katakana → Lettura' : '👁 Lettura → Katakana'
  if (type === 'vocab') return dir === 'ja-to-romaji' ? '👁 Parola → Significato' : '👁 Romaji → Parola'
  return 'Quiz'
})

const questionText = computed(() => {
  if (!currentQuestion.value) return ''
  if (store.quizType === 'vocab-kana-read' || store.quizType === 'vocab-romaji-input') return currentQuestion.value.meaning
  if (store.quizType === 'vocab-kana-to-romaji') return currentQuestion.value.word?.split('/')[0] ?? ''
  if (store.quizType === 'vocab-romaji') return currentQuestion.value.meaning
  if (store.quizDirection === 'ja-to-romaji')
    return isKanaQuiz.value ? currentQuestion.value.character : currentQuestion.value.word
  return isKanaQuiz.value ? currentQuestion.value.romaji.split('/')[0] : currentQuestion.value.romaji.split('/')[0]
})

// Sottotitolo con tono per quiz vocab-romaji.
const vocabRomajiSubtitle = computed(() => {
  if (store.quizType !== 'vocab-romaji' || !currentQuestion.value) return null
  return currentQuestion.value.tone
    ? `in modo ${currentQuestion.value.tone.toLowerCase()}`
    : 'in romaji'
})

const finalInputClass = computed(() => {
  const isKanaRomaji = store.quizType === 'vocab-kana-to-romaji'
  const base = isKanaRomaji
    ? 'w-full p-3 rounded-xl border-2 text-center font-black text-base focus:outline-none transition-all duration-150 '
    : 'w-full p-5 rounded-2xl border-4 text-center font-black text-2xl focus:outline-none transition-all duration-150 '
  if (!store.isAnswered) return base + 'border-slate-100 bg-white shadow-lg ' + (store.quizType === 'katakana' ? 'focus:border-blue-300' : store.quizType?.startsWith('vocab') ? 'focus:border-amber-300' : 'focus:border-pink-300')
  const userText = store.manualInput.trim().toLowerCase()
  const q = currentQuestion.value
  let correctText = ''
  let correct = false
  if (store.quizType === 'vocab-kana-to-romaji' && store.answerFeedback != null) {
    correct = store.answerFeedback.ok
  } else if (store.quizType === 'kana' || store.quizType === 'katakana') {
    correctText = store.quizDirection === 'ja-to-romaji'
      ? (q?.romaji?.split('/')[0]?.trim()?.toLowerCase() || '')
      : (q?.character?.trim() || '')
    correct = userText === correctText
  } else if (store.quizType === 'vocab') {
    correctText = store.quizDirection === 'ja-to-romaji'
      ? (q?.meaning?.trim()?.toLowerCase() || '')
      : (q?.word?.split('/')[0]?.trim()?.toLowerCase() || '')
    correct = userText === correctText
  } else if (store.quizType === 'vocab-romaji' || store.quizType === 'vocab-kana-to-romaji') {
    correctText = q?.romaji?.split('/')[0]?.trim()?.toLowerCase() || ''
    correct = userText === correctText
  } else {
    correctText = q?.romaji?.split('/')[0]?.trim()?.toLowerCase() || ''
    correct = userText === correctText
  }
  return base + (correct
    ? 'border-emerald-400 bg-emerald-50 text-emerald-600'
    : 'border-rose-400 bg-rose-50 text-rose-600 shadow-lg')
})

const selectedKanaModalLive = computed(() => {
  if (!store.selectedKanaModal) return null
  const live = store.kanaData.find(k => k.id === store.selectedKanaModal.id)
  return live || store.selectedKanaModal
})

const selectedKatakanaModalLive = computed(() => {
  if (!store.selectedKatakanaModal) return null
  const live = store.katakanaData.find(k => k.id === store.selectedKatakanaModal.id)
  return live || store.selectedKatakanaModal
})

const selectedVocabModalLive = computed(() => {
  if (!store.selectedVocabModal) return null
  const live = store.vocabData.find(v => v.id === store.selectedVocabModal.id)
  return live || store.selectedVocabModal
})

// Riproduzione automatica pronuncia all'apertura del dettaglio vocabolo.
watch(
  () => store.selectedVocabModal,
  (modal) => {
    if (modal?.word) {
      nextTick(() => {
        store.speakText(modal.word)
      })
    }
  }
)

// Configurazione badge tono/registro per il vocabolario.
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
    return (store.quizType === 'kana' || store.quizType === 'katakana') ? opt.romaji : opt.meaning
  return (store.quizType === 'kana' || store.quizType === 'katakana') ? opt.character : opt.word.split('/')[0]
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

// Blocca scroll della pagina quando una modale/overlay è aperta.
const isAnyModalOpen = computed(() =>
  !!(
    store.quizSetupModalOpen ||
    store.katakanaSetupModalOpen ||
    store.vocabSetupModalOpen ||
    store.difficultyModalOpen ||
    store.showSaveProgressAfterQuiz ||
    store.saveErrorModal ||
    store.customAlert ||
    store.confirmModal ||
    store.selectedKanaModal ||
    store.selectedKatakanaModal ||
    store.selectedVocabModal ||
    (store.answerFeedback && (!store.answerFeedback.ok || store.quizType === 'vocab-kana-to-romaji'))
  )
)

const quizScrollRef = ref(null)
const quizCardRef = ref(null)
const manualInputRef = ref(null)
const feedbackModalRef = ref(null)

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
  // Riporta focus su input dopo avanzamento (tranne vocab-kana-to-romaji, gestito da watcher).
  if (store.quizType !== 'vocab-kana-to-romaji') {
    setTimeout(async () => {
      await nextTick()
      if (manualInputRef.value) manualInputRef.value.focus()
    }, 680)
  }
}

function resetKana() {
  store.confirmModal = {
    title: 'Reset Kana',
    text: 'Vuoi azzerare i progressi dei Kana?',
    onConfirm: () => {
      store.kanaData = INITIAL_KANA.map((k) => ({ ...k, score: 0, attempts: 0 }))
      store.saveNow().catch(() => {})
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
      store.saveNow().catch(() => {})
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

// Scroll in cima quando il quiz termina.
watch(() => store.quizActive, (active) => {
  if (!active) scrollToTop()
})

// Focus sull'input tra una domanda e l'altra (e all'avvio quiz) per uso solo tastiera.
watch(
  () => [
    store.quizActive,
    store.currentQuestionIndex,
    store.answerFeedback,
    store.isAnswered,
  ],
  () => {
    const manualMode = store.quizDifficulty === 'difficile' || store.quizType === 'vocab-kana-to-romaji'
    if (!store.quizActive || !manualMode) return
    if (store.answerFeedback != null) {
      nextTick(() => feedbackModalRef.value?.focus())
      return
    }
    if (store.isAnswered) return
    nextTick(() => {
      setTimeout(() => manualInputRef.value?.focus(), 80)
    })
  },
  { flush: 'post' }
)

// Redirect / a /andrea o /erica quando c'è già un profilo e non si sta cambiando utente.
watch(
  () => [route.path, store.currentProfile, store.profileSelectOpen],
  () => {
    if (route.path === '/' && store.currentProfile && !store.profileSelectOpen) {
      router.replace(store.currentProfile === 'erica' ? '/erica' : '/andrea')
    }
  },
  { immediate: true }
)

// Scroll in cima alla view a ogni cambio route.
watch(() => route.path, () => {
  scrollToTop()
})

onMounted(() => {
  store.init()
  preloadImages().then(() => {
    imagesPreloaded.value = true
  })
})
</script>

<template>
  <!-- Blocca scroll contenuto dietro quando una modale è aperta -->
  <div
    class="min-h-screen bg-[#fff0f5] font-sans text-slate-800 flex flex-col items-center overflow-x-hidden"
    :class="{ 'overflow-y-hidden': isAnyModalOpen }"
  >

    <!-- LOADING SCREEN (cloud + immagini) -->
    <template v-if="!store.isCloudLoaded || !imagesPreloaded || store.forceLoadingScreen">
      <div class="min-h-screen bg-[#fff0f5] flex items-center justify-center flex-col gap-2 px-6">
        <img src="/12.png" alt="" class="w-24 h-24 object-contain animate-bounce" />
        <p class="text-loading-gradient font-black text-base uppercase tracking-widest text-center">
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

   
          <!-- Card selezione: contenitore colorato per stacco, bottoni bianchi -->
          <div class="bg-pink-50/90 backdrop-blur-sm rounded-[2.5rem] shadow-2xl border border-pink-200/80 px-8 py-8 w-full max-w-xs z-10">
            <p class="text-center text-[11px] font-black text-pink-400 uppercase tracking-[0.3em] mb-6">
              Seleziona il tuo profilo
            </p>

            <!-- Bottone Erica -->
            <button
              class="w-full mb-4 rounded-3xl border-4 border-pink-100 bg-white shadow-md px-6 py-6 flex flex-col items-center gap-2 active:scale-95 transition-all hover:shadow-lg hover:border-pink-200 group"
              @click="store.selectProfile('erica'); router.push('/erica')"
            >
              <img src="/avatar-erica.png" alt="Erica" class="w-16 h-16 object-contain object-center bg-transparent group-active:scale-110 transition-transform" />
              <span class="text-xl font-black text-pink-500 tracking-wide">Erica</span>
              <span class="text-xs font-semibold text-pink-300 uppercase tracking-widest">Il mio profilo</span>
            </button>

            <!-- Bottone Andrea -->
            <button
              class="w-full rounded-3xl border-4 border-indigo-100 bg-white shadow-md px-6 py-6 flex flex-col items-center gap-2 active:scale-95 transition-all hover:shadow-lg hover:border-indigo-200 group"
              @click="store.selectProfile('andrea'); router.push('/andrea')"
            >
              <img src="/avatar-andrea.png" alt="Andrea" class="w-16 h-16 object-contain object-center bg-transparent group-active:scale-110 transition-transform" />
              <span class="text-xl font-black text-indigo-600 tracking-wide">Andrea</span>
              <span class="text-xs font-semibold text-indigo-300 uppercase tracking-widest">Il mio profilo</span>
            </button>
          </div>

          <p class="text-slate-400 text-xs font-semibold mt-8 z-10">I progressi vengono salvati separatamente 🌟</p>
        </div>
      </template>

      <!-- ===== APP PRINCIPALE ===== -->
      <template v-else>

      <!-- Toast Salvato / Non salvato in alto a sinistra dopo fine quiz -->
      <Transition name="toast">
        <div
          v-if="store.quizSavedToast"
          class="fixed top-5 right-5 z-[400] pt-[max(0.5rem,env(safe-area-inset-top))] pl-[max(0.5rem,env(safe-area-inset-left))] pointer-events-none "
        >
          <div
            :style="store.quizSavedToast === 'success' ? { borderColor: 'rgb(6 150 104)' } : { borderColor: 'rgb(244 63 94)' }"
            class="flex items-center gap-2 bg-transparent px-3 py-2 rounded-xl shadow-lg text-sm font-black uppercase tracking-wide border-2"
          >
            <img
              :src="store.quizSavedToast === 'success' ? '/onigiri-saved.png' : '/onigiri-unsaved.png'"
              :alt="store.quizSavedToast === 'success' ? 'Salvato' : 'Non salvato'"
              class="w-8 h-8 object-contain shrink-0"
            />
            <span v-if="store.quizSavedToast === 'error'">Non salvato</span>
          </div>
        </div>
      </Transition>

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
            <!-- Preset rapidi: selezione cumulativa (toggle) -->
            <div>
              <p class="text-[11px] font-black text-slate-300 uppercase tracking-[0.3em] mb-3">✨ Preset rapidi</p>
              <div class="flex flex-wrap gap-2 mb-4 items-center justify-center">
                <button
                  v-for="p in hiraganaPresets"
                  :key="p.id"
                  type="button"
                  :class="[
                    'w-[4.25rem] min-w-[4.25rem] px-5 py-2.5 font-black rounded-xl uppercase text-xs border-2 transition-all',
                    p.kanaIds.every(id => store.selectedKanaIds.includes(id))
                      ? 'bg-pink-400 border-pink-400 text-white'
                      : 'bg-pink-50 text-pink-600 border-pink-100 active:bg-pink-100'
                  ]"
                  @click="() => {
                    const ids = p.kanaIds
                    const allIn = ids.every(id => store.selectedKanaIds.includes(id))
                    if (allIn)
                      store.selectedKanaIds = store.selectedKanaIds.filter(id => !ids.includes(id))
                    else
                      store.selectedKanaIds = [...new Set([...store.selectedKanaIds, ...ids])]
                  }"
                >{{ p.name }}</button>
              </div>
              <div class="border-b border-slate-200 my-5" aria-hidden="true"></div>
            </div>

            <!-- Griglia kana selezionabili (5 colonne = una riga per tipologia: vocali, ka, ga, sa, …) -->
            <div class="grid grid-cols-5 gap-2 pb-2">
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

          <div class="px-6 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] shrink-0 border-t border-slate-200 flex items-center gap-3 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
            <button
              :disabled="store.selectedKanaIds.length < 4"
              class="flex-1 bg-pink-400 text-white font-black py-4 h-14 rounded-2xl shadow-xl uppercase tracking-widest active:scale-95 active:bg-pink-500 transition-all text-base disabled:opacity-40 disabled:pointer-events-none disabled:cursor-not-allowed"
              @click="store.proceedFromSetup()"
            >Continua</button>
            <button
              type="button"
              class="p-2.5 py-4 px-3 h-14 rounded-2xl border-2 border-slate-100 text-slate-400 active:bg-slate-50 active:scale-95 transition-all text-sm font-black uppercase tracking-widest flex items-center justify-center shrink-0"
              title="Ripeti ultimo quiz kana"
              @click="store.restartLastKanaQuiz()"
            >
              <span class="text-2xl leading-none">↻</span>
            </button>
            <button
              type="button"
              title="Seleziona tutti"
              :class="[
                'p-2.5 rounded-2xl border-2 active:scale-95 transition-all shrink-0 h-14',
                store.selectedKanaIds.length === store.kanaData.length
                  ? 'bg-pink-400 border-pink-400 text-white'
                  : 'bg-pink-50 text-pink-500 border-pink-100 hover:bg-pink-100'
              ]"
              @click="store.selectedKanaIds.length === store.kanaData.length ? store.selectedKanaIds = [] : store.selectedKanaIds = store.kanaData.map(k => k.id)"
            ><CheckCheck :size="22" :stroke-width="2.5" /></button>
          </div>
        </div>
      </div>

      <!-- ===== MODAL SELEZIONE KATAKANA ===== -->
      <div
        v-if="store.katakanaSetupModalOpen"
        class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center overflow-hidden"
        style="touch-action:none;"
        @click.self="store.katakanaSetupModalOpen = false"
      >
        <div class="bg-white w-full max-w-xl rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col h-[97dvh] sm:max-h-[97dvh]">
          <div class="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
            <div class="w-10 h-1 bg-slate-200 rounded-full"></div>
          </div>
          <div class="flex justify-between items-center px-6 pt-4 pb-3 shrink-0">
            <div class="flex items-center gap-2">
              <h3 class="text-lg font-black text-slate-700 uppercase tracking-widest">Selezione Kana</h3>
            </div>
            <button
              class="bg-slate-100 p-2.5 rounded-full text-slate-500 active:bg-rose-50 active:text-rose-500 transition-all"
              @click="store.katakanaSetupModalOpen = false"
            >
              <X :size="18" />
            </button>
          </div>

          <div class="overflow-y-auto flex-1 px-6 space-y-5 pb-2">
            <!-- Preset rapidi Katakana + selezioni veloci -->
            <div>
              <p class="text-[11px] font-black text-slate-300 uppercase tracking-[0.3em] mb-3">✨ Preset rapidi</p>
              <div class="flex flex-wrap gap-2 mb-4 items-center justify-center">
                <button
                  v-for="p in katakanaPresets"
                  :key="p.id"
                  type="button"
                  :class="[
                    'w-[4.25rem] min-w-[4.25rem] px-5 py-2.5 font-black rounded-xl uppercase text-xs border-2 transition-all',
                    p.kanaIds.every(id => store.selectedKatakanaIds.includes(id))
                      ? 'text-white'
                      : 'bg-blue-50 text-blue-600 border-blue-100 active:bg-blue-100'
                  ]"
                  :style="p.kanaIds.every(id => store.selectedKatakanaIds.includes(id))
                    ? 'background:#63a8eb; border-color:#63a8eb;'
                    : ''"
                  @click="() => {
                    const ids = p.kanaIds
                    const allIn = ids.every(id => store.selectedKatakanaIds.includes(id))
                    if (allIn)
                      store.selectedKatakanaIds = store.selectedKatakanaIds.filter(id => !ids.includes(id))
                    else
                      store.selectedKatakanaIds = [...new Set([...store.selectedKatakanaIds, ...ids])]
                  }"
                >{{ p.name }}</button>
              </div>
              <div class="border-b border-slate-200 my-6" aria-hidden="true"></div>
            </div>

            <!-- Griglia katakana selezionabili -->
            <div class="grid grid-cols-5 gap-2 pb-2">
              <button
                v-for="k in store.katakanaData"
                :key="k.id"
                :class="[
                  'aspect-square rounded-xl flex items-center justify-center text-lg font-black border-2 transition-all active:scale-90',
                  store.selectedKatakanaIds.includes(k.id)
                    ? 'text-white shadow-md'
                    : 'bg-white border-slate-100 text-slate-300'
                ]"
                :style="store.selectedKatakanaIds.includes(k.id)
                  ? 'background:#63a8eb; border-color:#63a8eb;'
                  : ''"
                @click="() => {
                  if (store.selectedKatakanaIds.includes(k.id))
                    store.selectedKatakanaIds = store.selectedKatakanaIds.filter(id => id !== k.id)
                  else
                    store.selectedKatakanaIds = [...store.selectedKatakanaIds, k.id]
                }"
              >{{ k.character }}</button>
            </div>
          </div>

          <div class="px-6 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] shrink-0 border-t border-slate-200 flex items-center gap-3 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
            <button
              :disabled="store.selectedKatakanaIds.length < 4"
              class="flex-1 text-white font-black py-5 h-14 rounded-2xl shadow-xl uppercase tracking-widest active:scale-95 transition-all text-base disabled:opacity-40 disabled:pointer-events-none disabled:cursor-not-allowed shrink-0 min-w-0"
              style="background:#63a8eb;"
              @click="store.proceedFromKatakanaSetup()"
            >Continua</button>
            <button
              type="button"
              class="p-2.5 py-5 px-3 h-14 rounded-2xl border-2 border-slate-100 text-slate-400 active:bg-slate-50 active:scale-95 transition-all text-sm font-black uppercase tracking-widest flex items-center justify-center shrink-0"
              title="Ripeti ultimo quiz katakana"
              @click="store.restartLastKatakanaQuiz()"
            >
              <span class="text-2xl leading-none">↻</span>
            </button>
            <button
              type="button"
              title="Seleziona tutti"
              :class="[
                'p-2.5 rounded-2xl border-2 active:scale-95 transition-all shrink-0 h-14',
                store.selectedKatakanaIds.length === store.katakanaData.length
                  ? 'text-white'
                  : 'bg-slate-50 text-slate-400 border-slate-200'
              ]"
              :style="store.selectedKatakanaIds.length === store.katakanaData.length
                ? 'background:#63a8eb; border-color:#63a8eb;'
                : ''"
              @click="store.selectedKatakanaIds.length === store.katakanaData.length ? store.selectedKatakanaIds = [] : store.selectedKatakanaIds = store.katakanaData.map(k => k.id)"
            ><CheckCheck :size="22" :stroke-width="2.5" /></button>
          </div>
        </div>
      </div>

      <!-- ===== QUIZ ATTIVO ===== -->
      <div
        v-if="store.quizActive"
        class="fixed inset-0 z-[300] flex flex-col"
        :style="quizActiveBgStyle"
      >
        <!-- Header quiz: solo barra avanzamento -->
        <div :class="['shrink-0 flex items-center gap-2 px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 bg-white border-b', quizAccent.border]">
          <button
            class="p-2.5 bg-slate-50 rounded-full text-slate-400 active:bg-rose-50 active:text-rose-500 transition-all shrink-0"
            @click="store.endQuiz()"
          ><X :size="20" /></button>
          <div class="flex-1 min-w-0 flex items-center gap-2">
            <div class="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
              <div
                :class="['h-full transition-all duration-300', quizAccent.progress]"
                :style="{ width: `${(store.currentQuestionIndex / store.quizQueue.length) * 100}%` }"
              ></div>
            </div>
            <span class="text-[11px] font-black text-slate-400 shrink-0">
              {{ store.currentQuestionIndex + 1 }}/{{ store.quizQueue.length }}
            </span>
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
                :class="['w-full text-white font-black py-5 rounded-2xl uppercase shadow-xl tracking-widest active:scale-95 text-base disabled:opacity-40 transition-all', quizAccent.cta]"
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
            :class="[
              'rounded-3xl shadow-lg border flex flex-col items-center w-full max-w-sm shrink-0 bg-white',
              quizAccent.cardBorder,
              store.quizType === 'vocab-kana-to-romaji' ? 'px-5 py-4' : 'px-6 py-5'
            ]"
          >
            <!-- Layout vocab-kana-to-romaji: kana → scrivi romaji -->
            <template v-if="store.quizType === 'vocab-kana-to-romaji'">
              <div
                :class="[
                  'font-black text-slate-700 text-center leading-tight break-words w-full',
                  (currentQuestion?.word?.split('/')[0]?.length || 0) > 4 ? 'text-3xl' : 'text-[2.75rem]'
                ]"
              >{{ questionText }}</div>
              <p class="text-slate-400 text-xs font-semibold mt-1.5">Scrivi il romaji della parola sotto</p>
              <button
                class="text-slate-200 active:text-emerald-400 transition-all p-2 mt-0.5"
                @click="store.speakText(currentQuestion?.word)"
              ><Volume2 :size="24" /></button>
            </template>
            <template v-else-if="store.quizType === 'vocab-romaji'">
              <p class="text-[11px] font-black uppercase tracking-[0.3em] mb-3" :class="quizAccent.text">Come si traduce?</p>
              <p :class="[
                'font-black text-slate-700 text-center leading-tight break-words w-full',
                questionText.length > 20 ? 'text-lg' : questionText.length > 12 ? 'text-xl' : 'text-3xl'
              ]">{{ questionText }}</p>
              <p class="text-sm font-semibold text-slate-400 mt-2 text-center italic">{{ vocabRomajiSubtitle }}</p>
              <button
                :class="['transition-all p-3 mt-1 text-slate-200', quizAccent.textActive]"
                @click="store.speakText(currentQuestion?.word)"
              ><Volume2 :size="28" /></button>
            </template>
            <!-- Layout standard: kana / parola -->
            <template v-else>
              <p
                class="text-[11px] font-black uppercase tracking-[0.3em] mb-2"
                :class="quizAccent.text"
              >
                {{ store.quizDirection === 'ja-to-romaji' ? (store.quizType === 'katakana' ? '👁 Katakana' : isKanaQuiz ? '👁 Kana' : '👁 Parola') : '👁 Lettura' }}
              </p>
              <div
                :class="[
                  'font-black text-slate-700 text-center leading-tight break-words w-full',
                  store.quizDifficulty === 'difficile'
                    ? (isKanaQuiz ? 'text-5xl' : 'text-4xl')
                    : (isKanaQuiz ? 'text-[5rem]' : 'text-[4.5rem]')
                ]"
              >{{ questionText }}</div>
              <button
                :class="['transition-all p-3 mt-1 text-slate-200', quizAccent.textActive]"
                @click="store.speakText(isKanaQuiz ? currentQuestion?.character : currentQuestion?.word)"
              ><Volume2 :size="28" /></button>
            </template>
          </div>

          <!-- Input difficile o quiz Kana→Romaji -->
          <form
            v-if="store.quizDifficulty === 'difficile' || store.quizType === 'vocab-kana-to-romaji'"
            :class="['w-full max-w-sm flex flex-col gap-3', store.quizType === 'vocab-kana-to-romaji' ? 'gap-2' : '']"
            @submit.prevent="handleManualSubmitEvent"
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
              :placeholder="store.quizType === 'vocab-kana-to-romaji'
                ? 'es: sushi, ohayō...'
                : store.quizType === 'kana'
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
              :class="[
                'w-full text-white font-black rounded-2xl uppercase shadow-xl tracking-widest active:scale-95 disabled:opacity-40 transition-all',
                store.quizType === 'vocab-kana-to-romaji' ? 'py-4 text-sm' : 'py-5 text-base',
                quizAccent.cta
              ]"
            >Conferma</button>
          </form>

          <!-- Scelta multipla (solo se non difficile e non vocab-kana-to-romaji) -->
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
              <h3 class="text-lg font-black text-slate-700 uppercase tracking-widest">Categorie</h3>
            </div>
            <button
              class="bg-slate-100 p-2.5 rounded-full text-slate-500 active:bg-rose-50 active:text-rose-500 transition-all"
              @click="store.vocabSetupModalOpen = false"
            ><X :size="18" /></button>
          </div>

          <!-- Lista categorie -->
          <div class="flex-1 overflow-y-auto px-6 pb-4 space-y-2">
            <p class="text-xs font-semibold text-slate-400">Seleziona le <b>categorie</b> da includere nel quiz, il test influenzerà le <b>statistiche</b></p>
            <div class="shrink-0 mt-4 pb-4" aria-hidden="true">
              <div class="border-t border-slate-200"></div>
            </div>
            <button
              v-for="cat in [...new Set(store.vocabData.map(v => v.category))]"
              :key="cat"
              class="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border-2 transition-all active:scale-95 font-black text-sm uppercase tracking-wide"
              :class="store.selectedVocabCategories.includes(cat)
                ? 'bg-amber-50 border-amber-300 text-amber-700'
                : 'bg-slate-50 border-slate-100 text-slate-400'"
              @click="store.selectedVocabCategories.includes(cat)
                ? store.selectedVocabCategories = store.selectedVocabCategories.filter(c => c !== cat)
                : store.selectedVocabCategories = [...store.selectedVocabCategories, cat]"
            >
              <div class="flex items-center gap-3">
                <span
                  :class="[
                    'w-6 h-6 rounded-lg border-2 flex items-center justify-center text-[10px] font-black',
                    store.selectedVocabCategories.includes(cat)
                      ? 'bg-[#ffc99e] border-[#f0b078] text-slate-900 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-300'
                  ]"
                >
                  <span v-if="store.selectedVocabCategories.includes(cat)" class="leading-none">✔</span>
                </span>
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
              :disabled="!canProceedVocabSetup"
              class="flex-1 py-3 rounded-2xl bg-[#ffc99e] text-slate-900 font-black uppercase tracking-widest text-sm active:scale-95 active:bg-[#f0b078] transition-all shadow-md disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed"
              @click="store.proceedFromVocabSetup()"
            >Avanti →</button>
          </div>
        </div>
      </div>

      <!-- ===== MODAL DIFFICOLTÀ ===== -->
      <div
        v-if="store.difficultyModalOpen"
        class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center p-4"
        @click.self="store.difficultyModalOpen = false"
      >
        <div class="bg-white w-full max-w-2xl rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col">
          <div class="flex justify-center pt-4 pb-2 sm:hidden">
            <div class="w-10 h-1 bg-slate-200 rounded-full"></div>
          </div>
          <!-- Header con X -->
          <div class="flex items-start justify-between px-8 pt-6 pb-4">
            <div>
              <h3 class="text-2xl font-black text-slate-800 uppercase flex items-center gap-2">Setup Quiz</h3>
              <p class="text-slate-400 font-semibold mt-1 text-sm leading-relaxed">
                <template v-if="store.quizType === 'kana' && store.quizDirection === 'ja-to-romaji'">Vedi il <b>kana</b> → indovina la <b>lettura</b></template>
                <template v-else-if="store.quizType === 'kana' && store.quizDirection === 'romaji-to-ja'">Vedi il <b>romaji</b> → indovina il <b>kana</b></template>
                <template v-else-if="store.quizType === 'vocab' && store.quizDirection === 'ja-to-romaji'">Vedi la <b>parola</b> → indovina il <b>significato</b></template>
                <template v-else-if="store.quizType === 'vocab' && store.quizDirection === 'romaji-to-ja'">Vedi il <b>romaji</b> → indovina la <b>parola</b></template>
                <template v-else-if="store.quizType === 'vocab-romaji'">Parola in <b>italiano</b> con il tono → traduci in <b>romaji</b></template>
                <template v-else> <p class="text-slate-400 font-semibold mt-1 text-xs leading-relaxed">Parole estratte da categoria <b>Random</b>.</p></template>
              </p>
            </div>
            <button
              class="bg-slate-100 p-2.5 rounded-full text-slate-500 active:bg-rose-50 active:text-rose-500 transition-all shrink-0 ml-4 mt-0.5"
              @click="store.difficultyModalOpen = false"
            >
              <X :size="18" />
            </button>
          </div>

          <!-- Toggle direzione (solo per kana/katakana e vocab standard, non per vocab-kana-to-romaji) -->
          <div v-if="(store.quizType === 'kana' || store.quizType === 'katakana' || store.quizType === 'vocab')" class="px-8 pb-6">
            <div class="border-t border-slate-200 mb-6" aria-hidden="true"></div>

            <p class="text-[11px] font-black text-slate-300 uppercase mb-2 tracking-[0.3em]">Direzione</p>
            <div class="flex bg-slate-50 p-1 rounded-2xl gap-1 border border-slate-100">
              <button
                :class="['flex-1 py-3 text-sm font-black rounded-xl transition-all', store.quizDirection === 'ja-to-romaji' ? ('bg-white shadow-md ' + (store.quizType === 'katakana' ? '' : quizAccent.ctaText)) : 'text-slate-400']"
                :style="store.quizDirection === 'ja-to-romaji' && store.quizType === 'katakana' ? 'color:#63a8eb;' : ''"
                @click="store.quizDirection = 'ja-to-romaji'"
              >🇯🇵 → 🇮🇹</button>
              <button
                :class="['flex-1 py-3 text-sm font-black rounded-xl transition-all', store.quizDirection === 'romaji-to-ja' ? ('bg-white shadow-md ' + (store.quizType === 'katakana' ? '' : quizAccent.ctaText)) : 'text-slate-400']"
                :style="store.quizDirection === 'romaji-to-ja' && store.quizType === 'katakana' ? 'color:#63a8eb;' : ''"
                @click="store.quizDirection = 'romaji-to-ja'"
              >🇮🇹 → 🇯🇵</button>
            </div>
          </div>

          <!-- Difficoltà (nascosta per vocab-kana-read, vocab-romaji-input, vocab-kana-to-romaji) -->
          <div v-if="store.quizType !== 'vocab-kana-read' && store.quizType !== 'vocab-romaji-input' && store.quizType !== 'vocab-kana-to-romaji'" class="px-8 space-y-4 pb-8">
          
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

          <div v-else class="px-8 pb-8 pt-2">
            <!-- Max domande (solo per Kana → Romaji) -->
            <div v-if="store.quizType === 'vocab-kana-to-romaji'" class="mb-8">
              <div class="border-t border-slate-200 mb-6" aria-hidden="true"></div>
              <label class="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Numero massimo di domande</label>
              <div class="flex items-center gap-4">
                <button
                  type="button"
                  class="w-14 h-14 rounded-2xl border-2 border-slate-200 bg-slate-50 text-slate-500 font-black text-2xl active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center"
                  :disabled="store.vocabKanaToRomajiMaxQuestions === null"
                  @click="store.vocabKanaToRomajiMaxQuestions = store.vocabKanaToRomajiMaxQuestions === 5 ? null : store.vocabKanaToRomajiMaxQuestions - 5"
                >−</button>
                <span class="flex-1 text-center font-black text-slate-700 text-xl min-w-[10rem]">
                  {{ store.vocabKanaToRomajiMaxQuestions === null ? `Tutte (${store.quizPendingItems.length})` : `${store.vocabKanaToRomajiMaxQuestions}` }}
                </span>
                <button
                  type="button"
                  class="w-14 h-14 rounded-2xl border-2 border-slate-200 bg-slate-50 text-slate-500 font-black text-2xl active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center"
                  :disabled="store.vocabKanaToRomajiMaxQuestions !== null && store.vocabKanaToRomajiMaxQuestions >= store.quizPendingItems.length"
                  @click="store.vocabKanaToRomajiMaxQuestions = Math.min(store.quizPendingItems.length, (store.vocabKanaToRomajiMaxQuestions ?? 0) + 5)"
                >+</button>
              </div>
              <p class="text-[10px] text-slate-400 mt-3 text-center">Usa − / + per cambiare (step 5)</p>
            </div>
            <button
              class="w-full py-6 rounded-2xl text-white font-black uppercase tracking-widest text-base active:scale-95 shadow-xl transition-all"
              :class="store.quizType === 'vocab-kana-to-romaji'
                ? 'bg-[#ffc99e] text-slate-900 active:bg-[#f0b078]'
                : store.quizType?.startsWith('vocab')
                  ? 'bg-amber-400 active:bg-amber-500'
                  : store.quizType === 'katakana'
                    ? ''
                    : 'bg-pink-400 active:bg-pink-500'"
              :style="store.quizType === 'katakana' ? 'background:#63a8eb;' : ''"
              @click="store.startQuizFinal(store.quizType === 'vocab-kana-to-romaji' ? 'difficile' : 'medio')"
            >
              {{ store.quizType === 'katakana' ? 'ア' : 'あ' }} Inizia Quiz →
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
            <button
              class="w-full bg-pink-400 active:bg-pink-500 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 uppercase shadow-lg transition-all active:scale-95 text-lg tracking-widest"
              @click="store.speakText(selectedKanaModalLive.character)"
            >
              <Volume2 :size="26" /> Pronuncia
            </button>
          </div>
        </div>
      </div>

      <!-- ===== MODAL DETTAGLIO KATAKANA ===== -->
      <div
        v-if="selectedKatakanaModalLive"
        class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center"
        @click.self="store.selectedKatakanaModal = null"
      >
        <div class="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90dvh]">
          <div class="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
            <div class="w-10 h-1 bg-slate-200 rounded-full"></div>
          </div>
          <div class="flex items-center justify-between px-5 pt-4 pb-2 shrink-0">
            <span class="text-[11px] font-black uppercase tracking-[0.3em]" style="color:#3a86cf;">💙 Dettaglio Katakana</span>
            <button
              class="bg-slate-100 p-2.5 rounded-full text-slate-500 active:bg-rose-50 active:text-rose-500 transition-all"
              @click="store.selectedKatakanaModal = null"
            ><X :size="18" /></button>
          </div>
          <div class="flex flex-col items-center px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] gap-5 overflow-y-auto">
            <div class="px-10 py-3 rounded-full" style="background:#e8f2fb;">
              <h2 class="text-3xl font-black uppercase tracking-widest" style="color:#3a86cf;">{{ selectedKatakanaModalLive.romaji }}</h2>
            </div>
            <div class="rounded-3xl w-48 h-48 flex items-center justify-center p-6 shadow-inner bg-white" style="border: 4px solid #cfe4f7;">
              <StrokeOrderSvg :character="selectedKatakanaModalLive.character" />
            </div>
            <!-- Barra progressi mastery -->
            <div class="w-full bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <div class="flex justify-between text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">
                <span>Padronanza</span>
                <span>{{ selectedKatakanaModalLive.score }}%</span>
              </div>
              <div class="h-3 bg-slate-200 rounded-full overflow-hidden">
                <div
                  :class="[
                    'h-full rounded-full transition-all duration-500',
                    selectedKatakanaModalLive.score >= 80 ? 'bg-emerald-400' :
                    selectedKatakanaModalLive.score >= 40 ? 'bg-amber-400' : 'bg-rose-400'
                  ]"
                  :style="{ width: selectedKatakanaModalLive.score + '%' }"
                ></div>
              </div>
              <div class="flex items-center justify-between mt-1.5">
                <p class="text-[10px] text-slate-300 font-semibold">{{ selectedKatakanaModalLive.attempts }} tentativi</p>
                <button
                  class="text-[10px] font-black text-rose-400 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-lg uppercase tracking-wide active:bg-rose-100 transition-all"
                  @click="store.resetKatakanaScore(selectedKatakanaModalLive.id)"
                >↺ Reset</button>
              </div>
            </div>
            <button
              class="w-full text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 uppercase shadow-lg transition-all active:scale-95 text-lg tracking-widest"
              style="background:#63a8eb;"
              @click="store.speakText(selectedKatakanaModalLive.character)"
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
        <div class="bg-white w-full max-w-xl rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col max-h-[95dvh] sm:max-h-[92dvh]">
          <div class="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
            <div class="w-10 h-1 bg-slate-200 rounded-full"></div>
          </div>
          <!-- Header con X -->
          <div class="flex items-center justify-between px-5 pt-4 pb-2 shrink-0">
            <span class="text-[11px] font-black text-[#c98b45] uppercase tracking-[0.3em]">✨ Dettaglio Parola</span>
            <button
              class="bg-slate-100 p-2.5 rounded-full text-slate-500 active:bg-rose-50 active:text-rose-500 transition-all"
              @click="store.selectedVocabModal = null"
            ><X :size="18" /></button>
          </div>

          <div class="flex flex-col flex-1 min-h-0 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] gap-3 overflow-y-auto">
            <!-- Parola kana -->
            <h2 class="text-4xl font-black text-slate-700 leading-tight text-center shrink-0">
              {{ selectedVocabModalLive.word }}
            </h2>

            <!-- Romaji + Significato -->
            <div class="flex gap-2 flex-wrap justify-center shrink-0">
              <div class="text-sm font-bold text-[#c98b45] bg-[#fff8f2] px-5 py-2 rounded-2xl border border-[#ffc99e]/60 tracking-[0.2em]">
                {{ selectedVocabModalLive.romaji }}
              </div>
              <div class="text-sm font-bold text-slate-500 bg-slate-50 px-5 py-2 rounded-2xl border border-slate-100 italic">
                "{{ selectedVocabModalLive.meaning }}"
              </div>
            </div>

            <!-- Solo Tono (badge categoria rimosso) -->
            <div v-if="selectedVocabModalLive.tone" class="flex flex-wrap gap-2 justify-center w-full shrink-0">
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
            </div>

            <!-- Separatore -->
            <div class="w-full border-t border-slate-100 shrink-0"></div>

            <!-- Barra progressi mastery -->
            <div class="w-full bg-slate-50 rounded-2xl p-4 border border-slate-100 shrink-0">
              <div class="flex justify-between text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">
                <span>Padronanza</span>
                <span>{{ selectedVocabModalLive.score }}%</span>
              </div>
              <div class="h-3 bg-slate-200 rounded-full overflow-hidden">
                <div
                  :class="[
                    'h-full rounded-full transition-all duration-500',
                    selectedVocabModalLive.score >= 80 ? 'bg-[#e8a55c]' :
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

            <!-- Note: più spazio -->
            <textarea
              class="w-full flex-1 min-h-[7rem] bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-base outline-none resize-none focus:border-[#ffc99e] transition-all"
              rows="6"
              placeholder="Appunti personali..."
              :value="selectedVocabModalLive.personalNote"
              autocomplete="off"
              autocorrect="off"
              autocapitalize="off"
              spellcheck="false"
              @input="store.updateVocabNoteLocal(selectedVocabModalLive.id, $event.target.value)"
            />
            <button
              class="w-full bg-[#ffc99e] active:bg-[#f0b078] text-slate-900 font-black py-5 rounded-2xl flex items-center justify-center gap-3 uppercase shadow-lg transition-all active:scale-95 text-lg tracking-widest shrink-0"
              @click="store.speakText(selectedVocabModalLive.word)"
            >
              <Volume2 :size="26" /> Pronuncia
            </button>
          </div>
        </div>
      </div>

      <!-- ===== BOTTONE SALVA (solo icona) — nascosto per ora ===== -->
      <button
        v-if="store.currentProfile && !store.quizActive"
        class="hidden fixed top-[calc(1.75rem+env(safe-area-inset-top))] left-6 z-[300] flex items-center justify-center w-11 h-11 rounded-2xl shadow-lg transition-all duration-300 disabled:pointer-events-none"
        :class="store.isSyncing
          ? 'bg-amber-400 text-white'
          : store.saveSuccess
            ? 'bg-emerald-500 text-white'
            : 'bg-white/90 backdrop-blur text-slate-400 border border-slate-100 active:scale-95 active:bg-pink-50 active:text-pink-500'"
        :title="store.isSyncing ? '' : store.saveSuccess ? 'Salvato!' : 'Salva progressi'"
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
        <svg class="animate-spin h-10 w-10 text-amber-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>

      <!-- ===== CONTENUTO PRINCIPALE ===== -->
      <main
        ref="mainScrollRef"
        class="w-full flex-1 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))] flex flex-col items-center"
        :class="[
          isAnyModalOpen ? 'overflow-hidden' : 'overflow-y-auto',
          route.path === '/hiragana'
            ? 'bg-gradient-to-br from-pink-50 via-rose-50 to-purple-50 relative'
            : route.path === '/katakana'
              ? 'bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 relative'
              : route.path === '/vocab'
                ? 'bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 relative'
                : route.path === '/' || route.path === '/andrea' || route.path === '/erica'
                  ? 'bg-gradient-to-br from-pink-50 via-rose-50 to-purple-50'
                  : 'bg-[#fff0f5]'
        ]"
      >
        <!-- Sfondo animato Hiragana (come selezione utente) -->
        <div v-if="route.path === '/hiragana'" class="absolute inset-0 overflow-hidden pointer-events-none">
          <div class="absolute top-8 left-6 text-6xl opacity-10 select-none animate-spin" style="animation-duration:18s">🌸</div>
          <div class="absolute top-20 right-4 text-5xl opacity-10 select-none animate-spin" style="animation-duration:22s;animation-direction:reverse">✨</div>
          <div class="absolute bottom-24 left-8 text-5xl opacity-10 select-none animate-bounce" style="animation-duration:3s">🌺</div>
          <div class="absolute bottom-16 right-10 text-4xl opacity-10 select-none animate-bounce" style="animation-duration:4s">🎋</div>
          <div class="absolute top-1/2 left-2 text-3xl opacity-5 select-none">あ</div>
          <div class="absolute top-1/3 right-2 text-3xl opacity-5 select-none">い</div>
        </div>
        <!-- Sfondo animato Katakana (tema blu) -->
        <div v-if="route.path === '/katakana'" class="absolute inset-0 overflow-hidden pointer-events-none">
          <div class="absolute top-8 left-6 text-6xl opacity-10 select-none animate-spin text-blue-400" style="animation-duration:18s">❄️</div>
          <div class="absolute top-6 right-4 text-5xl leading-none opacity-10 select-none">🗡️</div>
          <div class="absolute top-20 right-4 text-5xl opacity-10 select-none animate-spin text-indigo-300" style="animation-duration:22s;animation-direction:reverse">✨</div>
          <div class="absolute bottom-24 left-8 text-5xl opacity-10 select-none animate-bounce text-sky-400" style="animation-duration:3s">🌊</div>
          <div class="absolute bottom-16 right-10 text-4xl opacity-10 select-none animate-bounce text-blue-300" style="animation-duration:4s">💠</div>
          <div class="absolute top-1/2 left-2 text-3xl opacity-5 select-none text-blue-200">ア</div>
          <div class="absolute top-1/3 right-2 text-3xl opacity-5 select-none text-indigo-200">イ</div>
        </div>
        <!-- Sfondo animato Vocaboli (tema giallo/ambra) -->
        <div v-if="route.path === '/vocab'" class="absolute inset-0 overflow-hidden pointer-events-none">
          <div class="absolute top-8 left-6 text-6xl opacity-10 select-none animate-spin text-amber-400" style="animation-duration:18s">📗</div>
          <div class="absolute top-20 right-4 text-5xl opacity-10 select-none animate-spin text-yellow-400" style="animation-duration:22s;animation-direction:reverse">✨</div>
          <div class="absolute bottom-24 left-8 text-5xl opacity-10 select-none animate-bounce text-orange-300" style="animation-duration:3s">📘</div>
          <div class="absolute bottom-16 right-10 text-4xl opacity-10 select-none animate-bounce text-amber-300" style="animation-duration:4s">📙</div>
          <div class="absolute top-1/2 left-2 text-3xl opacity-5 select-none text-amber-200">あ</div>
          <div class="absolute top-1/3 right-2 text-3xl opacity-5 select-none text-orange-200">ん</div>
        </div>
        <div class="w-full max-w-2xl mx-auto flex flex-col items-center relative z-10">
          <router-view v-slot="{ Component }">
            <Transition name="view-fade" mode="out-in">
              <component :is="Component" />
            </Transition>
          </router-view>
        </div>
      </main>

      <!-- ===== BARRA NAVIGAZIONE BOTTOM ===== -->
      <nav class="fixed bottom-0 w-full bg-white/95 backdrop-blur-xl border-t border-slate-200 z-50 shadow-[0_-8px_30px_rgba(236,72,153,0.06)] pt-0.5 pb-0.5"
        style="padding-bottom: max(env(safe-area-inset-bottom), 0.25rem);"
      >
        <div
          ref="navInnerRef"
          class="w-full max-w-lg mx-auto flex justify-around px-2 h-16 items-center select-none touch-none"
          style="-webkit-user-select: none; -webkit-touch-callout: none;"
          @pointerdown="onNavPointerDown"
          @pointermove="onNavPointerMove"
          @pointerup="onNavPointerUp"
        >
          <div
            ref="homeNavWrapRef"
            class="flex flex-col items-center justify-center"
          >
            <NavItem label="Home" :active="route.path === '/andrea' || route.path === '/erica'" :highlight="navDragOverPath === 'home'" color="dark">
              <BarChart2 :size="22" />
            </NavItem>
          </div>
          <div ref="navSlotHiraganaRef" class="flex flex-col items-center justify-center">
            <NavItem label="Hiragana" :active="isNavActive('/hiragana')" :highlight="navDragOverPath === '/hiragana'" color="pink" @click="goToNav('/hiragana')">
              <span class="text-xl font-black">あ</span>
            </NavItem>
          </div>
          <div ref="navSlotKatakanaRef" class="flex flex-col items-center justify-center">
            <NavItem label="Katakana" :active="isNavActive('/katakana')" :highlight="navDragOverPath === '/katakana'" color="blue" @click="goToNav('/katakana')">
              <span class="text-xl font-black leading-none">ア</span>
            </NavItem>
          </div>
          <div ref="navSlotVocabRef" class="flex flex-col items-center justify-center">
            <NavItem label="Vocaboli" :active="isNavActive('/vocab')" :highlight="navDragOverPath === '/vocab'" color="amber" @click="goToNav('/vocab')">
              <BookOpen :size="22" />
            </NavItem>
          </div>
        </div>
      </nav>

      <!-- Picker profilo: long-press su Home, due quadrati verticali sopra Home -->
      <Transition name="fade">
        <div
          v-if="profilePickerOpen"
          class="fixed z-[60] flex flex-col gap-2 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200 shadow-xl p-2"
          :style="profilePickerStyle"
        >
          <div
            ref="profileEricaRef"
            class="w-14 h-14 rounded-xl flex items-center justify-center border-2 transition-colors"
            :class="profilePickerHover === 'erica' ? 'border-pink-400 bg-pink-50' : 'border-slate-100 bg-slate-50'"
          >
            <img src="/avatar-erica.png" alt="Erica" class="w-10 h-10 object-contain" />
          </div>
          <div
            ref="profileAndreaRef"
            class="w-14 h-14 rounded-xl flex items-center justify-center border-2 transition-colors"
            :class="profilePickerHover === 'andrea' ? 'border-indigo-400 bg-indigo-50' : 'border-slate-100 bg-slate-50'"
          >
            <img src="/avatar-andrea.png" alt="Andrea" class="w-10 h-10 object-contain" />
          </div>
        </div>
      </Transition>

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
            >{{ store.confirmModal.confirmLabel || 'Reset' }}</button>
            <button
              class="flex-1 bg-slate-100 text-slate-500 font-black py-4 rounded-2xl uppercase tracking-widest transition-all active:bg-slate-200 text-sm"
              @click="store.confirmModal = null"
            >Annulla</button>
          </div>
        </div>
      </div>

      <!-- ===== FEEDBACK RISPOSTA (sbagliato, oppure corretto per Quiz Kana→Romaji) ===== -->
      <Transition name="slide-up">
        <div
          v-if="store.answerFeedback && (!store.answerFeedback.ok || store.quizType === 'vocab-kana-to-romaji')"
          ref="feedbackModalRef"
          tabindex="-1"
          class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[500] flex items-end justify-center outline-none"
          @keydown.enter.prevent="store.advanceAfterFeedback()"
        >
          <div class="bg-white w-full max-w-lg rounded-t-[2.5rem] shadow-2xl pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <!-- Handle -->
            <div class="flex justify-center pt-3 pb-2">
              <div class="w-10 h-1 bg-slate-200 rounded-full"></div>
            </div>

            <!-- Contenuto: errore o corretto (per vocab-kana-to-romaji) -->
            <div class="px-6 pt-2 pb-5 flex flex-col gap-5">
              <!-- Titolo -->
              <div class="flex items-center gap-3">
                <div class="text-4xl">{{ store.answerFeedback.ok && store.quizType === 'vocab-kana-to-romaji' ? '🎉' : '😅' }}</div>
                <div>
                  <p :class="['font-black text-xl uppercase tracking-widest', store.answerFeedback.ok && store.quizType === 'vocab-kana-to-romaji' ? 'text-emerald-500' : 'text-rose-500']">
                    {{ store.answerFeedback.ok && store.quizType === 'vocab-kana-to-romaji' ? 'Corretto!' : 'Quasi!' }}
                  </p>
                  <p class="text-slate-400 text-sm font-semibold">
                    {{ store.answerFeedback.ok && store.quizType === 'vocab-kana-to-romaji' ? 'Significato e pronuncia sotto' : 'Ripassala e vai avanti' }}
                  </p>
                </div>
              </div>

              <!-- Confronto risposta tua vs corretta (solo se sbagliato) -->
              <div v-if="!store.answerFeedback.ok" class="grid grid-cols-2 gap-3">
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

              <!-- Info parola: kana + romaji + significato (sempre, per Quiz Kana→Romaji anche quando corretto) -->
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
/* Section change: light fast fade */
.view-fade-enter-active,
.view-fade-leave-active {
  transition: opacity 0.1s ease-out;
}
.view-fade-enter-from,
.view-fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

/* Quiz saved toast: fade in/out */
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.25s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
}
</style>
