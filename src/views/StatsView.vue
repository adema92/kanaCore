<script setup>
import { computed, ref, watch, nextTick, onMounted } from 'vue'
import { RotateCcw, BookOpen } from 'lucide-vue-next'
import { useAppStore, INITIAL_KANA, INITIAL_KATAKANA, INITIAL_VOCAB } from '../stores/appStore'

const store = useAppStore()
const chartScrollRef = ref(null)
const selectedDayKey = ref(null)

const localToday = computed(() =>
  new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]
)

const statsData = computed(() => {
  const today = localToday.value
  const range = store.statsTimeRange === 'giorno' ? 'settimana' : store.statsTimeRange
  const days = range === 'mese' ? 30 : 7
  return Array.from({ length: days }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (days - 1 - i))
    const key = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0]
    const raw = store.dailyStats[key]
    const kana = raw?.kana && typeof raw.kana === 'object' ? { total: raw.kana.total ?? 0, correct: raw.kana.correct ?? 0 } : { total: raw?.total ?? 0, correct: raw?.correct ?? 0 }
    const katakana = raw?.katakana && typeof raw.katakana === 'object' ? { total: raw.katakana.total ?? 0, correct: raw.katakana.correct ?? 0 } : { total: 0, correct: 0 }
    const vocab = raw?.vocab && typeof raw.vocab === 'object' ? { total: raw.vocab.total ?? 0, correct: raw.vocab.correct ?? 0 } : { total: 0, correct: 0 }
    const total = (kana.total + katakana.total + vocab.total) || 0
    const correct = (kana.correct + katakana.correct + vocab.correct) || 0
    const isToday = key === today
    const label = range === 'mese'
      ? d.getDate().toString()
      : d.toLocaleDateString('it-IT', { weekday: 'short' })
    const kanaTotalCombined = kana.total + katakana.total
    const kanaCorrectCombined = kana.correct + katakana.correct
    const kanaWrongCombined = (kana.total - kana.correct) + (katakana.total - katakana.correct)
    return {
      key,
      label,
      isToday,
      total,
      correct,
      wrong: total - correct,
      kanaTotal: kanaTotalCombined,
      kanaCorrect: kanaCorrectCombined,
      kanaWrong: kanaWrongCombined,
      katakanaTotal: katakana.total,
      katakanaCorrect: katakana.correct,
      katakanaWrong: (katakana.total - katakana.correct) || 0,
      vocabTotal: vocab.total,
      vocabCorrect: vocab.correct,
      vocabWrong: (vocab.total - vocab.correct) || 0,
    }
  })
})

const maxVal = computed(() => Math.max(...statsData.value.map(d => d.total), 10))

// Totali del periodo (settimana o mese) per il grafico a barre.
const periodCorrect = computed(() => statsData.value.reduce((a, d) => a + d.correct, 0))
const periodTotal = computed(() => statsData.value.reduce((a, d) => a + d.total, 0))
const periodWrong = computed(() => periodTotal.value - periodCorrect.value)
const periodKanaCorrect = computed(() => statsData.value.reduce((a, d) => a + d.kanaCorrect, 0))
const periodKanaWrong = computed(() => statsData.value.reduce((a, d) => a + d.kanaWrong, 0))
const periodVocabCorrect = computed(() => statsData.value.reduce((a, d) => a + d.vocabCorrect, 0))
const periodVocabWrong = computed(() => statsData.value.reduce((a, d) => a + d.vocabWrong, 0))

// Riepilogo sotto il grafico: giorno selezionato o totali periodo.
const displayedSummary = computed(() => {
  if (selectedDayKey.value) {
    const day = statsData.value.find((d) => d.key === selectedDayKey.value)
    if (day) {
      return {
        kanaCorrect: day.kanaCorrect,
        kanaWrong: day.kanaWrong,
        vocabCorrect: day.vocabCorrect,
        vocabWrong: day.vocabWrong,
        total: day.total,
        label: day.label,
        isDay: true,
      }
    }
  }
  return {
    kanaCorrect: periodKanaCorrect.value,
    kanaWrong: periodKanaWrong.value,
    vocabCorrect: periodVocabCorrect.value,
    vocabWrong: periodVocabWrong.value,
    total: periodTotal.value,
    label: store.statsTimeRange === 'mese' ? '30g' : '7g',
    isDay: false,
  }
})

const displayedSummaryTitle = computed(() =>
  displayedSummary.value.isDay
    ? `Giorno: ${displayedSummary.value.label}`
    : `Periodo (${displayedSummary.value.label})`
)

// Totali solo per oggi (grafici a torta Kana / Katakana / Vocaboli).
const dayStats = computed(() => {
  const raw = store.dailyStats[localToday.value]
  const kana = raw?.kana && typeof raw.kana === 'object' ? { total: raw.kana.total ?? 0, correct: raw.kana.correct ?? 0 } : { total: raw?.total ?? 0, correct: raw?.correct ?? 0 }
  const katakana = raw?.katakana && typeof raw.katakana === 'object' ? { total: raw.katakana.total ?? 0, correct: raw.katakana.correct ?? 0 } : { total: 0, correct: 0 }
  const vocab = raw?.vocab && typeof raw.vocab === 'object' ? { total: raw.vocab.total ?? 0, correct: raw.vocab.correct ?? 0 } : { total: 0, correct: 0 }
  return {
    total: (kana.total + katakana.total + vocab.total) || 0,
    correct: (kana.correct + katakana.correct + vocab.correct) || 0,
    wrong: ((kana.total - kana.correct) + (katakana.total - katakana.correct) + (vocab.total - vocab.correct)) || 0,
    kana: { total: kana.total, correct: kana.correct, wrong: (kana.total - kana.correct) || 0 },
    katakana: { total: katakana.total, correct: katakana.correct, wrong: (katakana.total - katakana.correct) || 0 },
    vocab: { total: vocab.total, correct: vocab.correct, wrong: (vocab.total - vocab.correct) || 0 },
  }
})
const dayCorrectPct = computed(() =>
  dayStats.value.total > 0 ? Math.round((dayStats.value.correct / dayStats.value.total) * 100) : 0
)
const dayWrongPct = computed(() =>
  dayStats.value.total > 0 ? Math.round((dayStats.value.wrong / dayStats.value.total) * 100) : 0
)
const dayKanaCorrectPct = computed(() =>
  dayStats.value.kana.total > 0 ? Math.round((dayStats.value.kana.correct / dayStats.value.kana.total) * 100) : 0
)
const dayKanaWrongPct = computed(() =>
  dayStats.value.kana.total > 0 ? Math.round((dayStats.value.kana.wrong / dayStats.value.kana.total) * 100) : 0
)
const dayKatakanaCorrectPct = computed(() =>
  dayStats.value.katakana.total > 0 ? Math.round((dayStats.value.katakana.correct / dayStats.value.katakana.total) * 100) : 0
)
const dayKatakanaWrongPct = computed(() =>
  dayStats.value.katakana.total > 0 ? Math.round((dayStats.value.katakana.wrong / dayStats.value.katakana.total) * 100) : 0
)
const dayVocabCorrectPct = computed(() =>
  dayStats.value.vocab.total > 0 ? Math.round((dayStats.value.vocab.correct / dayStats.value.vocab.total) * 100) : 0
)
const dayVocabWrongPct = computed(() =>
  dayStats.value.vocab.total > 0 ? Math.round((dayStats.value.vocab.wrong / dayStats.value.vocab.total) * 100) : 0
)

// Percentuale corrette/errate nel periodo (riepilogo barre).
const periodCorrectPct = computed(() =>
  periodTotal.value > 0 ? Math.round((periodCorrect.value / periodTotal.value) * 100) : 0
)
const periodWrongPct = computed(() =>
  periodTotal.value > 0 ? Math.round((periodWrong.value / periodTotal.value) * 100) : 0
)

// Giorni consecutivi: salta giorni senza attività, poi conta indietro i giorni con attività (allineato al grafico).
const consecutiveDays = computed(() => {
  const stats = store.dailyStats
  const d = new Date()
  let count = 0
  let foundActive = false
  for (let i = 0; i < 365; i++) {
    const key = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0]
    const raw = stats[key]
    const kanaRaw = raw?.kana && typeof raw.kana === 'object' ? (raw.kana.total ?? 0) : (raw?.total ?? 0)
    const katakanaRaw = raw?.katakana && typeof raw.katakana === 'object' ? (raw.katakana.total ?? 0) : 0
    const vocabTotal = raw?.vocab && typeof raw.vocab === 'object' ? (raw.vocab.total ?? 0) : 0
    const total = (kanaRaw + katakanaRaw + vocabTotal) || (raw?.total ?? 0)
    if (total > 0) {
      foundActive = true
      count++
    } else if (foundActive) {
      break
    }
    d.setDate(d.getDate() - 1)
  }
  return count
})

// Immagine streak: 1–23 giorni mappati su /1.png … /23.png.
const streakImage = computed(() => {
  const days = consecutiveDays.value
  if (!days || days < 1) return '/1.png'
  const clamped = Math.min(days, 23)
  return `/${clamped}.png`
})

const totalAnswers = computed(() => Object.values(store.dailyStats).reduce((a, d) => a + (d.total || 0), 0))
const totalCorrect = computed(() => Object.values(store.dailyStats).reduce((a, d) => a + (d.correct || 0), 0))

// Al cambio periodo (7g/30g) scrolla a destra per portare in vista l'ultima barra.
watch(
  () => store.statsTimeRange,
  () => {
    selectedDayKey.value = null
    nextTick(() => {
      const el = chartScrollRef.value
      if (el) el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' })
    })
  }
)

onMounted(() => {
  if (store.statsTimeRange === 'giorno') store.statsTimeRange = 'settimana'
  nextTick(() => {
    const el = chartScrollRef.value
    if (el) el.scrollTo({ left: el.scrollWidth, behavior: 'auto' })
  })
})

function resetKana() {
  store.confirmModal = {
    title: 'Reset Kana',
    text: 'Vuoi azzerare i progressi dei Kana e il grafico Kana oggi?',
    onConfirm: () => {
      store.resetTodayChart('kana')
      const reset = INITIAL_KANA.map(k => ({ ...k, score: 0, attempts: 0 }))
      store.kanaData = reset
      store.saveNow().catch(() => {})
      store.confirmModal = null
    },
  }
}

function resetVocab() {
  store.confirmModal = {
    title: 'Reset Vocaboli',
    text: 'Vuoi azzerare i progressi dei Vocaboli e il grafico Vocaboli oggi?',
    onConfirm: () => {
      store.resetTodayChart('vocab')
      const reset = INITIAL_VOCAB.map(v => ({ ...v, score: 0, attempts: 0 }))
      store.vocabData = reset
      store.saveNow().catch(() => {})
      store.confirmModal = null
    },
  }
}

function resetKatakana() {
  store.confirmModal = {
    title: 'Reset Katakana',
    text: 'Vuoi azzerare i progressi dei Katakana e il grafico Katakana oggi?',
    onConfirm: () => {
      store.resetTodayChart('katakana')
      const reset = INITIAL_KATAKANA.map(k => ({ ...k, score: 0, attempts: 0 }))
      store.katakanaData = reset
      store.saveNow().catch(() => {})
      store.confirmModal = null
    },
  }
}

function resetHistory() {
  store.confirmModal = {
    title: 'Reset Storico',
    text: 'Vuoi azzerare lo storico dei quiz (grafici e giorni consecutivi)?',
    onConfirm: () => {
      store.dailyStats = {}
      store.saveNow().catch(() => {})
      store.confirmModal = null
    },
  }
}

const selectDay = (key) => {
  selectedDayKey.value = selectedDayKey.value === key ? null : key
}
</script>

<template>
  <div class="w-full px-4 space-y-4 pb-6">

    <!-- Banner principale: Onigiri Sensei (logo Erica solo per profilo Erica) -->
    <div class="w-full relative overflow-hidden bg-transparent max-w-sm mx-auto">
      <img
        :src="store.currentProfile === 'erica' ? '/erica-home-logo.png' : '/andrea-home-logo.png'"
        :alt="store.currentProfile === 'erica' ? 'Onigiri Sensei – La via del riso' : 'Onigiri Sensei'"
        class="w-full h-auto object-contain object-center block max-h-56"
      />
    </div>
    <div class="border-b border-slate-200 w-full mt-2" aria-hidden="true"></div>

    <!-- Card statistiche padronanza -->
    <div class="grid grid-cols-2 gap-3">
      <div class="bg-white rounded-3xl shadow-sm border border-pink-50 p-5 flex flex-col">
        <div class="min-h-[1.25rem] flex items-center">
          <span class="text-[11px] font-black text-pink-400 uppercase tracking-widest">Kana</span>
        </div>
        <div class="text-4xl font-black text-slate-700">
          {{ store.kanaData.filter(k => k.score >= 80).length + store.katakanaData.filter(k => k.score >= 80).length }}
        </div>
        <div class="mt-2 h-1.5 bg-pink-50 rounded-full overflow-hidden">
          <div
            class="h-full bg-pink-400 rounded-full transition-all duration-700"
            :style="{ width: (store.kanaData.length + store.katakanaData.length) ? `${((store.kanaData.filter(k => k.score >= 80).length + store.katakanaData.filter(k => k.score >= 80).length) / (store.kanaData.length + store.katakanaData.length)) * 100}%` : '0%' }"
          ></div>
        </div>
        <span class="pt-2 text-[11px] text-slate-300 font-bold">{{ store.kanaData.length + store.katakanaData.length }} totale</span>
      </div>
      <div class="bg-white rounded-3xl shadow-sm border border-violet-50 p-5 flex flex-col">
        <div class="min-h-[1.25rem] flex items-center">
          <span class="text-[11px] font-black text-green-600 uppercase tracking-widest">Vocaboli</span>
        </div>
        <div class="text-4xl font-black text-slate-700">
          {{ store.vocabData.filter(v => v.score >= 80).length }}
        </div>
        <div class="mt-2 h-1.5 bg-violet-50 rounded-full overflow-hidden">
          <div
            class="h-full bg-violet-400 rounded-full transition-all duration-700"
            :style="{ width: store.vocabData.length ? `${(store.vocabData.filter(v => v.score >= 80).length / store.vocabData.length) * 100}%` : '0%' }"
          ></div>
        </div>
        <span class="pt-2 text-[11px] text-slate-300 font-bold">{{ store.vocabData.length }} totale</span>
      </div>
    </div>

    <!-- Giorni consecutivi: icona streak + numero -->
    <div class="bg-white rounded-3xl shadow-sm border border-amber-50 p-5 flex flex-col justify-center">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <img :src="streakImage" alt="Streak giorni consecutivi" class="w-12 h-12 object-contain shrink-0" />
        </div>
        <h2 class="text-xs font-black text-slate-400 uppercase tracking-widest text-center ">Giorni <br> consecutivi</h2>
        <div class="flex items-center gap-1">
          <span class="text-5xl font-black text-gradient-rise">{{ consecutiveDays }}</span>
        </div>
      </div>
    </div>

    <!-- Kana oggi: viola chiaro palette calda -->
    <div class="bg-white rounded-3xl shadow-sm border border-violet-50/80 p-4 sm:p-5">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xs sm:text-sm font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <span class="text-pink-400">あ</span> Hiragana oggi
        </h2>
        <button
          type="button"
          class="p-1.5 rounded-full border border-pink-100 text-pink-300 hover:bg-pink-50 active:scale-95 transition-all"
          title="Reset progressi Kana"
          @click="resetKana"
        >
          <RotateCcw :size="13" />
        </button>
      </div>
      <div class="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
        <div class="relative shrink-0">
          <div
            class="w-28 h-28 sm:w-32 sm:h-32 rounded-full transition-all duration-500"
            :style="{
              background: dayStats.kana.total > 0
                ? `conic-gradient(#c4b5fd 0% ${dayKanaCorrectPct}%, #f9a8d4 ${dayKanaCorrectPct}% 100%)`
                : 'conic-gradient(#e2e8f0 0%, #e2e8f0 100%)'
            }"
          />
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white shadow-inner flex items-center justify-center">
              <span v-if="dayStats.kana.total > 0" class="text-lg sm:text-xl font-black text-violet-500">{{ dayKanaCorrectPct }}%</span>
              <span v-else class="text-xs font-bold text-slate-300">—</span>
            </div>
          </div>
        </div>
        <div class="flex-1 space-y-2 min-w-0 w-full">
          <div class="flex items-center justify-between py-2 px-3 bg-violet-50/80 rounded-lg border border-violet-100/80">
            <span class="text-[10px] sm:text-[11px] font-bold text-violet-500 uppercase tracking-wider">Corretti</span>
            <span class="font-bold text-violet-500 text-sm">{{ dayStats.kana.correct }}</span>
          </div>
          <div class="flex items-center justify-between py-2 px-3 bg-pink-50 rounded-lg border border-pink-200">
            <span class="text-[10px] sm:text-[11px] font-bold text-pink-500 uppercase tracking-wider">Errati</span>
            <span class="font-bold text-pink-500 text-sm">{{ dayStats.kana.wrong }}</span>
          </div>
          <div class="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg border border-slate-100">
            <span class="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Totale</span>
            <span class="font-bold text-slate-600 text-sm">{{ dayStats.kana.total }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Katakana oggi: stile blu come sezione Katakana -->
    <div class="bg-white rounded-3xl shadow-sm border border-blue-50/80 p-4 sm:p-5">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xs sm:text-sm font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <span class="text-blue-500">ア</span> Katakana oggi
        </h2>
        <button
          type="button"
          class="p-1.5 rounded-full border border-blue-100 text-blue-400 hover:bg-blue-50 active:scale-95 transition-all"
          title="Reset progressi Katakana"
          @click="resetKatakana"
        >
          <RotateCcw :size="13" />
        </button>
      </div>
      <div class="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
        <div class="relative shrink-0">
          <div
            class="w-28 h-28 sm:w-32 sm:h-32 rounded-full transition-all duration-500"
            :style="{
              background: dayStats.katakana.total > 0
                ? `conic-gradient(rgb(168 249 173) 0% ${dayKatakanaCorrectPct}%, #63a8eb ${dayKatakanaCorrectPct}% 100%)`
                : 'conic-gradient(#e2e8f0 0%, #e2e8f0 100%)'
            }"
          />
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white shadow-inner flex items-center justify-center">
              <span v-if="dayStats.katakana.total > 0" class="text-lg sm:text-xl font-black text-[#16a34a]">{{ dayKatakanaCorrectPct }}%</span>
              <span v-else class="text-xs font-bold text-slate-300">—</span>
            </div>
          </div>
        </div>
        <div class="flex-1 space-y-2 min-w-0 w-full">
          <div class="flex items-center justify-between py-2 px-3 bg-[rgb(168_249_173)]/80 rounded-lg border border-[#86efac]">
            <span class="text-[10px] sm:text-[11px] font-bold text-[#16a34a] uppercase tracking-wider">Corretti</span>
            <span class="font-bold text-[#16a34a] text-sm">{{ dayStats.katakana.correct }}</span>
          </div>
          <div class="flex items-center justify-between py-2 px-3 bg-blue-50 rounded-lg border border-blue-200">
            <span class="text-[10px] sm:text-[11px] font-bold text-blue-600 uppercase tracking-wider">Errati</span>
            <span class="font-bold text-blue-600 text-sm">{{ dayStats.katakana.wrong }}</span>
          </div>
          <div class="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg border border-slate-100">
            <span class="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Totale</span>
            <span class="font-bold text-slate-600 text-sm">{{ dayStats.katakana.total }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Vocaboli oggi: verde + rossi caldi per errate -->
    <div class="bg-white rounded-3xl shadow-sm border border-emerald-50/80 p-4 sm:p-5">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xs sm:text-sm font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <span class="text-green-600"><BookOpen :size="12" class="shrink-0" /></span> Vocaboli oggi
        </h2>
        <button
          type="button"
          class="p-1.5 rounded-full border border-emerald-100 text-emerald-300 hover:bg-emerald-50 active:scale-95 transition-all"
          title="Reset progressi Vocaboli"
          @click="resetVocab"
        >
          <RotateCcw :size="13" />
        </button>
      </div>
      <div class="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
        <div class="relative shrink-0">
          <div
            class="w-28 h-28 sm:w-32 sm:h-32 rounded-full transition-all duration-500"
            :style="{
              background: dayStats.vocab.total > 0
                ? `conic-gradient(#34d399 0% ${dayVocabCorrectPct}%, #f9a8d4 ${dayVocabCorrectPct}% 100%)`
                : 'conic-gradient(#e2e8f0 0%, #e2e8f0 100%)'
            }"
          />
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white shadow-inner flex items-center justify-center">
              <span v-if="dayStats.vocab.total > 0" class="text-lg sm:text-xl font-black text-emerald-600">{{ dayVocabCorrectPct }}%</span>
              <span v-else class="text-xs font-bold text-slate-300">—</span>
            </div>
          </div>
        </div>
        <div class="flex-1 space-y-2 min-w-0 w-full">
          <div class="flex items-center justify-between py-2 px-3 bg-emerald-50/80 rounded-lg border border-emerald-100/80">
            <span class="text-[10px] sm:text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Corretti</span>
            <span class="font-bold text-emerald-600 text-sm">{{ dayStats.vocab.correct }}</span>
          </div>
          <div class="flex items-center justify-between py-2 px-3 bg-pink-50 rounded-lg border border-pink-200">
            <span class="text-[10px] sm:text-[11px] font-bold text-pink-500 uppercase tracking-wider">Errati</span>
            <span class="font-bold text-pink-500 text-sm">{{ dayStats.vocab.wrong }}</span>
          </div>
          <div class="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg border border-slate-100">
            <span class="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Totale</span>
            <span class="font-bold text-slate-600 text-sm">{{ dayStats.vocab.total }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Storico: palette rosa calda; legenda 2x2 -->
    <div class="bg-white rounded-3xl shadow-sm border border-pink-100 p-4 sm:p-5">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div class="flex items-center gap-2">
          <h2 class="text-xs sm:text-sm font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <span>📈</span> Storico (Kana + Vocaboli)
          </h2>
          <button
            type="button"
            class="p-1.5 rounded-full border border-pink-100 text-pink-300 hover:bg-pink-50 active:scale-95 transition-all"
            title="Reset storico grafici"
            @click="resetHistory"
          >
            <RotateCcw :size="13" />
          </button>
        </div>
        <div class="flex bg-pink-100/80 p-0.5 sm:p-1 rounded-lg sm:rounded-xl gap-0.5 shrink-0 min-w-0">
          <button
            v-for="tr in ['settimana', 'mese']"
            :key="tr"
            :class="[
              'text-[10px] sm:text-xs font-bold py-1.5 px-2 sm:py-2 sm:px-3 rounded-md sm:rounded-lg uppercase transition-all tracking-tight sm:tracking-widest flex-1 min-w-0 truncate',
              store.statsTimeRange === tr
                ? 'bg-white text-pink-600 shadow-sm'
                : 'text-slate-400'
            ]"
            :title="tr === 'settimana' ? 'Ultimi 7 giorni' : 'Ultimi 30 giorni'"
            @click="store.statsTimeRange = tr"
          >{{ tr === 'settimana' ? '7g' : '30g' }}</button>
        </div>
      </div>

      <!-- Barre: toni rosa caldi -->
      <div
        ref="chartScrollRef"
        class="flex items-end justify-between gap-2 px-1 overflow-x-auto"
        style="height: 140px; min-height: 140px;"
      >
        <div
          v-for="(d, i) in statsData"
          :key="i"
          class="flex-1 min-w-0 flex flex-col items-center h-full justify-end shrink-0 cursor-pointer touch-manipulation"
          :class="{ 'min-w-[24px]': store.statsTimeRange === 'mese' }"
          @click="selectDay(d.key)"
        >
          <div class="w-full flex-1 flex flex-col justify-end">
            <div
              :class="[
                'w-full relative overflow-hidden rounded-t-lg transition-all duration-700',
              d.isToday && d.total === 0 ? 'border-2 border-dashed border-[#542e71]' :
              d.total > 0 ? 'bg-slate-50/50 border border-slate-200' : 'border border-dashed border-slate-100'
              ]"
              :style="{ height: d.total > 0 ? `${Math.max(10, (d.total / maxVal) * 100)}%` : d.isToday ? '14px' : '6px' }"
              :title="`Kana: ${d.kanaCorrect} corretti, ${d.kanaWrong} errati · Vocaboli: ${d.vocabCorrect} corretti, ${d.vocabWrong} errati`"
            >
              <template v-if="d.total > 0">
                <div
                  class="absolute left-0 right-0 bg-[#b3cbb9] transition-all duration-700"
                  :style="{ height: `${(d.kanaCorrect / d.total) * 100}%`, bottom: 0 }"
                />
                <div
                  v-if="d.kanaWrong > 0"
                  class="absolute left-0 right-0 bg-[#ddd8b8] transition-all duration-700"
                  :style="{ height: `${(d.kanaWrong / d.total) * 100}%`, bottom: `${(d.kanaCorrect / d.total) * 100}%` }"
                />
                <div
                  v-if="d.vocabCorrect > 0"
                  class="absolute left-0 right-0 bg-[#84a9c0] transition-all duration-700"
                  :style="{ height: `${(d.vocabCorrect / d.total) * 100}%`, bottom: `${(d.kanaTotal / d.total) * 100}%` }"
                />
                <div
                  v-if="d.vocabWrong > 0"
                  class="absolute left-0 right-0 bg-[#6a66a3] transition-all duration-700"
                  :style="{ height: `${(d.vocabWrong / d.total) * 100}%`, bottom: `${((d.kanaTotal + d.vocabCorrect) / d.total) * 100}%` }"
                />
              </template>
            </div>
          </div>
          <span v-if="d.total > 0" class="text-[8px] sm:text-[9px] font-bold text-slate-500 mt-0.5">{{ d.total }}</span>
          <span
            :class="[
              'text-[9px] sm:text-[10px] font-bold mt-0.5 uppercase truncate max-w-full',
              selectedDayKey === d.key ? 'text-red-500 font-black' : 'text-slate-400'
            ]"
          >{{ d.label }}</span>
        </div>
      </div>

      <!-- Riepilogo: dati del giorno selezionato o del periodo -->
      <div class="flex flex-col gap-2 mt-3">
        <p class="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">
          {{ displayedSummaryTitle }}
        </p>
        <div class="grid grid-cols-[1fr_auto_1fr] gap-0 py-3 px-4 sm:py-4 sm:px-6 bg-slate-50/80 rounded-xl sm:rounded-2xl border border-slate-100 text-[11px] sm:text-[12px] w-full max-w-md mx-auto">
          <div class="flex flex-col items-center gap-1">
            <span class="font-bold text-slate-400 uppercase tracking-wider">Kana</span>
            <span class="text-slate-500"><span class="font-bold">{{ displayedSummary.kanaCorrect }}</span> corretti</span>
            <span class="text-slate-500"><span class="font-bold">{{ displayedSummary.kanaWrong }}</span> errati</span>
          </div>
          <div class="w-px self-stretch bg-slate-200 min-h-[2.5rem]" aria-hidden="true"></div>
          <div class="flex flex-col items-center gap-1">
            <span class="font-bold text-slate-400 uppercase tracking-wider">Vocaboli</span>
            <span class="text-slate-500"><span class="font-bold">{{ displayedSummary.vocabCorrect }}</span> corrette</span>
            <span class="text-slate-500"><span class="font-bold">{{ displayedSummary.vocabWrong }}</span> errati</span>
          </div>
        </div>
        <div class="flex items-center justify-center gap-2 py-2 px-3 text-[11px] sm:text-[12px]">
          <span class="font-semibold text-slate-500">{{ displayedSummary.total }} tot</span>
        </div>
        <p v-if="selectedDayKey" class="text-[9px] text-slate-400 text-center">Tocca di nuovo la barra per tornare al riepilogo periodo</p>
      </div>

      <!-- Legenda: palette Coolors per storico -->
      <div class="grid grid-cols-2 gap-x-6 gap-y-2 mt-2 sm:mt-3 text-[9px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wider max-w-xs mx-auto">
        <div class="flex items-center gap-1.5">
          <div class="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm bg-[#b3cbb9] shrink-0"></div>
          <span>Kana corretti</span>
        </div>
        <div class="flex items-center gap-1.5">
          <div class="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm bg-[#ddd8b8] shrink-0"></div>
          <span>Kana errati</span>
        </div>
        <div class="flex items-center gap-1.5">
          <div class="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm bg-[#84a9c0] shrink-0"></div>
          <span>Vocaboli corretti</span>
        </div>
        <div class="flex items-center gap-1.5">
          <div class="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm bg-[#6a66a3] shrink-0"></div>
          <span>Vocaboli errati</span>
        </div>
      </div>
    </div>

    <!-- Reset buttons -->
    <div class="flex gap-3 w-full">
      <button
        class="flex-1 bg-rose-50 text-rose-400 font-black py-4 rounded-2xl text-xs border border-rose-100 flex items-center justify-center gap-2 active:scale-95 transition-transform uppercase tracking-widest"
        @click="resetKana"
      >
        <RotateCcw :size="15" /> Reset Kana
      </button>
      <button
        class="flex-1 bg-rose-50 text-rose-400 font-black py-4 rounded-2xl text-xs border border-rose-100 flex items-center justify-center gap-2 active:scale-95 transition-transform uppercase tracking-widest"
        @click="resetVocab"
      >
        <RotateCcw :size="15" /> Reset Vocaboli
      </button>
    </div>

  </div>
</template>
