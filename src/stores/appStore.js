import { defineStore } from 'pinia'
import { ref } from 'vue'
import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth'
import { getFirestore, doc, getDoc, onSnapshot } from 'firebase/firestore'

import salutiVocab from '../data/saluti.json'
import randomVocab from '../data/random.json'
import combinateVocab from '../data/combinate.json'
import allungamentiVocab from '../data/allungamenti.json'
import presentazioneVocab from '../data/presentazione.json'
import hiraganaGrid from '../data/hiragana-grid.json'
import katakanaGrid from '../data/katakana-grid.json'
import hiraganaPresetsJson from '../data/hiragana-presets.json'
import katakanaPresetsJson from '../data/katakana-presets.json'

/* global __firebase_config, __app_id */
const firebaseConfig =
  typeof __firebase_config === 'string'
    ? JSON.parse(__firebase_config)
    : __firebase_config
const firebaseApp = initializeApp(firebaseConfig)
const auth = getAuth(firebaseApp)
const db = getFirestore(firebaseApp)
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id'
const projectId = firebaseConfig.projectId || appId

/** Max words for "last batch" quiz CTA (label uses min(this, pool length)). */
export const VOCAB_LAST_BATCH_MAX = 20

export const getMasteryColor = (score) => {
  if (score >= 80) return 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
  if (score >= 40) return 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100'
  return 'bg-rose-50 text-rose-500 border-rose-200 hover:bg-rose-100'
}

export const getMasteryDot = (score) => {
  if (score >= 80) return 'bg-emerald-400'
  if (score >= 40) return 'bg-amber-400'
  return 'bg-rose-400'
}

export const KATAKANA_GRID = katakanaGrid

const _kataGridCells = KATAKANA_GRID.flat().filter(Boolean)
export const INITIAL_KATAKANA = _kataGridCells.map((cell, i) => ({
  id: `kt${i + 1}`,
  character: cell.c,
  romaji: cell.r,
  personalNote: '',
  score: 0,
  attempts: 0,
}))

export const HIRAGANA_GRID = hiraganaGrid

// Griglia kana con score 0; i preset usano i primi id (es. k1–k5 Vocali).
const _gridCells = HIRAGANA_GRID.flat().filter(Boolean)
export const INITIAL_KANA = _gridCells.map((cell, i) => ({
  id: `k${i + 1}`,
  character: cell.c,
  romaji: cell.r,
  personalNote: '',
  score: 0,
  attempts: 0,
}))

export const hiraganaPresets = hiraganaPresetsJson

export const katakanaPresets = katakanaPresetsJson

export const INITIAL_VOCAB = [...salutiVocab, ...randomVocab, ...combinateVocab, ...allungamentiVocab, ...presentazioneVocab]

// Mappa romaji → kana per quiz lettura.
export const ROMAJI_TO_KANA = Object.fromEntries(
  HIRAGANA_GRID.flat().filter(Boolean).map(x => [x.r.toLowerCase(), x.c])
)

// --- Vocab quiz: dedupe, gojūon row spacing, tenten separation, diversified distractors ---

const _GOJUON_CHAR_TO_ROW = new Map()
HIRAGANA_GRID.forEach((row, ri) => {
  row.forEach((cell) => {
    if (cell?.c) _GOJUON_CHAR_TO_ROW.set(cell.c, ri)
  })
})

/** ka–ga, sa–za, ta–da, ha–ba–pa pairs (grid row indices). */
const _TENTEN_ADJACENT_ROW_PAIRS = [
  [1, 2],
  [3, 4],
  [5, 6],
  [8, 9],
  [8, 10],
  [9, 10],
]

function _shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const t = a[i]
    a[i] = a[j]
    a[j] = t
  }
  return a
}

function _katakanaToHiraganaFirst(ch) {
  if (!ch) return ''
  const c = ch.codePointAt(0)
  if (c >= 0x30a1 && c <= 0x30f6) return String.fromCodePoint(c - 0x60)
  return ch
}

function _vocabFirstKanaChar(item) {
  const w = (item.word || '').split('/')[0].replace(/\s+/g, '')
  if (!w) return ''
  return _katakanaToHiraganaFirst(w[0])
}

function _getVocabGojuonRow(item) {
  const ch = _vocabFirstKanaChar(item)
  return _GOJUON_CHAR_TO_ROW.has(ch) ? _GOJUON_CHAR_TO_ROW.get(ch) : -1
}

function _tentenAdjacentRows(rowA, rowB) {
  if (rowA < 0 || rowB < 0) return false
  return _TENTEN_ADJACENT_ROW_PAIRS.some(
    ([x, y]) => (rowA === x && rowB === y) || (rowA === y && rowB === x)
  )
}

function _dedupeVocabById(items) {
  const seen = new Set()
  return items.filter((it) => {
    const id = it?.id != null ? String(it.id) : ''
    if (!id || seen.has(id)) return false
    seen.add(id)
    return true
  })
}

/**
 * Order vocab items so consecutive questions avoid same gojūon row (e.g. か then き)
 * and avoid tenten pairs back-to-back (e.g. か then が).
 */
function _orderVocabQuizQueue(items) {
  if (items.length <= 1) return [...items]
  const remaining = _shuffleArray(items)
  const ordered = []
  while (remaining.length) {
    const lastRow =
      ordered.length > 0 ? _getVocabGojuonRow(ordered[ordered.length - 1]) : null
    const pickFrom = (pred) => {
      const idx = remaining.findIndex(pred)
      return idx >= 0 ? remaining.splice(idx, 1)[0] : null
    }
    let next = null
    if (lastRow == null) {
      next = remaining.shift()
    } else {
      next = pickFrom((it) => {
        const r = _getVocabGojuonRow(it)
        return r !== lastRow && !_tentenAdjacentRows(lastRow, r)
      })
      if (!next) next = pickFrom((it) => _getVocabGojuonRow(it) !== lastRow)
      if (!next) next = remaining.shift()
    }
    ordered.push(next)
  }
  return ordered
}

function _pickVocabDistractors(cur, pool, numWrong) {
  const curRow = _getVocabGojuonRow(cur)
  const chosen = []
  const takenIds = new Set([String(cur.id)])
  const addTier = (filterFn) => {
    if (chosen.length >= numWrong) return
    const rest = pool.filter(
      (i) => !takenIds.has(String(i.id)) && String(i.id) !== String(cur.id) && filterFn(i)
    )
    for (const c of _shuffleArray(rest)) {
      if (chosen.length >= numWrong) break
      chosen.push(c)
      takenIds.add(String(c.id))
    }
  }
  if (curRow >= 0) {
    addTier((i) => {
      const r = _getVocabGojuonRow(i)
      return r !== curRow && !_tentenAdjacentRows(curRow, r)
    })
    addTier((i) => _getVocabGojuonRow(i) !== curRow)
  }
  addTier(() => true)
  return chosen.slice(0, numWrong)
}

function _shuffleOptionsUnique(opts) {
  const seen = new Set()
  const unique = opts.filter((o) => {
    const id = String(o.id)
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
  return _shuffleArray(unique)
}

export const useAppStore = defineStore('app', () => {
  const kanaData = ref(INITIAL_KANA.map(k => ({ ...k })))
  const katakanaData = ref(INITIAL_KATAKANA.map(k => ({ ...k })))
  const vocabData = ref(INITIAL_VOCAB.map(v => ({ ...v })))
  const dailyStats = ref({})

  /** Normalizza una giornata in { total, correct, kana, katakana, vocab }. I dati legacy hanno solo total/correct → trattati come kana. */
  function _normalizeDayStats(day) {
    if (!day || typeof day !== 'object') return { total: 0, correct: 0, kana: { total: 0, correct: 0 }, katakana: { total: 0, correct: 0 }, vocab: { total: 0, correct: 0 } }
    let total = day.total ?? 0
    let correct = day.correct ?? 0
    const kana = day.kana && typeof day.kana === 'object'
      ? { total: day.kana.total ?? 0, correct: day.kana.correct ?? 0 }
      : { total, correct }
    const katakana = day.katakana && typeof day.katakana === 'object'
      ? { total: day.katakana.total ?? 0, correct: day.katakana.correct ?? 0 }
      : { total: 0, correct: 0 }
    const vocab = day.vocab && typeof day.vocab === 'object'
      ? { total: day.vocab.total ?? 0, correct: day.vocab.correct ?? 0 }
      : { total: 0, correct: 0 }
    const derivedTotal = kana.total + katakana.total + vocab.total
    const derivedCorrect = kana.correct + katakana.correct + vocab.correct
    if (total === 0 && derivedTotal > 0) {
      total = derivedTotal
      correct = derivedCorrect
    }
    return { total, correct, kana, katakana, vocab }
  }

  /** Azzera le statistiche di oggi per un tipo (kana | katakana | vocab). Usato dai reset grafici. */
  function resetTodayChart(type) {
    const todayStr = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
      .toISOString().split('T')[0]
    const cur = _normalizeDayStats(dailyStats.value[todayStr])
    const next = { ...cur, [type]: { total: 0, correct: 0 } }
    next.total = next.kana.total + next.katakana.total + next.vocab.total
    next.correct = next.kana.correct + next.katakana.correct + next.vocab.correct
    dailyStats.value = {
      ...dailyStats.value,
      [todayStr]: next,
    }
  }
  const user = ref(null)
  const isCloudLoaded = ref(false)
  // Test: set to true to show loading screen (e.g. in console: window.__store?.forceLoadingScreen = true)
  const forceLoadingScreen = ref(false)

  const _rawProfile = localStorage.getItem('hiragana_profile')
  const currentProfile = ref(_rawProfile ? _rawProfile.toLowerCase() : null)
  const profileSelectOpen = ref(!currentProfile.value)
  const isSyncing = ref(false)
  const saveSuccess = ref(false)
  const saveErrorModal = ref(null)

  const selectedKanaModal = ref(null)
  const selectedKatakanaModal = ref(null)
  const selectedVocabModal = ref(null)
  const customAlert = ref(null)
  const confirmModal = ref(null)
  const hideGridRomaji = ref(true)
  const hideKatakanaGridRomaji = ref(true)
  const statsTimeRange = ref('settimana')

  const quizActive = ref(false)
  /** 'saving' | 'success' | 'error' | 'chart' – phase of the full-screen quiz-end modal (loader → result → chart + CTAs). */
  const quizEndModalPhase = ref('')
  const showSaveProgressAfterQuiz = ref(false)
  const quizSavedToast = ref(false)
  const quizSetupModalOpen = ref(false)
  const katakanaSetupModalOpen = ref(false)
  const vocabSetupModalOpen = ref(false)
  const difficultyModalOpen = ref(false)
  const selectedKanaIds = ref([])
  const selectedKatakanaIds = ref([])
  const newPresetName = ref('')
  const newKatakanaPresetName = ref('')
  const quizPendingItems = ref([])
  const selectedVocabCategories = ref([])
  /** True after proceedFromVocabSetup; used to show "back to categories" in difficulty modal. */
  const enteredDifficultyFromVocabCategories = ref(false)
  const quizDifficulty = ref('medio')
  const quizDirection = ref('ja-to-romaji')
  // Numero max domande quiz vocab-kana-to-romaji; null = tutte le parole Random.
  const vocabKanaToRomajiMaxQuestions = ref(null)
  // Tastiera per vocab-kana-to-romaji: 'ja' = romaji (tastiera giapponese), 'it' = italiano.
  const vocabKanaToRomajiInputLang = ref('ja')
  const quizQueue = ref([])
  const currentQuestionIndex = ref(0)
  const quizType = ref('kana')
  const options = ref([])
  const selectedOption = ref(null)
  const isAnswered = ref(false)
  const quizResults = ref({ correct: 0, total: 0 })
  const manualInput = ref('')

  const vocabWriteMistakes = ref(0)

  // Blocco quiz vocab: { romaji, kana, userInput, state: 'idle'|'ok'|'wrong' }
  const vocabRomajiBlocks = ref([])
  const vocabRomajiCurrentIdx = ref(0)
  const vocabRomajiBlockInput = ref('')

  // Feedback risposta: null | { ok, userAnswer, correctAnswer, itemLabel }
  const answerFeedback = ref(null)
  /** Snapshot to undo last answer (typo etc.): restored by undoLastAnswer(). */
  const lastAnswerSnapshot = ref(null)
  const lastKanaQuizSelection = ref([])
  const lastKatakanaQuizSelection = ref([])

  let _jaVoice = null

  function _pickBestJapaneseVoice(voices) {
    const priorities = [
      (v) => v.lang === 'ja-JP' && v.name.includes('Google'),
      (v) => v.lang === 'ja-JP' && /Natural|Enhanced|Premium/i.test(v.name),
      (v) => v.lang === 'ja-JP' && v.name.includes('Online'),
      (v) => v.lang === 'ja-JP' && !v.localService,
      (v) => v.lang.startsWith('ja') && /Natural|Enhanced|Premium/i.test(v.name),
      (v) => v.lang.startsWith('ja') && !v.localService,
      (v) => v.lang.startsWith('ja'),
    ]
    for (const test of priorities) {
      const found = voices.find(test)
      if (found) return found
    }
    return null
  }

  function _getJapaneseVoice() {
    return new Promise((resolve) => {
      if (_jaVoice) { resolve(_jaVoice); return }
      const voices = window.speechSynthesis.getVoices()
      if (voices.length > 0) {
        _jaVoice = _pickBestJapaneseVoice(voices)
        resolve(_jaVoice)
        return
      }
      const onLoaded = () => {
        window.speechSynthesis.removeEventListener('voiceschanged', onLoaded)
        _jaVoice = _pickBestJapaneseVoice(window.speechSynthesis.getVoices())
        resolve(_jaVoice)
      }
      window.speechSynthesis.addEventListener('voiceschanged', onLoaded)
      setTimeout(() => {
        window.speechSynthesis.removeEventListener('voiceschanged', onLoaded)
        _jaVoice = _pickBestJapaneseVoice(window.speechSynthesis.getVoices())
        resolve(_jaVoice)
      }, 2000)
    })
  }

  async function speakText(text) {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const cleanText = text.split('/')[0].trim()
    const utterance = new SpeechSynthesisUtterance(cleanText)
    utterance.lang = 'ja-JP'
    const voice = await _getJapaneseVoice()
    if (voice) utterance.voice = voice
    utterance.rate = 0.85
    utterance.pitch = 1.0
    utterance.volume = 1.0
    window.speechSynthesis.speak(utterance)
  }

  function _profileDocRef(profileOverride) {
    const profile = (profileOverride || currentProfile.value || 'guest').toLowerCase()
    return doc(db, 'artifacts', appId, 'profiles', profile, 'appState', 'main')
  }

  let _syncTimer = null
  let _lastSyncAt = 0

  function _buildPayload() {
    return {
      kanaData: kanaData.value.map(k => ({ ...k })),
      katakanaData: katakanaData.value.map(k => ({ ...k })),
      vocabData: vocabData.value.map(v => ({ ...v })),
      dailyStats: { ...dailyStats.value },
      _savedAt: new Date().toISOString(),
      _profile: currentProfile.value,
    }
  }

  // Persistenza solo su BE; sync con debounce 300ms durante il quiz; saveNow() per salvataggio esplicito.
  function sync() {
    if (!currentProfile.value) return
    if (_syncTimer) clearTimeout(_syncTimer)
    _syncTimer = setTimeout(() => {
      _syncTimer = null
      const payload = _buildPayload()
      const clean = JSON.parse(JSON.stringify(payload))
      _lastSyncAt = Date.now()
      if (auth.currentUser) {
        _saveViaRestApi(clean).catch(err => console.warn('sync failed:', err.message))
      }
    }, 300)
  }

  // Caricamento via REST (fallback se onSnapshot non riceve dati, es. incognito).
  async function _loadViaRestApi() {
    const u = auth.currentUser
    if (!u) return null
    try {
      const token = await u.getIdToken()
      const path = `artifacts/${appId}/profiles/${currentProfile.value}/appState/main`
      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${path}?alt=json`
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (!res.ok) return null
      const json = await res.json()
      const fields = json.fields
      if (!fields?.data?.stringValue) return null
      return JSON.parse(fields.data.stringValue)
    } catch (_) {
      return null
    }
  }

  // Salvataggio via REST API (evita blocchi dell'SDK su setDoc).
  async function _saveViaRestApi(payload) {
    const u = auth.currentUser
    if (!u) throw new Error('no-auth')
    const token = await u.getIdToken()
    const path = `artifacts/${appId}/profiles/${currentProfile.value}/appState/main`
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${path}?updateMask.fieldPaths=data&updateMask.fieldPaths=_savedAt&updateMask.fieldPaths=_profile&alt=json`
    const body = JSON.stringify({
      fields: {
        data: { stringValue: JSON.stringify(payload) },
        _savedAt: { stringValue: new Date().toISOString() },
        _profile: { stringValue: currentProfile.value },
      },
    })
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body,
    })
    if (!res.ok) {
      if (res.status === 404) {
        // Documento non esiste: creazione con POST.
        const createUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/artifacts/${appId}/profiles/${currentProfile.value}/appState?documentId=main&alt=json`
        const createRes = await fetch(createUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fields: {
              data: { stringValue: JSON.stringify(payload) },
              _savedAt: { stringValue: new Date().toISOString() },
              _profile: { stringValue: currentProfile.value },
            },
          }),
        })
        if (!createRes.ok) {
          const err = await createRes.json().catch(() => ({}))
          throw new Error(err.error?.message || `HTTP ${createRes.status}`)
        }
      } else {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || `HTTP ${res.status}`)
      }
    }
  }

  // Garantisce utente Firebase autenticato; riprova signIn se necessario.
  async function _ensureAuth() {
    if (auth.currentUser) return auth.currentUser
    return new Promise((resolve) => {
      // Attesa max 4s per onAuthStateChanged prima di signInAnonymously.
      let done = false
      const unsub = onAuthStateChanged(auth, (u) => {
        if (done) return
        if (u) { done = true; unsub(); resolve(u) }
      })
      setTimeout(async () => {
        if (done) return
        done = true; unsub()
        try {
          const cred = await signInAnonymously(auth)
          resolve(cred.user)
        } catch (_) {
          resolve(null)
        }
      }, 4000)
    })
  }

  // Salvataggio manuale (bottone): usa REST API. Mostra sempre il toast con icona che ruota e poi success/error.
  // Quando fromQuizEnd: true, non mostrare toast né saveErrorModal (la modale fine-quiz mostra esito e grafico).
  async function saveNow(opts = {}) {
    const fromQuizEnd = !!opts.fromQuizEnd
    if (!currentProfile.value || isSyncing.value) return
    if (_syncTimer) { clearTimeout(_syncTimer); _syncTimer = null }
    const payload = _buildPayload()
    const clean = JSON.parse(JSON.stringify(payload))
    isSyncing.value = true
    saveSuccess.value = false
    saveErrorModal.value = null
    if (!fromQuizEnd) quizSavedToast.value = 'saving'
    const savingStart = Date.now()
    const minSavingMs = 700
    try {
      const u = await _ensureAuth()
      if (!u) throw new Error('no-auth')

      _lastSyncAt = Date.now()
      await _saveViaRestApi(clean)
      saveSuccess.value = true
      setTimeout(() => { saveSuccess.value = false }, 2500)
      const elapsed = Date.now() - savingStart
      const wait = Math.max(0, minSavingMs - elapsed)
      if (!fromQuizEnd) {
        setTimeout(() => {
          quizSavedToast.value = 'success'
          setTimeout(() => { quizSavedToast.value = '' }, 2200)
        }, wait)
      }
    } catch (err) {
      console.error('❌ saveNow:', err.message)
      const msg = err.message || String(err)
      if (!fromQuizEnd) {
        if (msg === 'no-auth') {
          saveErrorModal.value = {
            title: 'Autenticazione non disponibile',
            text: 'Non è stato possibile verificare l\'identità. Riprova o ricarica la pagina.',
          }
        } else if (msg.includes('403') || msg.includes('PERMISSION_DENIED')) {
          saveErrorModal.value = {
            title: 'Permesso negato',
            text: 'Le regole di Firestore non permettono il salvataggio. Controlla la configurazione del progetto Firebase.',
          }
        } else if (msg.includes('404') || msg.includes('NOT_FOUND')) {
          saveErrorModal.value = {
            title: 'Documento non trovato',
            text: 'Il percorso del documento potrebbe essere errato. Riprova.',
          }
        } else {
          saveErrorModal.value = {
            title: 'Salvataggio fallito',
            text: msg.length > 120 ? msg.slice(0, 120) + '…' : msg,
          }
        }
        const elapsedErr = Date.now() - savingStart
        const waitErr = Math.max(0, minSavingMs - elapsedErr)
        setTimeout(() => {
          quizSavedToast.value = 'error'
          setTimeout(() => { quizSavedToast.value = '' }, 2200)
        }, waitErr)
      }
    } finally {
      isSyncing.value = false
    }
  }

  function endQuiz(askToSave = false) {
    if (askToSave) {
      openQuizEndModalAndSave()
    } else {
      _clearQuizState()
    }
  }

  function _clearQuizState() {
    quizActive.value = false
    quizQueue.value = []
    vocabRomajiBlocks.value = []
    vocabRomajiCurrentIdx.value = 0
    vocabRomajiBlockInput.value = ''
    vocabWriteMistakes.value = 0
    answerFeedback.value = null
    showSaveProgressAfterQuiz.value = false
    quizResults.value = { correct: 0, total: 0 }
  }

  function openQuizEndModalAndSave() {
    quizActive.value = false
    quizEndModalPhase.value = 'saving'
    const savingStart = Date.now()
    const minSavingMs = 700
    saveNow({ fromQuizEnd: true })
      .then(() => {
        const elapsed = Date.now() - savingStart
        const wait = Math.max(0, minSavingMs - elapsed)
        setTimeout(() => {
          quizEndModalPhase.value = 'success'
          setTimeout(() => { quizEndModalPhase.value = 'chart' }, 800)
        }, wait)
      })
      .catch(() => {
        const elapsed = Date.now() - savingStart
        const wait = Math.max(0, minSavingMs - elapsed)
        setTimeout(() => {
          quizEndModalPhase.value = 'error'
          setTimeout(() => { quizEndModalPhase.value = 'chart' }, 800)
        }, wait)
      })
  }

  function closeQuizEndModal() {
    quizEndModalPhase.value = ''
    _clearQuizState()
  }

  function restartQuizFromEndModal() {
    quizEndModalPhase.value = ''
    // Restart with same config: same type, same items, same difficulty (no modals).
    startQuizFinal(quizDifficulty.value)
  }

  async function closeQuizAndOptionalSave(save) {
    if (save) await saveNow()
    _clearQuizState()
  }

  function genOptions(cur) {
    if (quizDifficulty.value === 'difficile') {
      isAnswered.value = false
      return
    }
    const num = quizDifficulty.value === 'facile' ? 3 : 4
    const pool = quizPendingItems.value
    const wr =
      quizType.value === 'vocab'
        ? _pickVocabDistractors(cur, pool, num - 1)
        : _shuffleArray(pool.filter(i => String(i.id) !== String(cur.id))).slice(0, num - 1)
    options.value = _shuffleOptionsUnique([cur, ...wr])
    selectedOption.value = null
    isAnswered.value = false
  }

  // Quiz vocab-kana-read: mostra i kana della parola, l'utente scrive il romaji per ogni blocco.
  function initVocabKanaRead(item) {
    const chars = Array.from(item.word.split('/')[0].trim().replace(/\s+/g, ''))
    const allKana = HIRAGANA_GRID.flat().filter(Boolean)
    const blocks = chars.map(ch => {
      const found = allKana.find(k => k.c === ch)
      return {
        kana: ch,
        romaji: found ? found.r : ch,
        userInput: '',
        state: 'idle',
      }
    })
    vocabRomajiBlocks.value = blocks
    vocabRomajiCurrentIdx.value = 0
    vocabRomajiBlockInput.value = ''
    vocabWriteMistakes.value = 0
  }

  // Alias per compatibilità con nome precedente.
  function initVocabRomajiInput(item) { initVocabKanaRead(item) }

  // Conferma blocco: utente ha scritto il romaji per il kana corrente.
  function confirmRomajiBlock() {
    const idx = vocabRomajiCurrentIdx.value
    const block = vocabRomajiBlocks.value[idx]
    if (!block) return

    const input = vocabRomajiBlockInput.value.trim().toLowerCase()
    const correct = block.romaji.toLowerCase()
    const ok = input === correct

    vocabRomajiBlocks.value = vocabRomajiBlocks.value.map((b, i) =>
      i === idx ? { ...b, userInput: vocabRomajiBlockInput.value, state: ok ? 'ok' : 'wrong' } : b
    )
    vocabRomajiBlockInput.value = ''

    if (!ok) vocabWriteMistakes.value++

    if (idx + 1 < vocabRomajiBlocks.value.length) {
      setTimeout(() => {
        vocabRomajiCurrentIdx.value = idx + 1
      }, ok ? 300 : 700)
    } else {
      // Fine parola: invia processAnswer e resetta blocchi.
      const allOk = vocabWriteMistakes.value === 0
      const item = quizQueue.value[currentQuestionIndex.value]
      setTimeout(() => {
        vocabRomajiBlocks.value = []
        vocabRomajiCurrentIdx.value = 0
        vocabRomajiBlockInput.value = ''
        processAnswer(allOk, item, allOk ? '' : `${vocabWriteMistakes.value} errori`)
      }, ok ? 400 : 800)
    }
  }

  function _advanceQuiz() {
    answerFeedback.value = null
    lastAnswerSnapshot.value = null
    if (currentQuestionIndex.value + 1 < quizQueue.value.length) {
      currentQuestionIndex.value++
      const next = quizQueue.value[currentQuestionIndex.value]
      if (quizType.value === 'vocab-kana-read' || quizType.value === 'vocab-romaji-input') {
        initVocabKanaRead(next)
      } else if (quizType.value === 'vocab-romaji') {
        _genVocabRomajiOptions(next)
        manualInput.value = ''
      } else if (quizType.value === 'vocab-kana-to-romaji') {
        manualInput.value = ''
        isAnswered.value = false
      } else {
        genOptions(next)
        manualInput.value = ''
      }
    } else {
      endQuiz(true)
    }
  }

  function processAnswer(ok, item, userAnswerText, skipFeedback = false) {
    _lastSyncAt = Date.now()
    const todayStr = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
      .toISOString().split('T')[0]
    const curDay = _normalizeDayStats(dailyStats.value[todayStr])
    const getItemState = (arr) => arr.find((x) => x.id === item.id)
    const k = quizType.value === 'kana' ? getItemState(kanaData.value)
      : quizType.value === 'katakana' ? getItemState(katakanaData.value)
      : getItemState(vocabData.value)
    lastAnswerSnapshot.value = {
      quizResults: { ...quizResults.value },
      todayStr,
      dayStatsBefore: { ...curDay },
      itemId: item.id,
      scoreBefore: k ? k.score : 0,
      attemptsBefore: k ? k.attempts : 0,
    }
    if (ok) {
      quizResults.value = { ...quizResults.value, correct: quizResults.value.correct + 1 }
      speakText(
        quizType.value === 'kana' || quizType.value === 'katakana'
          ? item.character
          : item.word
      )
    }

    const isKanaQuiz = quizType.value === 'kana' || quizType.value === 'katakana'
    const nextDay = {
      ...curDay,
      total: curDay.total + 1,
      correct: curDay.correct + (ok ? 1 : 0),
      kana: quizType.value === 'kana'
        ? { total: curDay.kana.total + 1, correct: curDay.kana.correct + (ok ? 1 : 0) }
        : curDay.kana,
      katakana: quizType.value === 'katakana'
        ? { total: curDay.katakana.total + 1, correct: curDay.katakana.correct + (ok ? 1 : 0) }
        : curDay.katakana,
      vocab: !isKanaQuiz
        ? { total: curDay.vocab.total + 1, correct: curDay.vocab.correct + (ok ? 1 : 0) }
        : curDay.vocab,
    }
    dailyStats.value = {
      ...dailyStats.value,
      [todayStr]: nextDay,
    }

    const upd = (data) =>
      data.map((x) => {
        if (x.id === item.id) {
          const ns = ok ? Math.min(100, x.score + 25) : (x.score >= 80 ? 40 : 0)
          return { ...x, score: ns, attempts: x.attempts + 1 }
        }
        return x
      })

    if (quizType.value === 'kana') {
      kanaData.value = upd(kanaData.value)
    } else if (quizType.value === 'katakana') {
      katakanaData.value = upd(katakanaData.value)
    } else {
      vocabData.value = upd(vocabData.value)
    }

    sync()

    const isKana = quizType.value === 'kana'
    const isVocabKanaToRomaji = quizType.value === 'vocab-kana-to-romaji'
    let correctAnswer = ''
    if (quizType.value === 'kana') {
      correctAnswer = quizDirection.value === 'ja-to-romaji' ? item.romaji : item.character
    } else if (quizType.value === 'vocab') {
      correctAnswer = quizDirection.value === 'ja-to-romaji' ? item.meaning : item.word
    } else if (quizType.value === 'vocab-romaji' || quizType.value === 'vocab-kana-to-romaji') {
      correctAnswer = (quizType.value === 'vocab-kana-to-romaji' && vocabKanaToRomajiInputLang.value === 'it')
        ? item.word.split('/')[0]
        : item.romaji.split('/')[0]
    } else {
      correctAnswer = isKana ? item.romaji : item.meaning
    }

    if (!skipFeedback) {
      if (ok && !isVocabKanaToRomaji) {
        setTimeout(() => { _advanceQuiz() }, 600)
      } else if (!ok || isVocabKanaToRomaji) {
        answerFeedback.value = {
          ok,
          userAnswer: userAnswerText || '',
          correctAnswer,
          questionLabel: isKana ? item.character : item.word,
          romaji: item.romaji || '',
          meaning: item.meaning || '',
        }
      }
    } else {
      setTimeout(() => { _advanceQuiz() }, 400)
    }
  }

  function advanceAfterFeedback() {
    _advanceQuiz()
  }

  function undoLastAnswer() {
    const s = lastAnswerSnapshot.value
    if (!s) return
    quizResults.value = { ...s.quizResults }
    dailyStats.value = {
      ...dailyStats.value,
      [s.todayStr]: { ...s.dayStatsBefore },
    }
    const revert = (data) =>
      data.map((x) =>
        x.id === s.itemId ? { ...x, score: s.scoreBefore, attempts: s.attemptsBefore } : x
      )
    if (quizType.value === 'kana') {
      kanaData.value = revert(kanaData.value)
    } else if (quizType.value === 'katakana') {
      katakanaData.value = revert(katakanaData.value)
    } else {
      vocabData.value = revert(vocabData.value)
    }
    answerFeedback.value = null
    lastAnswerSnapshot.value = null
    const item = quizQueue.value[currentQuestionIndex.value]
    if (!item) return
    if (quizType.value === 'vocab-kana-read' || quizType.value === 'vocab-romaji-input') {
      initVocabKanaRead(item)
    } else if (quizType.value === 'vocab-romaji') {
      _genVocabRomajiOptions(item)
      manualInput.value = ''
    } else if (quizType.value === 'vocab-kana-to-romaji') {
      manualInput.value = ''
      isAnswered.value = false
    } else {
      genOptions(item)
      manualInput.value = ''
    }
    selectedOption.value = null
    isAnswered.value = false
    sync()
  }

  function handleManualSubmit() {
    if (!isAnswered.value && manualInput.value.trim()) {
      isAnswered.value = true
      const item = quizQueue.value[currentQuestionIndex.value]
      const userText = manualInput.value.trim()
      let correctText
      if (quizType.value === 'kana' || quizType.value === 'katakana') {
        correctText = quizDirection.value === 'ja-to-romaji'
          ? item.romaji.split('/')[0].trim().toLowerCase()
          : item.character.trim()
      } else if (quizType.value === 'vocab') {
        correctText = quizDirection.value === 'ja-to-romaji'
          ? item.meaning.trim().toLowerCase()
          : item.word.split('/')[0].trim()
    } else if (quizType.value === 'vocab-romaji' || quizType.value === 'vocab-kana-to-romaji') {
      correctText = quizType.value === 'vocab-kana-to-romaji' && vocabKanaToRomajiInputLang.value === 'it'
        ? item.word.split('/')[0].trim().replace(/\s+/g, ' ').replace(/\s/g, '')
        : normalizeRomajiForCompare(item.romaji.split('/')[0].trim())
    } else {
        correctText = item.romaji.split('/')[0].trim().toLowerCase()
      }
      const normalizedUser = (quizType.value === 'vocab-kana-to-romaji' && vocabKanaToRomajiInputLang.value === 'it')
        ? userText.trim().replace(/\s+/g, ' ').replace(/\s/g, '')
        : (quizType.value === 'vocab-kana-to-romaji' || quizType.value === 'vocab-romaji')
          ? normalizeRomajiForCompare(userText)
          : userText.toLowerCase()
      const ok = normalizedUser === correctText
      processAnswer(ok, item, userText)
    }
  }

  /**
   * Normalize romaji for equality checks: macrons → double vowels, then Hepburn "ou" → "oo"
   * so Okāsan / Okaasan / (same form) and Otōsan / Otousan / Otoosan all match.
   * Sensē / Sensei and Gakusē / Gakusei via sei→see after macrons.
   */
  function normalizeRomajiForCompare(str) {
    let s = str
      .toLowerCase()
      .replace(/ā/g, 'aa')
      .replace(/ī/g, 'ii')
      .replace(/ū/g, 'uu')
      .replace(/ē/g, 'ee')
      .replace(/ō/g, 'oo')
      .replace(/\s+/g, ' ')
      .trim()
    s = s.replace(/ou/g, 'oo')
    // せい as Hepburn "sei" (Sensē / Gakusē vs Sensei / Gakusei)
    s = s.replace(/sei/g, 'see')
    return s
  }

  function handleAnswer(option) {
    if (!isAnswered.value) {
      selectedOption.value = option
      isAnswered.value = true
      const item = quizQueue.value[currentQuestionIndex.value]
      const ok = option.id === item.id
      const userText = ok ? '' : getOptionLabel_internal(option)
      processAnswer(ok, item, userText)
    }
  }

  function getOptionLabel_internal(opt) {
    if (quizType.value === 'vocab-romaji') return opt.romaji.split('/')[0]
    if (quizDirection.value === 'ja-to-romaji')
      return (quizType.value === 'kana' || quizType.value === 'katakana') ? opt.romaji : opt.meaning
    return (quizType.value === 'kana' || quizType.value === 'katakana') ? opt.character : opt.word.split('/')[0]
  }

  /** Last up to VOCAB_LAST_BATCH_MAX items by id order within the current vocab pool. */
  function getLast20FromVocabPool(items) {
    if (!items || items.length === 0) return []
    const sorted = [...items].sort((a, b) =>
      String(a.id).localeCompare(String(b.id), undefined, { numeric: true })
    )
    const take = Math.min(VOCAB_LAST_BATCH_MAX, sorted.length)
    return sorted.slice(-take)
  }

  /** UI order: Random → COMBINATE → ALLUNGAMENTI → others (A–Z, it). */
  const VOCAB_CATEGORY_ORDER_PREFIX = ['Random', 'COMBINATE', 'ALLUNGAMENTI']

  function orderVocabCategories(categories) {
    const set = new Set(categories)
    const head = VOCAB_CATEGORY_ORDER_PREFIX.filter(c => set.has(c))
    const tail = [...categories]
      .filter(c => !VOCAB_CATEGORY_ORDER_PREFIX.includes(c))
      .sort((a, b) => a.localeCompare(b, 'it', { sensitivity: 'base' }))
    return [...head, ...tail]
  }

  function defaultSelectedVocabCategories(allCategoryNames) {
    return allCategoryNames.includes('Random') ? ['Random'] : []
  }

  function handleStartQuizClick(type, forced = null) {
    quizType.value = type
    if (forced) {
      enteredDifficultyFromVocabCategories.value = false
      quizPendingItems.value = forced
      difficultyModalOpen.value = true
      return
    }
    if (type === 'kana') {
      if (kanaData.value.length < 4) {
        customAlert.value = '🌸 Aggiungi almeno 4 Kana prima!'
        return
      }
      selectedKanaIds.value = []
      quizSetupModalOpen.value = true
    } else if (type === 'katakana') {
      if (katakanaData.value.length < 4) {
        customAlert.value = '💙 Aggiungi almeno 4 Katakana prima!'
        return
      }
      selectedKatakanaIds.value = []
      katakanaSetupModalOpen.value = true
    } else if (type === 'vocab-kana-to-romaji') {
      const allCats = [...new Set(vocabData.value.map(v => v.category))]
      if (allCats.length < 1) {
        customAlert.value = '🌸 Nessuna categoria vocabolario disponibile!'
        return
      }
      enteredDifficultyFromVocabCategories.value = false
      selectedVocabCategories.value = defaultSelectedVocabCategories(allCats)
      vocabKanaToRomajiMaxQuestions.value = null
      vocabSetupModalOpen.value = true
    } else {
      enteredDifficultyFromVocabCategories.value = false
      selectedVocabCategories.value = defaultSelectedVocabCategories([...new Set(vocabData.value.map(v => v.category))])
      vocabSetupModalOpen.value = true
    }
  }

  function proceedFromVocabSetup() {
    const filtered = vocabData.value.filter(v =>
      selectedVocabCategories.value.includes(v.category)
    )
    const minVocab = (quizType.value === 'vocab' || quizType.value === 'vocab-romaji') ? 4 : 1
    if (filtered.length < minVocab) {
      customAlert.value = `🌸 Seleziona categorie con almeno ${minVocab} parole!`
      return
    }
    quizPendingItems.value = filtered
    enteredDifficultyFromVocabCategories.value = true
    vocabSetupModalOpen.value = false
    difficultyModalOpen.value = true
  }

  function backFromDifficultyToVocabSetup() {
    if (!enteredDifficultyFromVocabCategories.value) return
    difficultyModalOpen.value = false
    vocabSetupModalOpen.value = true
  }

  function closeDifficultyModal() {
    difficultyModalOpen.value = false
    enteredDifficultyFromVocabCategories.value = false
  }

  function closeVocabSetupModal() {
    vocabSetupModalOpen.value = false
    enteredDifficultyFromVocabCategories.value = false
  }

  function proceedFromSetup() {
    if (selectedKanaIds.value.length < 4) {
      customAlert.value = 'Seleziona almeno 4 Kana!'
      return
    }
    const selectedItems = kanaData.value.filter(k => selectedKanaIds.value.includes(k.id))
    lastKanaQuizSelection.value = [...selectedKanaIds.value]
    quizPendingItems.value = selectedItems
    quizSetupModalOpen.value = false
    difficultyModalOpen.value = true
  }

  function proceedFromKatakanaSetup() {
    if (selectedKatakanaIds.value.length < 4) {
      customAlert.value = 'Seleziona almeno 4 Katakana!'
      return
    }
    const selectedItems = katakanaData.value.filter(k => selectedKatakanaIds.value.includes(k.id))
    lastKatakanaQuizSelection.value = [...selectedKatakanaIds.value]
    quizPendingItems.value = selectedItems
    katakanaSetupModalOpen.value = false
    difficultyModalOpen.value = true
  }

  function restartLastKanaQuiz() {
    if (!lastKanaQuizSelection.value || lastKanaQuizSelection.value.length < 4) {
      customAlert.value = 'Non c’è ancora un quiz kana precedente con almeno 4 caratteri.'
      return
    }
    quizType.value = 'kana'
    const selectedItems = kanaData.value.filter(k => lastKanaQuizSelection.value.includes(k.id))
    if (selectedItems.length < 4) {
      customAlert.value = 'Alcuni kana dell’ultimo quiz non esistono più. Seleziona di nuovo i kana.'
      return
    }
    selectedKanaIds.value = [...lastKanaQuizSelection.value]
    quizPendingItems.value = selectedItems
    quizSetupModalOpen.value = false
    difficultyModalOpen.value = true
  }

  function restartLastKatakanaQuiz() {
    if (!lastKatakanaQuizSelection.value || lastKatakanaQuizSelection.value.length < 4) {
      customAlert.value = 'Non c\'è ancora un quiz katakana precedente con almeno 4 caratteri.'
      return
    }
    quizType.value = 'katakana'
    const selectedItems = katakanaData.value.filter(k => lastKatakanaQuizSelection.value.includes(k.id))
    if (selectedItems.length < 4) {
      customAlert.value = 'Alcuni katakana dell\'ultimo quiz non esistono più. Seleziona di nuovo.'
      return
    }
    selectedKatakanaIds.value = [...lastKatakanaQuizSelection.value]
    quizPendingItems.value = selectedItems
    katakanaSetupModalOpen.value = false
    difficultyModalOpen.value = true
  }

  function startQuizFinal(diff, forceLast20 = false) {
    quizDifficulty.value = diff
    enteredDifficultyFromVocabCategories.value = false
    difficultyModalOpen.value = false
    let pool = quizPendingItems.value
    if ((quizType.value === 'vocab-romaji' || quizType.value === 'vocab-kana-to-romaji') && forceLast20) {
      const last20 = getLast20FromVocabPool(pool)
      pool = last20.length > 0 ? last20 : pool
    }
    const isVocabQuiz =
      quizType.value === 'vocab' ||
      quizType.value === 'vocab-romaji' ||
      quizType.value === 'vocab-kana-to-romaji' ||
      quizType.value === 'vocab-kana-read' ||
      quizType.value === 'vocab-romaji-input'
    let shuffled = isVocabQuiz
      ? _orderVocabQuizQueue(_dedupeVocabById(pool))
      : _shuffleArray([...pool])
    if (quizType.value === 'vocab-kana-to-romaji') {
      const max = vocabKanaToRomajiMaxQuestions.value
      const num = typeof max === 'number' && !Number.isNaN(max) && max > 0 ? max : null
      if (num != null) shuffled = shuffled.slice(0, num)
    }
    quizQueue.value = shuffled
    currentQuestionIndex.value = 0
    quizResults.value = { correct: 0, total: shuffled.length }

    if (quizType.value === 'vocab-kana-read' || quizType.value === 'vocab-romaji-input') {
      initVocabKanaRead(shuffled[0])
    } else if (quizType.value === 'vocab-romaji') {
      _genVocabRomajiOptions(shuffled[0])
      manualInput.value = ''
    } else if (quizType.value === 'vocab-kana-to-romaji') {
      manualInput.value = ''
      isAnswered.value = false
    } else {
      genOptions(shuffled[0])
      manualInput.value = ''
    }
    quizActive.value = true
  }

  // Opzioni per quiz vocab-romaji (romaji delle parole).
  function _genVocabRomajiOptions(cur) {
    if (quizDifficulty.value === 'difficile') {
      isAnswered.value = false
      return
    }
    const num = quizDifficulty.value === 'facile' ? 3 : 4
    const wrong = _pickVocabDistractors(cur, quizPendingItems.value, num - 1)
    options.value = _shuffleOptionsUnique([cur, ...wrong])
    selectedOption.value = null
    isAnswered.value = false
  }

  function updateVocabNoteLocal(id, val) {
    vocabData.value = vocabData.value.map(v => v.id === id ? { ...v, personalNote: val } : v)
    saveNow().catch(() => {})
  }

  function resetKanaScore(id) {
    kanaData.value = kanaData.value.map(k => k.id === id ? { ...k, score: 0, attempts: 0 } : k)
    saveNow().catch(() => {})
  }

  function resetKatakanaScore(id) {
    katakanaData.value = katakanaData.value.map(k => k.id === id ? { ...k, score: 0, attempts: 0 } : k)
    saveNow().catch(() => {})
  }

  function resetVocabScore(id) {
    vocabData.value = vocabData.value.map(v => v.id === id ? { ...v, score: 0, attempts: 0 } : v)
    saveNow().catch(() => {})
  }

  let _unsubSnapshot = null

  // Merge dati cloud con array base (keepAllInit per kana, skipCloudOnly per vocab).
  function _mergeFunc(initArr, cloud, keepAllInit = false, skipCloudOnly = false) {
    if (!cloud || !Array.isArray(cloud) || cloud.length === 0) return initArr.map(i => ({ ...i }))
    const cloudMap = new Map(cloud.map(i => [i.id, i]))
    const initIds = new Set(initArr.map(i => i.id))
    const mergedFromInit = keepAllInit
      ? initArr.map((base) => ({ ...base, ...cloudMap.get(base.id) }))
      : initArr
          .filter((base) => cloudMap.has(base.id))
          .map((base) => ({ ...base, ...cloudMap.get(base.id) }))
    const cloudOnly = skipCloudOnly ? [] : cloud.filter((c) => !initIds.has(c.id))
    return [...mergedFromInit, ...cloudOnly]
  }

  function _applyData(d) {
    // Supporta payload REST (data = stringa JSON) e formato legacy (campi in chiaro).
    let raw = d
    if (typeof d?.data === 'string') {
      try { raw = JSON.parse(d.data) } catch (_) { raw = d }
    }
    kanaData.value = _mergeFunc(INITIAL_KANA, raw.kanaData, true)
    katakanaData.value = _mergeFunc(INITIAL_KATAKANA, raw.katakanaData, true)
    const vocabCloudMap = new Map((raw.vocabData || []).map((i) => [i.id, i]))
    vocabData.value = INITIAL_VOCAB.map((base) => {
      const cloud = vocabCloudMap.get(base.id)
      return {
        ...base,
        score: cloud?.score ?? base.score,
        attempts: cloud?.attempts ?? base.attempts,
        personalNote: cloud?.personalNote ?? base.personalNote,
      }
    })
    if (raw.dailyStats && typeof raw.dailyStats === 'object') {
      const normalized = {}
      for (const [date, day] of Object.entries(raw.dailyStats)) {
        normalized[date] = _normalizeDayStats(day)
      }
      dailyStats.value = normalized
    }
  }

  async function _loadProfileData() {
    if (!db || !currentProfile.value) { isCloudLoaded.value = true; return }
    if (_unsubSnapshot) { _unsubSnapshot(); _unsubSnapshot = null }

    const docRef = _profileDocRef()
    isCloudLoaded.value = false

    // onSnapshot + fallback REST: in incognito onSnapshot può non ricevere dati.
    let _firstSnapDone = false
    let _dataLoaded = false
    let lastAppliedCloudSavedAt = null

    function _applyIfNeeded(d) {
      if (_dataLoaded) return
      _dataLoaded = true
      const payload = typeof d?.data === 'string' ? JSON.parse(d.data) : d
      _applyData(payload)
      if (d?._savedAt) lastAppliedCloudSavedAt = d._savedAt
      if (!isCloudLoaded.value) isCloudLoaded.value = true
    }

    _unsubSnapshot = onSnapshot(docRef, { includeMetadataChanges: false }, (snap) => {
      if (snap.metadata.hasPendingWrites) return
      if (_syncTimer !== null) return
      if (_lastSyncAt && Date.now() - _lastSyncAt < 2000) return

      if (!_firstSnapDone) {
        _firstSnapDone = true
        if (snap.exists()) {
          _applyIfNeeded(snap.data())
          console.log('✅ onSnapshot caricato dal cloud')
        } else {
          _tryMigrateFromCapital(docRef)
          if (!_dataLoaded && !isCloudLoaded.value) isCloudLoaded.value = true
        }
        return
      }
      if (snap.exists()) {
        const d = snap.data()
        const incomingSavedAt = d._savedAt || ''
        if (lastAppliedCloudSavedAt && incomingSavedAt && incomingSavedAt <= lastAppliedCloudSavedAt) {
          return
        }
        const payload = typeof d?.data === 'string' ? JSON.parse(d.data) : d
        _applyData(payload)
        if (incomingSavedAt) lastAppliedCloudSavedAt = incomingSavedAt
        console.log('🔄 onSnapshot: aggiornamento')
      }
    }, (err) => {
      console.error('❌ onSnapshot error:', err.code)
      if (!isCloudLoaded.value) isCloudLoaded.value = true
    })

    _loadViaRestApi().then((data) => {
      if (data) {
        _applyIfNeeded(data)
        console.log('✅ REST API caricato dal cloud')
      }
    })

    setTimeout(() => {
      if (!isCloudLoaded.value) isCloudLoaded.value = true
    }, 5000)
  }

  async function _tryMigrateFromCapital(docRef) {
    try {
      const profileCapital = (currentProfile.value || '').replace(/^\w/, c => c.toUpperCase())
      const oldRef = doc(db, 'artifacts', appId, 'profiles', profileCapital, 'appState', 'main')
      console.log('🔄 Provo migrazione da vecchio doc:', oldRef.path)
      const oldSnap = await getDoc(oldRef)
      if (oldSnap.exists()) {
        const d = oldSnap.data()
        const payload = typeof d.data === 'string' ? JSON.parse(d.data) : { kanaData: d.kanaData, vocabData: d.vocabData, dailyStats: d.dailyStats }
        _applyData(payload)
        await _saveViaRestApi(payload)
        console.log('✅ Migrazione completata →', currentProfile.value)
      } else {
        console.log('ℹ️ Nessun documento trovato (profilo nuovo)')
      }
    } catch (err) {
      console.warn('⚠️ migrazione fallita:', err.code)
    }
  }

  function selectProfile(name) {
    const normalized = name.toLowerCase()
    isCloudLoaded.value = false
    currentProfile.value = normalized
    localStorage.setItem('hiragana_profile', normalized)
    profileSelectOpen.value = false
    _loadProfileData()
  }

  function setProfileFromRoute(name) {
    const normalized = name.toLowerCase()
    if (currentProfile.value === normalized) return
    isCloudLoaded.value = false
    currentProfile.value = normalized
    localStorage.setItem('hiragana_profile', normalized)
    profileSelectOpen.value = false
    _loadProfileData()
  }

  function switchProfile() {
    if (_unsubSnapshot) { _unsubSnapshot(); _unsubSnapshot = null }
    profileSelectOpen.value = true
  }

  function init() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      _getJapaneseVoice()
    }

    if (!currentProfile.value) {
      isCloudLoaded.value = true
    }

    onAuthStateChanged(auth, (user) => {
      if (user) {
        if (currentProfile.value) {
          _loadProfileData()
        }
      } else {
        signInAnonymously(auth).catch((err) => {
          console.error('❌ signInAnonymously failed:', err)
          if (!isCloudLoaded.value) isCloudLoaded.value = true
        })
      }
    })

    setTimeout(() => {
      if (!isCloudLoaded.value && !currentProfile.value) isCloudLoaded.value = true
    }, 6000)
  }

  return {
    kanaData, katakanaData, vocabData, dailyStats, user, isCloudLoaded, forceLoadingScreen,
    currentProfile, profileSelectOpen, isSyncing, saveSuccess, saveErrorModal,
    selectedKanaModal, selectedKatakanaModal, selectedVocabModal, customAlert, confirmModal,
    hideGridRomaji, hideKatakanaGridRomaji, statsTimeRange,
    quizActive, quizEndModalPhase, showSaveProgressAfterQuiz, quizSavedToast, quizSetupModalOpen, katakanaSetupModalOpen, vocabSetupModalOpen, difficultyModalOpen, vocabKanaToRomajiMaxQuestions, vocabKanaToRomajiInputLang,
    selectedKanaIds, selectedKatakanaIds, quizPendingItems,
    selectedVocabCategories, enteredDifficultyFromVocabCategories,
    quizDifficulty, quizDirection, quizQueue, currentQuestionIndex,
    quizType, options, selectedOption, isAnswered, quizResults, manualInput,
    vocabRomajiBlocks, vocabRomajiCurrentIdx, vocabRomajiBlockInput, lastKanaQuizSelection, lastKatakanaQuizSelection,
    answerFeedback, lastAnswerSnapshot,
    speakText, sync, saveNow, endQuiz, closeQuizAndOptionalSave, openQuizEndModalAndSave, closeQuizEndModal, restartQuizFromEndModal, genOptions, initVocabKanaRead, initVocabRomajiInput,
    processAnswer,
    resetTodayChart,
    confirmRomajiBlock,
    handleManualSubmit, handleAnswer,
    advanceAfterFeedback, undoLastAnswer,
    orderVocabCategories,
    handleStartQuizClick, proceedFromSetup, proceedFromKatakanaSetup, proceedFromVocabSetup, backFromDifficultyToVocabSetup, closeDifficultyModal, closeVocabSetupModal, startQuizFinal, restartLastKanaQuiz, restartLastKatakanaQuiz,
    updateVocabNoteLocal,
    resetKanaScore, resetKatakanaScore, resetVocabScore,
    selectProfile, setProfileFromRoute, switchProfile,
    init,
  }
})
