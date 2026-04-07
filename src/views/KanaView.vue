<script setup>
import { useRouter } from 'vue-router'
import { BookOpen, Eye, EyeOff, Languages } from 'lucide-vue-next'
import { useAppStore, HIRAGANA_GRID, getMasteryColor } from '../stores/appStore'

const store = useAppStore()
const router = useRouter()
</script>

<template>
  <div class="w-full max-w-6xl mx-auto px-4 lg:px-6 space-y-4 pb-6">

    <!-- Header Hiragana -->
    <div
      class="p-6 rounded-3xl text-white shadow-lg text-center w-full relative overflow-hidden"
      style="background: rgb(235 188 213);"
    >
      <div class="absolute -top-2 -right-2 opacity-10 text-[80px] leading-none">🌸</div>
      <img
        src="/hiragana-logo.png"
        alt="Hiragana"
        class="mx-auto object-contain drop-shadow-sm w-[170px] h-[170px]"
      />
      <h1 class="text-2xl font-black mb-0.5">Hiragana</h1>
      <p class="text-white/90 text-xs font-semibold mb-5 opacity-90 uppercase tracking-widest">{{ store.kanaData.length }} kana</p>

      <!-- Pulsanti quiz -->
      <div class="flex gap-3 mb-3">
        <button
          class="flex-1 bg-white/95 font-black py-4 rounded-2xl text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 shadow-md active:scale-95 transition-all uppercase tracking-widest"
          style="color: #c97bb8;"
          @click="store.handleStartQuizClick('kana')"
        >
          <BookOpen :size="17" class="shrink-0" />
          <span>Inizia Quiz</span>
        </button>
        <button
          class="flex-1 bg-white/25 backdrop-blur text-white font-black py-4 rounded-2xl text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 shadow-md active:scale-95 transition-all uppercase tracking-widest border border-white/50"
          type="button"
          @click="router.push('/hiragana/testi')"
        >
          <Languages
            :size="18"
            class="lucide lucide-languages-icon shrink-0 text-white drop-shadow-sm"
          />
          <span class="font-bold">Analisi testi</span>
        </button>
      </div>

    </div>

    <!-- Legenda colori -->
    <div class="flex items-center justify-between gap-2 px-1">
      <div class="flex items-center gap-2 sm:gap-3 min-w-0">
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
      </div>
      <button
        type="button"
        class="shrink-0 flex items-center justify-center w-9 h-9 lg:w-11 lg:h-11 rounded-xl border-2 border-pink-200 bg-white text-pink-600 hover:bg-pink-50 hover:border-pink-300 active:scale-90 transition-all"
        :title="store.hideGridRomaji ? 'Mostra romaji' : 'Nascondi romaji'"
        @click="store.hideGridRomaji = !store.hideGridRomaji"
      >
        <Eye v-if="store.hideGridRomaji" :size="18" />
        <EyeOff v-else :size="18" />
      </button>
    </div>

    <!-- Griglia hiragana -->
    <div class="bg-white p-4 rounded-3xl shadow-sm border border-pink-50 w-full">
      <div class="grid grid-cols-5 sm:grid-cols-10 gap-2">
        <template v-for="(item, idx) in HIRAGANA_GRID.flat()" :key="idx">
          <div v-if="!item" class="aspect-square opacity-0 pointer-events-none"></div>
          <button
            v-else
            type="button"
            :class="[
              'aspect-square rounded-xl border-2 flex flex-col items-center justify-center transition-all active:scale-90',
              store.kanaData.find(x => x.character === item.c)
                ? getMasteryColor(store.kanaData.find(x => x.character === item.c).score)
                : 'bg-slate-50 border-slate-100 text-slate-200 border-dashed'
            ]"
            @click="() => {
              const k = store.kanaData.find(x => x.character === item.c)
              store.selectedKanaModal = k || { id: 'new', character: item.c, romaji: item.r, isNew: true, personalNote: '' }
              store.speakText(item.c)
            }"
          >
            <span
              :class="[
                'font-black leading-none',
                item.c.length > 1 ? 'text-base sm:text-lg' : 'text-xl',
              ]"
            >{{ item.c }}</span>
            <span
              v-if="!store.hideGridRomaji"
              class="text-[9px] lg:text-[11px] font-bold uppercase opacity-50 mt-0.5 tracking-wide leading-none"
            >{{ item.r }}</span>
          </button>
        </template>
      </div>
    </div>

  </div>
</template>
