<script setup>
import { computed } from 'vue'
import { RotateCcw } from 'lucide-vue-next'
import { useAppStore, INITIAL_KANA, INITIAL_VOCAB } from '../stores/appStore'

const store = useAppStore()

const statsData = computed(() => {
  const localToday = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
    .toISOString().split('T')[0]

  if (store.statsTimeRange === 'giorno') {
    return [{
      label: 'Oggi',
      total: store.dailyStats[localToday]?.total || 0,
      correct: store.dailyStats[localToday]?.correct || 0,
      isToday: true,
    }]
  }

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const key = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0]
    const s = store.dailyStats[key] || { total: 0, correct: 0 }
    const isToday = key === localToday
    return { label: isToday ? 'Oggi' : d.toLocaleDateString('it-IT', { weekday: 'short' }), isToday, ...s }
  })
})

const maxVal = computed(() => Math.max(...statsData.value.map(d => d.total), 10))

const totalAnswers = computed(() => Object.values(store.dailyStats).reduce((a, d) => a + (d.total || 0), 0))
const totalCorrect = computed(() => Object.values(store.dailyStats).reduce((a, d) => a + (d.correct || 0), 0))

function resetKana() {
  store.confirmModal = {
    title: 'Reset Kana',
    text: 'Vuoi azzerare i progressi dei Kana?',
    onConfirm: () => {
      const reset = INITIAL_KANA.map(k => ({ ...k, score: 0, attempts: 0 }))
      store.kanaData = reset
      store.sync({ kanaData: reset })
      store.confirmModal = null
    },
  }
}

function resetVocab() {
  store.confirmModal = {
    title: 'Reset Parole',
    text: 'Vuoi azzerare i progressi delle Parole?',
    onConfirm: () => {
      const reset = INITIAL_VOCAB.map(v => ({ ...v, score: 0, attempts: 0 }))
      store.vocabData = reset
      store.sync({ vocabData: reset })
      store.confirmModal = null
    },
  }
}
</script>

<template>
  <div class="w-full px-4 space-y-4 pb-6">

    <!-- Header hero -->
    <div class="bg-gradient-to-br from-indigo-400 via-violet-400 to-purple-500 p-6 rounded-3xl text-white shadow-lg text-center w-full relative overflow-hidden">
      <div class="absolute -top-2 -right-2 opacity-10 text-[80px] leading-none">📊</div>
      <div class="text-4xl mb-1">🌸</div>
      <h1 class="text-2xl font-black mb-0.5 uppercase tracking-tight">I tuoi progressi</h1>
      <p class="text-indigo-100 text-xs font-semibold opacity-80 uppercase tracking-widest">
        {{ totalAnswers }} risposte totali
      </p>
    </div>

    <!-- Card statistiche padronanza -->
    <div class="grid grid-cols-2 gap-3">
      <div class="bg-white rounded-3xl shadow-sm border border-pink-50 p-5">
        <span class="text-[11px] font-black text-pink-400 uppercase block mb-1 tracking-widest">🌸 Kana</span>
        <div class="text-4xl font-black text-slate-700">
          {{ store.kanaData.filter(k => k.score >= 80).length }}
        </div>
        <div class="mt-2 h-1.5 bg-pink-50 rounded-full overflow-hidden">
          <div
            class="h-full bg-pink-400 rounded-full transition-all duration-700"
            :style="{ width: store.kanaData.length ? `${(store.kanaData.filter(k => k.score >= 80).length / store.kanaData.length) * 100}%` : '0%' }"
          ></div>
        </div>
        <span class="text-[11px] text-slate-300 font-bold">{{ store.kanaData.length }} totali</span>
      </div>
      <div class="bg-white rounded-3xl shadow-sm border border-emerald-50 p-5">
        <span class="text-[11px] font-black text-emerald-500 uppercase block mb-1 tracking-widest">🌿 Parole</span>
        <div class="text-4xl font-black text-slate-700">
          {{ store.vocabData.filter(v => v.score >= 80).length }}
        </div>
        <div class="mt-2 h-1.5 bg-emerald-50 rounded-full overflow-hidden">
          <div
            class="h-full bg-emerald-400 rounded-full transition-all duration-700"
            :style="{ width: store.vocabData.length ? `${(store.vocabData.filter(v => v.score >= 80).length / store.vocabData.length) * 100}%` : '0%' }"
          ></div>
        </div>
        <span class="text-[11px] text-slate-300 font-bold">{{ store.vocabData.length }} totali</span>
      </div>
    </div>

    <!-- Grafico attività -->
    <div class="bg-white rounded-3xl shadow-sm border border-indigo-50 p-5">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-sm font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
          <span>📈</span> Attività
        </h2>
        <!-- Toggle giorno/settimana -->
        <div class="flex bg-slate-100 p-1 rounded-xl gap-1">
          <button
            v-for="tr in ['giorno', 'settimana']"
            :key="tr"
            :class="[
              'text-xs font-black py-2 px-3 rounded-lg uppercase transition-all tracking-widest',
              store.statsTimeRange === tr
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-400'
            ]"
            @click="store.statsTimeRange = tr"
          >{{ tr }}</button>
        </div>
      </div>

      <!-- Barre -->
      <div class="flex items-end justify-between gap-2 px-1" style="height: 140px;">
        <div
          v-for="(d, i) in statsData"
          :key="i"
          class="flex-1 flex flex-col items-center h-full justify-end"
        >
          <div class="w-full flex-1 flex flex-col justify-end">
            <div
              :class="[
                'w-full relative overflow-hidden rounded-t-lg transition-all duration-700',
                d.isToday && d.total === 0 ? 'border-2 border-dashed border-indigo-300' :
                d.total > 0 ? 'bg-indigo-100 border border-indigo-200' : 'border border-dashed border-slate-100'
              ]"
              :style="{ height: d.total > 0 ? `${Math.max(10, (d.total / maxVal) * 100)}%` : d.isToday ? '14px' : '6px' }"
              :title="`${d.total} risposte, ${d.correct} corrette`"
            >
              <div
                v-if="d.total > 0"
                class="absolute bottom-0 w-full bg-emerald-400 transition-all duration-700"
                :style="{ height: `${(d.correct / d.total) * 100}%` }"
              ></div>
            </div>
          </div>
          <span v-if="d.total > 0" class="text-[9px] font-black text-indigo-500 mt-0.5">{{ d.total }}</span>
          <span
            :class="[
              'text-[10px] font-bold mt-0.5 uppercase',
              d.isToday ? 'text-indigo-500 font-black' : 'text-slate-400'
            ]"
          >{{ d.label }}</span>
        </div>
      </div>

      <!-- Legenda -->
      <div class="flex items-center justify-center gap-5 mt-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
        <div class="flex items-center gap-1.5">
          <div class="w-3 h-3 rounded-sm bg-indigo-100 border border-indigo-200"></div>
          Totale
        </div>
        <div class="flex items-center gap-1.5">
          <div class="w-3 h-3 rounded-sm bg-emerald-400"></div>
          Corrette
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
        <RotateCcw :size="15" /> Reset Parole
      </button>
    </div>

  </div>
</template>
