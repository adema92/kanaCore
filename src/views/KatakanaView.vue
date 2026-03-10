<script setup>
import { BookOpen, Eye, EyeOff } from 'lucide-vue-next'
import { useAppStore, KATAKANA_GRID, getMasteryColor } from '../stores/appStore'

const store = useAppStore()
</script>

<template>
  <div class="w-full px-4 space-y-4 pb-6">

    <!-- Header Katakana -->
    <div
      class="p-6 rounded-3xl text-white shadow-lg text-center w-full relative overflow-hidden"
      style="background: rgb(116 161 205 / 58%);"
    >
      <img
        src="/katakana-logo.png"
        alt="Katakana"
        class="mx-auto object-contain drop-shadow-sm w-[170px] h-[170px]"
      />
      <h1 class="text-2xl font-black mb-0.5">Katakana</h1>
      <p class="text-white/90 text-xs font-semibold mb-5 opacity-90 uppercase tracking-widest">{{ store.katakanaData.length }} caratteri</p>

      <!-- Pulsanti quiz -->
      <div class="flex gap-3 mb-3">
        <button
          class="w-full bg-white/95 font-black py-4 rounded-2xl text-sm flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all uppercase tracking-widest"
          style="color: #2e78b8;"
          @click="store.handleStartQuizClick('katakana')"
        >
          <BookOpen :size="17" /> Inizia Quiz
        </button>
      </div>

    </div>

    <!-- Legenda colori -->
    <div class="flex flex-wrap items-center gap-2 px-1">
      <div class="flex items-center gap-1.5">
        <div class="w-2.5 h-2.5 rounded-full bg-rose-400"></div>
        <span class="text-[10px] font-black text-slate-400 uppercase tracking-wide">Da studiare</span>
      </div>
      <div class="flex items-center gap-1.5">
        <div class="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
        <span class="text-[10px] font-black text-slate-400 uppercase tracking-wide">In corso</span>
      </div>
      <div class="flex items-center gap-1.5">
        <div class="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
        <span class="text-[10px] font-black text-slate-400 uppercase tracking-wide">Padronanza</span>
      </div>
      <button
        type="button"
        class="ml-auto flex items-center justify-center w-9 h-9 rounded-xl border-2 border-blue-200 bg-white text-blue-600 hover:bg-blue-50 hover:border-blue-300 active:scale-90 transition-all"
        :title="store.hideKatakanaGridRomaji ? 'Mostra romaji' : 'Nascondi romaji'"
        @click="store.hideKatakanaGridRomaji = !store.hideKatakanaGridRomaji"
      >
        <Eye v-if="store.hideKatakanaGridRomaji" :size="18" />
        <EyeOff v-else :size="18" />
      </button>
    </div>

    <!-- Griglia katakana -->
    <div class="bg-white p-4 rounded-3xl shadow-sm border border-blue-50 w-full">
      <div class="grid grid-cols-5 sm:grid-cols-10 gap-2">
        <template v-for="(item, idx) in KATAKANA_GRID.flat()" :key="idx">
          <div v-if="!item" class="aspect-square opacity-0 pointer-events-none"></div>
          <button
            v-else
            type="button"
            :class="[
              'aspect-square rounded-xl border-2 flex flex-col items-center justify-center transition-all active:scale-90',
              store.katakanaData.find(x => x.character === item.c)
                ? getMasteryColor(store.katakanaData.find(x => x.character === item.c).score)
                : 'bg-slate-50 border-slate-100 text-slate-200 border-dashed'
            ]"
            @click="() => {
              const k = store.katakanaData.find(x => x.character === item.c)
              store.selectedKatakanaModal = k || { id: 'new', character: item.c, romaji: item.r, isNew: true, personalNote: '' }
              store.speakText(item.c)
            }"
          >
            <span class="text-xl font-black leading-none">{{ item.c }}</span>
            <span
              v-if="!store.hideKatakanaGridRomaji"
              class="text-[9px] font-bold uppercase opacity-50 mt-0.5 tracking-wide leading-none"
            >{{ item.r }}</span>
          </button>
        </template>
      </div>
    </div>

  </div>
</template>
