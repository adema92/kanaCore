<script setup>
import { computed } from 'vue'
import { Brain, GraduationCap, BookOpen } from 'lucide-vue-next'
import { useAppStore } from '../stores/appStore'

const store = useAppStore()

const kanaToReview = computed(() => store.kanaData.filter(k => k.score < 80))
const vocabToReview = computed(() => store.vocabData.filter(v => v.score < 80))
const totalToReview = computed(() => kanaToReview.value.length + vocabToReview.value.length)
</script>

<template>
  <div class="w-full px-4 space-y-4 pb-6">

    <!-- Header Ripasso -->
    <div class="bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-500 p-6 rounded-3xl text-white shadow-xl text-center w-full relative overflow-hidden">
      <div class="absolute -top-2 -right-2 opacity-10 text-[80px] leading-none">🎓</div>
      <div class="text-4xl mb-2 animate-pulse">🧠</div>
      <h1 class="text-2xl font-black mb-0.5">Ripasso</h1>
      <p class="text-blue-100 text-xs font-semibold uppercase tracking-widest opacity-80">
        {{ totalToReview }} elementi da migliorare
      </p>
    </div>

    <!-- Sezione Kana -->
    <div class="bg-white rounded-3xl shadow-sm border border-pink-50 overflow-hidden">
      <div class="px-5 py-4 border-b border-pink-50 flex items-center justify-between">
        <div>
          <p class="text-[11px] font-black text-pink-400 uppercase tracking-[0.3em]">🌸 Kana da ripassare</p>
          <p class="text-2xl font-black text-slate-700 mt-0.5">
            {{ kanaToReview.length }}
            <span class="text-base font-bold text-slate-300">/ {{ store.kanaData.length }}</span>
          </p>
        </div>
        <div class="text-3xl opacity-20">あ</div>
      </div>
      <div class="flex gap-3 p-4">
        <button
          class="w-full bg-pink-50 text-pink-500 font-black py-4 rounded-2xl text-sm flex items-center justify-center gap-2 uppercase tracking-widest active:scale-95 transition-all border border-pink-100"
          @click="store.handleStartQuizClick('kana', kanaToReview)"
        >
          <BookOpen :size="16" /> Lettura Kana
        </button>
      </div>
    </div>

    <!-- Sezione Vocabolario -->
    <div class="bg-white rounded-3xl shadow-sm border border-blue-50 overflow-hidden">
      <div class="px-5 py-4 border-b border-blue-50 flex items-center justify-between">
        <div>
          <p class="text-[11px] font-black text-blue-500 uppercase tracking-[0.3em]">📘 Parole da ripassare</p>
          <p class="text-2xl font-black text-slate-700 mt-0.5">
            {{ vocabToReview.length }}
            <span class="text-base font-bold text-slate-300">/ {{ store.vocabData.length }}</span>
          </p>
        </div>
        <div class="text-3xl opacity-20">📘</div>
      </div>
      <div class="flex gap-3 p-4">
        <button
          class="flex-1 bg-blue-50 text-blue-600 font-black py-4 rounded-2xl text-sm flex items-center justify-center gap-2 uppercase tracking-widest active:scale-95 transition-all border border-blue-100"
          @click="store.handleStartQuizClick('vocab', vocabToReview)"
        >
          <BookOpen :size="16" /> Lettura
        </button>
        <button
          class="flex-1 bg-blue-600 text-white font-black py-4 rounded-2xl text-sm flex items-center justify-center gap-2 uppercase tracking-widest active:scale-95 transition-all shadow-md"
          @click="store.handleStartQuizClick('vocab-romaji', vocabToReview)"
        >
          🗣️ Romaji
        </button>
      </div>
    </div>

    <!-- Messaggio motivazionale -->
    <div
      v-if="totalToReview === 0"
      class="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-3xl p-8 text-center"
    >
      <div class="text-5xl mb-3">🎉</div>
      <p class="font-black text-blue-600 uppercase tracking-widest text-base">Ottimo lavoro!</p>
      <p class="text-blue-400 text-sm mt-1">Hai padronanza di tutti gli elementi.</p>
      <div class="text-2xl mt-3">🌸✨🌸</div>
    </div>

  </div>
</template>
