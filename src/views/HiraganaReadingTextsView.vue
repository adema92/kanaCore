<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  Languages,
  X,
} from 'lucide-vue-next'
import { useAppStore } from '../stores/appStore'
import readingData from '../data/kaguya-hiragana-reading.json'
import {
  kanaSequenceForQuiz,
  compareReadingTokens,
  parseUserRomajiTokens,
  parseUserRomajiWords,
  compareReadingWordsPerKana,
  compareReadingTokenProgress,
  compareReadingWordProgress,
} from '../utils/readingRomajiTokens.js'

const store = useAppStore()
const route = useRoute()
const router = useRouter()

const sentences = readingData

const byPart = computed(() => {
  const m = new Map()
  for (const s of sentences) {
    const p = s.part
    if (!m.has(p)) m.set(p, [])
    m.get(p).push(s)
  }
  return [...m.entries()].sort((a, b) => a[0] - b[0])
})

const activeId = computed(() => route.params.id || null)
const activeSentence = computed(() =>
  activeId.value ? sentences.find((x) => x.id === activeId.value) : null,
)

const romajiInput = ref('')
const verified = ref(false)
const kanaOk = ref(null)
const saved = ref(false)
const saveError = ref('')
/** Fullscreen recap after Conferma: 'idle' | 'loading' | 'done' | 'error' */
const resultModalPhase = ref('idle')
const readingHiraganaAnchorRef = ref(null)
const wordTooltip = ref(null)
const wordTooltipWordKey = ref(null)
const tooltipRootRef = ref(null)
const tooltipBoxStyle = ref(null)
const showFullTranslation = ref(false)
const recapWordCardRefs = ref([])
const recapMoraCardRefs = ref([])

const wordSegments = computed(() => activeSentence.value?.words ?? [])
const hasWordMode = computed(() => wordSegments.value.length > 0)

const expectedKana = computed(() =>
  activeSentence.value ? kanaSequenceForQuiz(activeSentence.value.tokens) : [],
)

const listPreviewHiragana = (row) => {
  const w = row.words
  if (w?.length) return w.map((x) => x.hiragana).join(' ')
  return row.hiragana
}

const formatReadingCompletedDate = (iso) => {
  if (!iso || typeof iso !== 'string') return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const readingListDateLabel = (sentenceId) =>
  formatReadingCompletedDate(store.readingTextsCompletedAt?.[sentenceId])

watch(
  () => activeId.value,
  () => {
    romajiInput.value = ''
    verified.value = false
    kanaOk.value = null
    saved.value = false
    saveError.value = ''
    resultModalPhase.value = 'idle'
    wordTooltip.value = null
    wordTooltipWordKey.value = null
    tooltipBoxStyle.value = null
    showFullTranslation.value = false
    recapWordCardRefs.value = []
    recapMoraCardRefs.value = []
  },
)

const dismissWordTooltip = () => {
  wordTooltip.value = null
  wordTooltipWordKey.value = null
  tooltipBoxStyle.value = null
}

const onWordTipClick = (ev, w, key) => {
  if (wordTooltipWordKey.value === key) {
    dismissWordTooltip()
    return
  }
  const el = ev.currentTarget
  const r = el.getBoundingClientRect()
  const centerX = r.left + r.width / 2
  const placeBelow = r.top < 96
  wordTooltipWordKey.value = key
  tooltipBoxStyle.value = null
  wordTooltip.value = {
    centerX,
    anchorTop: r.top,
    anchorBottom: r.bottom,
    placeBelow,
    italian: w.wordIt || '',
    hiragana: w.hiragana || '',
  }
  const h = (w.hiragana || '').trim()
  if (h) store.speakText(h)
}

const layoutReadingTooltip = () => {
  const v = wordTooltip.value
  const el = tooltipRootRef.value
  if (!v || !el) return
  const tr = el.getBoundingClientRect()
  const tw = tr.width
  const th = tr.height
  const pad = 12
  const gap = 4
  const vw = window.innerWidth
  const vh = window.innerHeight
  const maxW = Math.min(288, vw - 2 * pad)

  let left = v.centerX - tw / 2
  left = Math.max(pad, Math.min(left, vw - pad - tw))

  let top = v.placeBelow ? v.anchorBottom + gap : v.anchorTop - th - gap
  if (!v.placeBelow && top < pad) top = v.anchorBottom + gap
  if (v.placeBelow && top + th > vh - pad) top = Math.max(pad, v.anchorTop - th - gap)
  if (top + th > vh - pad) top = Math.max(pad, vh - pad - th)
  if (top < pad) top = pad

  tooltipBoxStyle.value = {
    left: `${left}px`,
    top: `${top}px`,
    transform: 'none',
    maxWidth: `${maxW}px`,
  }
}

watch(wordTooltip, (v, _ov, onCleanup) => {
  tooltipBoxStyle.value = null
  if (!v) return

  let resizeObs = null

  const runLayout = async () => {
    await nextTick()
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        layoutReadingTooltip()
        requestAnimationFrame(() => layoutReadingTooltip())
      })
    })
  }
  runLayout()

  nextTick(() => {
    const el = tooltipRootRef.value
    if (el && typeof ResizeObserver !== 'undefined') {
      resizeObs = new ResizeObserver(() => layoutReadingTooltip())
      resizeObs.observe(el)
    }
  })

  const onViewportChange = () => layoutReadingTooltip()
  window.addEventListener('resize', onViewportChange)
  window.addEventListener('scroll', onViewportChange, true)

  const onDoc = (e) => {
    const t = e.target
    if (t.closest?.('[data-reading-word-btn]')) return
    if (t.closest?.('[data-reading-word-tooltip]')) return
    dismissWordTooltip()
  }
  const tid = window.setTimeout(() => document.addEventListener('click', onDoc, true), 0)
  onCleanup(() => {
    resizeObs?.disconnect()
    window.clearTimeout(tid)
    document.removeEventListener('click', onDoc, true)
    window.removeEventListener('resize', onViewportChange)
    window.removeEventListener('scroll', onViewportChange, true)
  })
})

const displayWithStatus = computed(() => {
  if (!activeSentence.value || !displayKanaState.value || hasWordMode.value) return null
  const tokens = activeSentence.value.tokens
  let ki = 0
  return tokens.map((t) => {
    if (t.punct) return { kind: 'punct', graph: t.graph, ok: null }
    if (t.romaji === '' || t.romaji == null)
      return { kind: 'small', graph: t.graph, ok: null }
    const ok = displayKanaState.value[ki]
    ki += 1
    return {
      kind: 'kana',
      graph: t.graph,
      romaji: t.romaji,
      ok,
    }
  })
})

const displayWordsWithStatus = computed(() => {
  if (!activeSentence.value || !displayKanaState.value || !hasWordMode.value) return null
  const words = wordSegments.value
  let ki = 0
  return words.map((w) => {
    const n = w.moraEnd - w.moraStart
    const slice = displayKanaState.value.slice(ki, ki + n)
    ki += n
    const ok = slice.every((x) => x === null)
      ? null
      : (slice.length === n && slice.every(Boolean))
    return { ...w, ok }
  })
})

const userWordsRecap = computed(() => parseUserRomajiWords(romajiInput.value))
const userMoraRecap = computed(() => parseUserRomajiTokens(romajiInput.value))

const liveKanaState = computed(() => {
  if (!activeSentence.value) return null
  if (hasWordMode.value) {
    const { wordState } = compareReadingWordProgress(
      romajiInput.value,
      wordSegments.value,
      expectedKana.value,
    )
    const expanded = []
    for (let j = 0; j < wordSegments.value.length; j += 1) {
      const n = wordSegments.value[j].moraEnd - wordSegments.value[j].moraStart
      for (let k = 0; k < n; k += 1) expanded.push(wordState[j] ?? null)
    }
    return expanded
  }
  const { kanaState } = compareReadingTokenProgress(userMoraRecap.value, expectedKana.value)
  return kanaState
})

const displayKanaState = computed(() => {
  if (verified.value && kanaOk.value) return kanaOk.value
  return liveKanaState.value
})

const canConfirmReading = computed(() => {
  if (!activeSentence.value || saved.value) return false
  if (!romajiInput.value.trim()) return false
  const state = displayKanaState.value
  if (!state?.length) return false
  if (state.length !== expectedKana.value.length) return false
  return state.every((x) => x !== null)
})

const recapMoraStats = computed(() => {
  if (!kanaOk.value?.length) return null
  const ok = kanaOk.value.filter(Boolean).length
  return { ok, wrong: kanaOk.value.length - ok, total: kanaOk.value.length }
})

const recapWordStats = computed(() => {
  if (!displayWordsWithStatus.value?.length) return null
  const w = displayWordsWithStatus.value
  const ok = w.filter((x) => x.ok).length
  return { ok, wrong: w.length - ok, total: w.length }
})

const recapMoraRows = computed(() => {
  if (hasWordMode.value || !kanaOk.value?.length || !expectedKana.value.length) return null
  return expectedKana.value.map((row, j) => ({
    graph: row.graph,
    expected: row.romaji,
    user: userMoraRecap.value[j] ?? '',
    ok: !!kanaOk.value[j],
  }))
})

const recapInlineChunks = computed(() => {
  if (displayWordsWithStatus.value?.length) {
    return displayWordsWithStatus.value.map((cell, idx) => ({
      key: `w-${idx}`,
      text: cell.hiragana,
      ok: cell.ok === true,
      expected: cell.romaji,
      user: userWordsRecap.value[idx] || '',
    }))
  }
  if (recapMoraRows.value?.length) {
    return recapMoraRows.value.map((row, idx) => ({
      key: `m-${idx}`,
      text: row.graph,
      ok: row.ok === true,
      expected: row.expected,
      user: row.user || '',
    }))
  }
  return []
})

const buildFinalKanaOk = () => {
  if (!activeSentence.value) return null
  if (hasWordMode.value) {
    const words = wordSegments.value
    const userWords = parseUserRomajiWords(romajiInput.value)
    const { kanaOk: fineKanaOk } = compareReadingWordsPerKana(userWords, words, expectedKana.value)
    return fineKanaOk
  }
  const userTok = parseUserRomajiTokens(romajiInput.value)
  const { kanaOk: okList } = compareReadingTokens(userTok, expectedKana.value)
  return okList
}

const recapScoreStats = computed(() => {
  const s = recapWordStats.value || recapMoraStats.value
  if (!s?.total) return null
  return { ok: s.ok, wrong: s.wrong, total: s.total }
})

const closeResultModal = () => {
  resultModalPhase.value = 'idle'
  saveError.value = ''
  recapWordCardRefs.value = []
  recapMoraCardRefs.value = []
  goList()
}

const setRecapWordCardRef = (el, idx) => {
  if (!el) return
  recapWordCardRefs.value[idx] = el
}

const setRecapMoraCardRef = (el, idx) => {
  if (!el) return
  recapMoraCardRefs.value[idx] = el
}

const onRecapChunkClick = (_ev, chunk) => {
  if (chunk.ok) return
  const [kind, idxRaw] = String(chunk.key).split('-')
  const idx = Number(idxRaw)
  if (Number.isNaN(idx)) return
  const el = kind === 'w'
    ? recapWordCardRefs.value[idx]
    : recapMoraCardRefs.value[idx]
  el?.scrollIntoView?.({ behavior: 'smooth', inline: 'center', block: 'nearest' })
}

const onConfirmSave = async () => {
  if (!activeSentence.value) return
  if (resultModalPhase.value === 'loading') return
  const finalKanaOk = buildFinalKanaOk()
  if (!finalKanaOk?.length) return
  kanaOk.value = finalKanaOk
  verified.value = true
  saveError.value = ''
  resultModalPhase.value = 'loading'
  await nextTick()
  const outcomes = expectedKana.value.map((row, j) => ({
    character: row.statChar,
    ok: !!finalKanaOk[j],
  }))
  const sid = activeSentence.value.id
  const prevCompletedIso = store.readingTextsCompletedAt?.[sid]
  const completedIso = new Date().toISOString()
  store.setReadingTextCompletionAt(sid, completedIso)
  store.applyReadingPracticeKanaResults(outcomes)
  await store.saveNow()
  if (store.saveSuccess) {
    saved.value = true
    resultModalPhase.value = 'done'
  } else {
    store.setReadingTextCompletionAt(sid, prevCompletedIso ?? null)
    saveError.value = 'Salvataggio non riuscito. Riprova o controlla la connessione.'
    resultModalPhase.value = 'error'
  }
}

const goList = () => router.push('/hiragana/testi')
const openSentence = (id) => router.push(`/hiragana/testi/${id}`)

// Textarea focus scroll is intentional only for Analisi testi (/hiragana/testi detail). Do not copy to other screens.
const scrollReadingHiraganaIntoView = () => {
  if (!route.path.startsWith('/hiragana/testi') || !activeId.value || !activeSentence.value) return
  const el = readingHiraganaAnchorRef.value
  if (!el) return
  const run = () =>
    el.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' })
  requestAnimationFrame(run)
  window.setTimeout(run, 120)
  window.setTimeout(run, 320)
}

const onRomajiTextareaFocus = () => {
  scrollReadingHiraganaIntoView()
}

const partTitle = (n) => {
  const titles = {
    1: 'Bambù d’oro',
    2: 'Nascita da principessa',
    3: 'I cinque pretendenti',
    4: 'Gli scapoli',
    5: 'Missione impossibile',
    6: 'La ciotola del Buddha',
    7: 'Il ramo d’oro',
    8: 'La pelliccia del topo di fuoco',
    9: 'La furia del drago',
    10: 'Rondine e guscio',
    11: 'Principessa triste',
    12: 'Il motivo',
    13: 'Proteggere la principessa',
    14: 'La gente dalla luna',
    15: 'Addio',
  }
  return titles[n] || `Parte ${n}`
}
</script>

<template>
  <div class="w-full px-4 space-y-4 pb-6">
    <!-- Lista -->
    <template v-if="!activeId">
      <div
        class="p-6 rounded-3xl text-white shadow-lg text-center w-full relative overflow-hidden"
        style="background: rgb(235 188 213);"
      >
        <div class="absolute -top-2 -right-2 opacity-10 text-[80px] leading-none">📜</div>
        <img
          src="/8.png"
          alt=""
          class="mx-auto mb-3 w-[100px] h-[100px] sm:w-[112px] sm:h-[112px] object-contain drop-shadow-md pointer-events-none select-none"
          width="112"
          height="112"
          draggable="false"
        />
        <p class="text-white/95 text-lg sm:text-base font-semibold uppercase tracking-widest mb-0">
          Kaguya-hime · {{ sentences.length }} frasi
        </p>
        <p
          class="text-white/90 text-sm sm:text-[14px] mt-3 leading-snug max-w-md mx-auto line-clamp-5 font-serif text-center italic"
        >
          Un vecchio trova una neonata in un bambù che luccica: diventa la principessa Kaguya-hime, affronta pretendenti e corteggiamenti, poi lascia la terra per tornare alla luna.
        </p>
      </div>

      <div
        v-for="[part, rows] in byPart"
        :key="part"
        class="bg-white rounded-3xl shadow-sm border border-pink-100 overflow-hidden"
      >
        <div
          class="px-4 py-3 text-xs font-black uppercase tracking-widest text-pink-500 bg-pink-50/80 border-b border-pink-100"
        >
          Parte {{ part }} — {{ partTitle(part) }}
        </div>
        <ul class="divide-y divide-pink-50">
          <li v-for="row in rows" :key="row.id">
            <button
              type="button"
              class="w-full text-left px-4 py-3 flex gap-3 items-start active:bg-pink-50/60 transition-colors"
              @click="openSentence(row.id)"
            >
              <span
                class="shrink-0 w-8 h-8 rounded-xl bg-pink-100 text-pink-600 font-black text-xs flex items-center justify-center"
              >{{ row.sentenceIndex }}</span>
              <div class="flex-1 min-w-0 flex flex-col gap-0.5">
                <span class="text-sm text-slate-700 leading-relaxed font-medium break-all text-left">{{
                  listPreviewHiragana(row).slice(0, 56)
                }}{{ listPreviewHiragana(row).length > 56 ? '…' : '' }}</span>
                <time
                  v-if="readingListDateLabel(row.id)"
                  :datetime="store.readingTextsCompletedAt[row.id]"
                  class="text-[10px] text-slate-400 font-semibold tabular-nums self-end leading-tight pt-2"
                >{{ readingListDateLabel(row.id) }}</time>
              </div>
            </button>
          </li>
        </ul>
      </div>

      <p class="text-center text-[10px] text-slate-400 px-2 pb-2">
        Testo adattato in hiragana per esercizi di lettura (racconto tradizionale).
      </p>
    </template>

    <!-- Dettaglio frase -->
    <template v-else-if="activeSentence">
      <div class="flex items-center gap-2 mb-2">
        <button
          type="button"
          class="flex items-center justify-center w-10 h-10 rounded-2xl border-2 border-pink-200 bg-white text-pink-600 active:scale-95 transition-all"
          aria-label="Indietro"
          @click="goList"
        >
          <ArrowLeft :size="20" />
        </button>
        <span class="text-xs font-black uppercase tracking-widest text-pink-500">
          Frase {{ activeSentence.sentenceIndex }} · Parte {{ activeSentence.part }}
        </span>
      </div>

      <div
        class="bg-white rounded-3xl shadow-sm border border-pink-100 space-y-2 px-4 pt-4"
        :class="showFullTranslation ? 'pb-10 sm:pb-12' : 'pb-4'"
      >
        <div
          ref="readingHiraganaAnchorRef"
          class="scroll-mt-3"
        >
          <div
            v-if="hasWordMode && displayWordsWithStatus"
            class="text-lg sm:text-xl leading-[1.75] text-slate-800 font-medium flex flex-wrap gap-x-1 gap-y-1.5"
            lang="ja"
          >
            <button
              v-for="(cell, widx) in displayWordsWithStatus"
              :key="widx"
              type="button"
              data-reading-word-btn
              :class="[
                'rounded-lg px-1 py-0.5 border transition-colors text-left',
                cell.ok === true ? 'bg-emerald-100 text-emerald-900 border-emerald-200' : '',
                cell.ok === false ? 'bg-rose-100 text-rose-800 border-rose-200 ring-1 ring-rose-200' : '',
                'border-transparent hover:border-pink-200',
              ]"
              @click="onWordTipClick($event, cell, `${activeSentence.id}-v-${widx}`)"
            >
              {{ cell.hiragana }}
            </button>
          </div>

          <p
            v-else-if="!hasWordMode && !displayWithStatus"
            class="text-lg sm:text-xl leading-[1.75] text-slate-800 font-medium break-all"
            lang="ja"
          >{{ activeSentence.hiragana }}</p>

          <div
            v-else-if="displayWithStatus"
            class="text-lg sm:text-xl leading-[1.75] text-slate-800 font-medium break-all flex flex-wrap gap-y-1"
            lang="ja"
          >
            <template v-for="(cell, idx) in displayWithStatus" :key="idx">
              <span v-if="cell.kind === 'punct'" class="text-slate-500">{{ cell.graph }}</span>
              <span
                v-else
                :class="[
                  'inline-block rounded-md px-0.5 mx-0.5 transition-colors',
                  cell.ok === true ? 'bg-emerald-100 text-emerald-800' : '',
                  cell.ok === false ? 'bg-rose-100 text-rose-700 ring-1 ring-rose-200' : '',
                  cell.ok === null ? 'text-slate-700' : '',
                ]"
              >{{ cell.graph }}</span>
            </template>
          </div>
        </div>

        <template v-if="showFullTranslation">
          <div class="flex items-center justify-between gap-2 pt-1 mb-1.5">
            <span
              class="text-[11px] sm:text-xs font-black uppercase tracking-widest text-pink-500 flex-1 min-w-0 leading-tight"
            >
              Traduzione
            </span>
            <button
              :id="`translation-toggle-${activeSentence.id}`"
              type="button"
              class="shrink-0 flex items-center justify-center w-10 h-10 rounded-xl border-2 border-pink-500 bg-pink-500 text-white shadow-md ring-2 ring-pink-300/60 transition-all active:scale-95"
              aria-pressed="true"
              aria-label="Torna alla trascrizione in romaji"
              @click="showFullTranslation = false"
            >
              <Languages :size="18" class="shrink-0" />
            </button>
          </div>
          <div
            class="rounded-xl border border-pink-100 bg-pink-50/70 px-4 py-4 sm:py-5 text-sm text-slate-800 leading-relaxed"
          >
            {{ activeSentence.translationIt }}
          </div>
        </template>

        <template v-else>
          <div class="pt-1">
            <div class="flex items-center justify-between gap-2 mb-1">
              <label
                :for="`romaji-input-${activeSentence.id}`"
                class="text-[11px] sm:text-xs font-black uppercase tracking-widest text-pink-500 flex-1 min-w-0 leading-tight"
              >
                {{ hasWordMode ? 'Romaji (spazio tra le parole)' : 'Romaji (spazio tra le more)' }}
              </label>
              <button
                type="button"
                class="shrink-0 flex items-center justify-center w-10 h-10 rounded-xl border-2 border-pink-200 bg-white text-pink-500 hover:bg-pink-50 transition-all active:scale-95"
                aria-pressed="false"
                aria-label="Mostra solo hiragana e traduzione italiana"
                @click="showFullTranslation = true"
              >
                <Languages :size="18" class="shrink-0" />
              </button>
            </div>
            <textarea
              :id="`romaji-input-${activeSentence.id}`"
              v-model="romajiInput"
              :disabled="saved"
              rows="4"
              lang="ja"
              class="w-full rounded-2xl border-2 border-pink-100 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-pink-300 focus:ring-0 outline-none resize-y min-h-[76px] disabled:opacity-60"
              :placeholder="hasWordMode ? 'es. Mukashi, miyako no chikaku no mura ...' : 'es. mu ka shi , mi ya ko no chi ka ku ...'"
              @focus="onRomajiTextareaFocus"
            />
          </div>

          <button
            type="button"
            class="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-sm uppercase tracking-widest bg-white border-2 border-pink-300 text-pink-700 shadow-sm active:scale-[0.98] transition-all disabled:opacity-45"
            :disabled="!canConfirmReading || store.isSyncing || resultModalPhase === 'loading'"
            @click="onConfirmSave"
          >
            Conferma
          </button>
        </template>
      </div>

      <Teleport to="body">
        <div
          v-if="wordTooltip"
          ref="tooltipRootRef"
          data-reading-word-tooltip
          class="fixed z-[100] pointer-events-none w-max"
          :class="{ 'opacity-0': !tooltipBoxStyle, 'opacity-100': tooltipBoxStyle }"
          :style="tooltipBoxStyle || { left: '-9999px', top: '0', maxWidth: 'min(288px, calc(100vw - 24px))' }"
        >
          <div
            class="pointer-events-auto rounded-2xl border-2 border-pink-200 bg-white px-3.5 py-2.5 text-left shadow-lg shadow-pink-200/40 ring-1 ring-pink-100/80"
            role="status"
            :aria-label="`Traduzione: ${wordTooltip.italian}`"
          >
            <p class="text-[13px] font-semibold text-pink-900 leading-snug break-words">
              {{ wordTooltip.italian }}
            </p>
          </div>
        </div>
      </Teleport>

      <Teleport to="body">
        <div
          v-if="resultModalPhase !== 'idle'"
          class="fixed inset-0 z-[220] flex flex-col bg-[#fff0f5]"
          role="dialog"
          aria-modal="true"
          :aria-busy="resultModalPhase === 'loading'"
          :aria-label="resultModalPhase === 'loading' ? 'Salvataggio in corso' : 'Riepilogo esercizio'"
        >
          <div
            v-if="resultModalPhase === 'loading'"
            class="flex-1"
          />

          <div
            v-else-if="resultModalPhase === 'done'"
            class="flex min-h-0 flex-1 flex-col"
          >
            <div class="flex shrink-0 items-center justify-end px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
              <button
                type="button"
                class="flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-pink-200 bg-white text-pink-600 shadow-sm active:scale-95"
                aria-label="Chiudi riepilogo"
                @click="closeResultModal"
              >
                <X :size="22" />
              </button>
            </div>
            <div
              class="flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] space-y-5"
            >
              <div class="text-center relative rounded-3xl border border-pink-200/70 bg-gradient-to-br from-pink-100/70 via-rose-50/70 to-amber-50/60 px-3 py-4 shadow-sm">
                <p class="text-xs font-black uppercase tracking-[0.24em] bg-gradient-to-r from-fuchsia-500 via-pink-500 to-rose-500 bg-clip-text text-transparent">Riepilogo</p>
                <div class="mt-2 flex items-center justify-center gap-4">
                  <img
                    src="/11.png"
                    alt=""
                    class="pointer-events-none select-none h-20 w-20 object-contain drop-shadow-sm opacity-95"
                    width="80"
                    height="80"
                    draggable="false"
                  />
                </div>
                <p v-if="recapScoreStats" class="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  {{ recapScoreStats.ok }}/{{ recapScoreStats.total }} indovinate
                </p>
              </div>
              <div class="space-y-2 rounded-2xl border border-pink-200/80 bg-gradient-to-b from-pink-100/75 to-rose-100/60 p-3 shadow-sm">
                <p class="text-center text-[16px] font-semibold break-words leading-relaxed">
                  <template v-for="chunk in recapInlineChunks" :key="chunk.key">
                    <span
                      :class="[
                        chunk.ok ? 'text-emerald-700' : 'text-rose-700 cursor-pointer underline decoration-dotted underline-offset-4',
                      ]"
                      @click="onRecapChunkClick($event, chunk)"
                    >{{ chunk.text }}</span>
                    <span class="text-slate-500"> </span>
                  </template>
                </p>
              </div>
              <div v-if="displayWordsWithStatus?.length" class="space-y-2">
                <p class="text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Dettaglio parole</p>
                <ul class="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory">
                  <li
                    v-for="(cell, idx) in displayWordsWithStatus"
                    :key="'rw'+idx"
                    :ref="(el) => setRecapWordCardRef(el, idx)"
                    class="min-w-[11rem] max-w-[11rem] snap-start rounded-2xl border border-pink-200/80 bg-gradient-to-b from-pink-100/75 to-rose-100/60 p-3 text-center text-xs shadow-sm"
                  >
                    <div class="flex items-center justify-center gap-1.5">
                      <span class="text-2xl leading-none" lang="ja">{{ cell.hiragana }}</span>
                      <span :class="cell.ok ? 'font-bold text-emerald-700' : 'font-bold text-rose-600'">{{ cell.ok ? '✓' : '✗' }}</span>
                    </div>
                    <span class="mt-2 block text-slate-500">
                      Atteso: <span class="font-semibold text-emerald-800">{{ cell.romaji }}</span>
                    </span>
                    <span v-if="!cell.ok" class="mt-1 block text-slate-500">
                      Tuo: <span class="font-semibold text-rose-700">{{ userWordsRecap[idx] || '—' }}</span>
                    </span>
                  </li>
                </ul>
              </div>
              <ul v-else-if="recapMoraRows?.length" class="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory">
                <li
                  v-for="(row, idx) in recapMoraRows"
                  :key="'rm'+idx"
                  :ref="(el) => setRecapMoraCardRef(el, idx)"
                  class="min-w-[9.5rem] max-w-[9.5rem] snap-start rounded-2xl border border-pink-200/80 bg-gradient-to-b from-pink-100/75 to-rose-100/60 p-3 text-center text-xs shadow-sm"
                >
                  <div class="flex items-center justify-center gap-1.5 w-full">
                    <span lang="ja" class="text-2xl font-medium text-slate-800">{{ row.graph }}</span>
                    <span :class="row.ok ? 'font-bold text-emerald-700' : 'font-bold text-rose-600'">{{ row.ok ? '✓' : '✗' }}</span>
                  </div>
                  <span class="mt-2 block font-semibold text-slate-600">{{ row.expected }}</span>
                  <span v-if="!row.ok" class="mt-1 block font-semibold text-rose-700">({{ row.user || '—' }})</span>
                </li>
              </ul>
              <button
                type="button"
                class="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] bg-pink-500 text-white shadow-md active:scale-[0.98] transition-all"
                @click="closeResultModal"
              >
                Chiudi
              </button>
            </div>
          </div>

          <div
            v-else-if="resultModalPhase === 'error'"
            class="flex flex-1 flex-col items-center justify-center gap-4 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
          >
            <p class="text-center text-base font-semibold text-rose-600 leading-relaxed">{{ saveError }}</p>
          </div>
        </div>
      </Teleport>
    </template>

    <div v-else class="text-center py-12 text-slate-500 text-sm">
      Frase non trovata.
      <button type="button" class="block mx-auto mt-4 text-pink-600 font-bold underline" @click="goList">Torna alla lista</button>
    </div>
  </div>
</template>
