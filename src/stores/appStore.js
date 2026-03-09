import { defineStore } from 'pinia'
import { ref } from 'vue'
import { toHiragana } from 'wanakana'
import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth'
import { getFirestore, doc, getDoc, onSnapshot } from 'firebase/firestore'

// --- CONFIGURAZIONE FIREBASE ---
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

// --- HELPERS ESPORTATI ---
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

// --- DATASET INIZIALE ---
export const HIRAGANA_GRID = [
  [{ c: 'あ', r: 'a' }, { c: 'い', r: 'i' }, { c: 'う', r: 'u' }, { c: 'え', r: 'e' }, { c: 'お', r: 'o' }],
  [{ c: 'か', r: 'ka' }, { c: 'き', r: 'ki' }, { c: 'く', r: 'ku' }, { c: 'け', r: 'ke' }, { c: 'こ', r: 'ko' }],
  [{ c: 'が', r: 'ga' }, { c: 'ぎ', r: 'gi' }, { c: 'ぐ', r: 'gu' }, { c: 'げ', r: 'ge' }, { c: 'ご', r: 'go' }],
  [{ c: 'さ', r: 'sa' }, { c: 'し', r: 'shi' }, { c: 'す', r: 'su' }, { c: 'せ', r: 'se' }, { c: 'そ', r: 'so' }],
  [{ c: 'ざ', r: 'za' }, { c: 'じ', r: 'ji' }, { c: 'ず', r: 'zu' }, { c: 'ぜ', r: 'ze' }, { c: 'ぞ', r: 'zo' }],
  [{ c: 'た', r: 'ta' }, { c: 'ち', r: 'chi' }, { c: 'つ', r: 'tsu' }, { c: 'て', r: 'te' }, { c: 'と', r: 'to' }],
  [{ c: 'だ', r: 'da' }, { c: 'ぢ', r: 'ji' }, { c: 'づ', r: 'zu' }, { c: 'で', r: 'de' }, { c: 'ど', r: 'do' }],
  [{ c: 'な', r: 'na' }, { c: 'に', r: 'ni' }, { c: 'ぬ', r: 'nu' }, { c: 'ね', r: 'ne' }, { c: 'の', r: 'no' }],
  [{ c: 'は', r: 'ha' }, { c: 'ひ', r: 'hi' }, { c: 'ふ', r: 'fu' }, { c: 'へ', r: 'he' }, { c: 'ほ', r: 'ho' }],
  [{ c: 'ば', r: 'ba' }, { c: 'び', r: 'bi' }, { c: 'ぶ', r: 'bu' }, { c: 'べ', r: 'be' }, { c: 'ぼ', r: 'bo' }],
  [{ c: 'ぱ', r: 'pa' }, { c: 'ぴ', r: 'pi' }, { c: 'ぷ', r: 'pu' }, { c: 'ぺ', r: 'pe' }, { c: 'ぽ', r: 'po' }],
  [{ c: 'ま', r: 'ma' }, { c: 'み', r: 'mi' }, { c: 'む', r: 'mu' }, { c: 'め', r: 'me' }, { c: 'も', r: 'mo' }],
  [{ c: 'や', r: 'ya' }, null, { c: 'ゆ', r: 'yu' }, null, { c: 'よ', r: 'yo' }],
  [{ c: 'ら', r: 'ra' }, { c: 'り', r: 'ri' }, { c: 'る', r: 'ru' }, { c: 'れ', r: 're' }, { c: 'ろ', r: 'ro' }],
  [{ c: 'わ', r: 'wa' }, null, null, null, { c: 'を', r: 'wo' }],
  [{ c: 'ん', r: 'n' }, null, null, null, null],
]

// Tutti i kana della griglia, abilitati con score 0 (rosso). I preset usano i primi (es. k1–k5 Vocali).
const _gridCells = HIRAGANA_GRID.flat().filter(Boolean)
export const INITIAL_KANA = _gridCells.map((cell, i) => ({
  id: `k${i + 1}`,
  character: cell.c,
  romaji: cell.r,
  personalNote: '',
  score: 0,
  attempts: 0,
}))

export const BASE_PRESETS = [
  { id: 'p1', name: 'Vocali', kanaIds: ['k1', 'k2', 'k3', 'k4', 'k5'] },
  { id: 'p2', name: 'KA', kanaIds: ['k6', 'k7', 'k8', 'k9', 'k10'] },
  { id: 'p3', name: 'GA', kanaIds: ['k11', 'k12', 'k13', 'k14', 'k15'] },
  { id: 'p4', name: 'SA', kanaIds: ['k16', 'k17', 'k18', 'k19', 'k20'] },
  { id: 'p5', name: 'ZA', kanaIds: ['k21', 'k22', 'k23', 'k24', 'k25'] },
]

export const INITIAL_VOCAB = [
  // --- Saluti ---
  { id: 'v1a',  word: 'おはよう',           romaji: 'Ohayō',             meaning: 'Buongiorno',       category: 'Saluti', tone: 'Informale', personalNote: '', score: 0, attempts: 0 },
  { id: 'v1b',  word: 'おはようございます',  romaji: 'Ohayōgozaimasu',    meaning: 'Buongiorno',       category: 'Saluti', tone: 'Formale',   personalNote: '', score: 0, attempts: 0 },
  { id: 'v2',   word: 'こんにちは',          romaji: 'Konnichiwa',        meaning: 'Buon pomeriggio',  category: 'Saluti', tone: 'Neutro',    personalNote: '', score: 0, attempts: 0 },
  { id: 'v3',   word: 'こんばんは',          romaji: 'Konbanwa',          meaning: 'Buonasera',        category: 'Saluti', tone: 'Neutro',    personalNote: '', score: 0, attempts: 0 },
  { id: 'v4a',  word: 'おやすみ',            romaji: 'Oyasumi',           meaning: 'Buonanotte',       category: 'Saluti', tone: 'Informale', personalNote: '', score: 0, attempts: 0 },
  { id: 'v4b',  word: 'おやすみなさい',      romaji: 'Oyasuminasai',      meaning: 'Buonanotte',       category: 'Saluti', tone: 'Formale',   personalNote: '', score: 0, attempts: 0 },
  { id: 'v5',   word: 'やっほー',            romaji: 'Yahhō',             meaning: 'Ciao',             category: 'Saluti', tone: 'Informale', personalNote: 'Tra giovani quando ci si incontra', score: 0, attempts: 0 },
  { id: 'v6',   word: 'おっす',              romaji: 'Ossu',              meaning: 'Ciao / Hey',       category: 'Saluti', tone: 'Informale', personalNote: 'Tra maschi', score: 0, attempts: 0 },
  { id: 'v7a',  word: 'ひさしぶり',          romaji: 'Hisashiburi',       meaning: 'Da quanto tempo',  category: 'Saluti', tone: 'Informale', personalNote: '', score: 0, attempts: 0 },
  { id: 'v7b',  word: 'ひさしぶりです',      romaji: 'Hisashiburi desu',  meaning: 'Da quanto tempo',  category: 'Saluti', tone: 'Formale',   personalNote: '', score: 0, attempts: 0 },
  { id: 'v8a',  word: 'じゃあね',            romaji: 'Jā ne',             meaning: 'Ciao (arrivederci)', category: 'Saluti', tone: 'Informale', personalNote: 'Quando ci si separa', score: 0, attempts: 0 },
  { id: 'v8b',  word: 'またね',              romaji: 'Mata ne',           meaning: 'Ciao (arrivederci)', category: 'Saluti', tone: 'Informale', personalNote: 'Quando ci si separa', score: 0, attempts: 0 },
  // --- Random ---
  { id: 'v9',   word: 'あい',  romaji: 'Ai',        meaning: 'Amore',            category: 'Random', tone: 'Neutro', personalNote: '', score: 0, attempts: 0 },
  { id: 'v10',  word: 'いえ',  romaji: 'Ie',        meaning: 'Casa',             category: 'Random', tone: 'Neutro', personalNote: '', score: 0, attempts: 0 },
  { id: 'v11',  word: 'うえ',  romaji: 'Ue',        meaning: 'Sopra',            category: 'Random', tone: 'Neutro', personalNote: '', score: 0, attempts: 0 },
  { id: 'v12',  word: 'あおい', romaji: 'Aoi',      meaning: 'Blu',              category: 'Random', tone: 'Neutro', personalNote: '', score: 0, attempts: 0 },
  { id: 'v13',  word: 'あう',  romaji: 'Au',        meaning: 'Incontrare',       category: 'Random', tone: 'Neutro', personalNote: '', score: 0, attempts: 0 },
  { id: 'v14',  word: 'おい',  romaji: 'Oi',        meaning: 'Nipote',           category: 'Random', tone: 'Neutro', personalNote: '', score: 0, attempts: 0 },
  { id: 'v15',  word: 'かい',  romaji: 'Kai',       meaning: 'Conchiglia',       category: 'Random', tone: 'Neutro', personalNote: '', score: 0, attempts: 0 },
  { id: 'v16',  word: 'きかい', romaji: 'Kikai',    meaning: 'Macchinario',      category: 'Random', tone: 'Neutro', personalNote: '', score: 0, attempts: 0 },
  { id: 'v17',  word: 'いく',  romaji: 'Iku',       meaning: 'Andare',           category: 'Random', tone: 'Neutro', personalNote: '', score: 0, attempts: 0 },
  { id: 'v18',  word: 'いけ',  romaji: 'Ike',       meaning: 'Stagno',           category: 'Random', tone: 'Neutro', personalNote: '', score: 0, attempts: 0 },
  { id: 'v19',  word: 'こい',  romaji: 'Koi',       meaning: 'Carpa',            category: 'Random', tone: 'Neutro', personalNote: '', score: 0, attempts: 0 },
  { id: 'v20',  word: 'かお',  romaji: 'Kao',       meaning: 'Viso',             category: 'Random', tone: 'Neutro', personalNote: '', score: 0, attempts: 0 },
  { id: 'v21',  word: 'えき',  romaji: 'Eki',       meaning: 'Stazione',         category: 'Random', tone: 'Neutro', personalNote: '', score: 0, attempts: 0 },
  { id: 'v22',  word: 'あかい', romaji: 'Akai',     meaning: 'Rosso',            category: 'Random', tone: 'Neutro', personalNote: '', score: 0, attempts: 0 },
  { id: 'v23',  word: 'こえ',  romaji: 'Koe',       meaning: 'Voce',             category: 'Random', tone: 'Neutro', personalNote: '', score: 0, attempts: 0 },
  { id: 'v24',  word: 'あき',  romaji: 'Aki',       meaning: 'Autunno',          category: 'Random', tone: 'Neutro', personalNote: '', score: 0, attempts: 0 },
  { id: 'v25',  word: 'がか',  romaji: 'Gaka',      meaning: 'Pittore',          category: 'Random', tone: 'Neutro', personalNote: '', score: 0, attempts: 0 },
  { id: 'v26',  word: 'かぎ',  romaji: 'Kagi',      meaning: 'Chiave',           category: 'Random', tone: 'Neutro', personalNote: '', score: 0, attempts: 0 },
  { id: 'v27',  word: 'かぐ',  romaji: 'Kagu',      meaning: 'Mobile',           category: 'Random', tone: 'Neutro', personalNote: '', score: 0, attempts: 0 },
  { id: 'v28',  word: 'かげ',  romaji: 'Kage',      meaning: 'Ombra',            category: 'Random', tone: 'Neutro', personalNote: '', score: 0, attempts: 0 },
  { id: 'v29',  word: 'ごご',  romaji: 'Gogo',      meaning: 'Pomeriggio',       category: 'Random', tone: 'Neutro', personalNote: '', score: 0, attempts: 0 },
  { id: 'v30',  word: 'がいこく', romaji: 'Gaikoku', meaning: 'Paese straniero', category: 'Random', tone: 'Neutro', personalNote: '', score: 0, attempts: 0 },
  { id: 'v31',  word: 'あご',  romaji: 'Ago',       meaning: 'Mento',            category: 'Random', tone: 'Neutro', personalNote: '', score: 0, attempts: 0 },
  { id: 'v32',  word: 'いがく', romaji: 'Igaku',    meaning: 'Medicina (facoltà)', category: 'Random', tone: 'Neutro', personalNote: '', score: 0, attempts: 0 },
]

// Mappa romaji → kana (lookup per il quiz romaji→kana)
export const ROMAJI_TO_KANA = Object.fromEntries(
  HIRAGANA_GRID.flat().filter(Boolean).map(x => [x.r.toLowerCase(), x.c])
)

// --- PINIA STORE ---
export const useAppStore = defineStore('app', () => {
  // Dati persistenti
  const kanaData = ref(INITIAL_KANA.map(k => ({ ...k })))
  const vocabData = ref(INITIAL_VOCAB.map(v => ({ ...v })))
  const dailyStats = ref({})

  /** Normalize a day entry to { total, correct, kana: { total, correct }, vocab: { total, correct } }. Legacy entries have only total/correct → treat as kana. */
  function _normalizeDayStats(day) {
    if (!day || typeof day !== 'object') return { total: 0, correct: 0, kana: { total: 0, correct: 0 }, vocab: { total: 0, correct: 0 } }
    const total = day.total ?? 0
    const correct = day.correct ?? 0
    const kana = day.kana && typeof day.kana === 'object'
      ? { total: day.kana.total ?? 0, correct: day.kana.correct ?? 0 }
      : { total, correct }
    const vocab = day.vocab && typeof day.vocab === 'object'
      ? { total: day.vocab.total ?? 0, correct: day.vocab.correct ?? 0 }
      : { total: 0, correct: 0 }
    return { total, correct, kana, vocab }
  }
  const kanaPresets = ref([])
  const user = ref(null)
  const isCloudLoaded = ref(false)

  // --- Selezione profilo utente ---
  const _rawProfile = localStorage.getItem('hiragana_profile')
  const currentProfile = ref(_rawProfile ? _rawProfile.toLowerCase() : null)
  const profileSelectOpen = ref(!currentProfile.value)
  const isSyncing = ref(false)
  const saveSuccess = ref(false)
  const saveErrorModal = ref(null)

  // Stato UI
  const selectedKanaModal = ref(null)
  const selectedVocabModal = ref(null)
  const customAlert = ref(null)
  const confirmModal = ref(null)
  const hideGridRomaji = ref(true)
  const statsTimeRange = ref('settimana')

  // Stato quiz
  const quizActive = ref(false)
  const showSaveProgressAfterQuiz = ref(false)
  const quizSetupModalOpen = ref(false)
  const vocabSetupModalOpen = ref(false)
  const difficultyModalOpen = ref(false)
  const selectedKanaIds = ref([])
  const newPresetName = ref('')
  const quizPendingItems = ref([])
  const selectedVocabCategories = ref([])
  const quizDifficulty = ref('medio')
  const quizDirection = ref('ja-to-romaji')
  const quizQueue = ref([])
  const currentQuestionIndex = ref(0)
  const quizType = ref('kana')
  const options = ref([])
  const selectedOption = ref(null)
  const isAnswered = ref(false)
  const quizResults = ref({ correct: 0, total: 0 })
  const manualInput = ref('')

  const vocabWriteMistakes = ref(0)

  // --- Nuovo: quiz vocab scrittura romaji→kana (vocab-romaji-input) ---
  // Ogni blocco = { romaji: 'ka', kana: 'か', userInput: '', state: 'idle'|'ok'|'wrong' }
  const vocabRomajiBlocks = ref([])
  const vocabRomajiCurrentIdx = ref(0)
  const vocabRomajiBlockInput = ref('')

  // --- Feedback risposta (modale inline post-risposta) ---
  // null | { ok, userAnswer, correctAnswer, itemLabel }
  const answerFeedback = ref(null)

  // --- AZIONI ---

  // Cache delle voci caricate
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
      vocabData: vocabData.value.map(v => ({ ...v })),
      dailyStats: { ...dailyStats.value },
      kanaPresets: kanaPresets.value.map(p => ({ ...p })),
      _savedAt: new Date().toISOString(),
      _profile: currentProfile.value,
    }
  }

  // Persistence: BE only (no localStorage for kana/vocab/stats). All mutations sync directly to Firestore via REST.
  // Sync automatico: debounce 300ms, usato solo durante quiz per non saturare il BE; azioni utente usano saveNow().
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

  // Caricamento via REST API (fallback quando onSnapshot non riceve dati, es. incognito)
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

  // Salvataggio via REST API (bypass SDK che si blocca su setDoc)
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
        // Documento non esiste: crea con POST
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

  // Garantisce che l'utente Firebase sia autenticato; riprova signIn se necessario
  async function _ensureAuth() {
    if (auth.currentUser) return auth.currentUser
    return new Promise((resolve) => {
      // Aspetta fino a 4s che onAuthStateChanged emetta l'utente
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

  // Salvataggio manuale (bottone): usa REST API
  async function saveNow() {
    if (!currentProfile.value || isSyncing.value) return
    if (_syncTimer) { clearTimeout(_syncTimer); _syncTimer = null }
    // Capture payload immediately so onSnapshot / other async cannot overwrite state before we send
    const payload = _buildPayload()
    const clean = JSON.parse(JSON.stringify(payload))
    isSyncing.value = true
    saveSuccess.value = false
    saveErrorModal.value = null
    const t0 = Date.now()
    try {
      const u = await _ensureAuth()
      if (!u) throw new Error('no-auth')

      _lastSyncAt = Date.now()
      await _saveViaRestApi(clean)
      saveSuccess.value = true
      setTimeout(() => { saveSuccess.value = false }, 2500)
    } catch (err) {
      console.error('❌ saveNow:', err.message)
      const msg = err.message || String(err)
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
    } finally {
      isSyncing.value = false
    }
  }

  function endQuiz(askToSave = false) {
    if (askToSave) {
      showSaveProgressAfterQuiz.value = true
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
    const pool = quizType.value === 'vocab'
      ? quizPendingItems.value
      : quizPendingItems.value
    const wr = pool
      .filter(i => i.id !== cur.id)
      .sort(() => 0.5 - Math.random())
      .slice(0, num - 1)
    options.value = [cur, ...wr].sort(() => 0.5 - Math.random())
    selectedOption.value = null
    isAnswered.value = false
  }

  // Quiz vocab-kana-read: mostra ogni kana della parola, l'utente scrive il romaji
  // Blocco = { kana: 'わ', romaji: 'wa', userInput: '', state: 'idle'|'ok'|'wrong' }
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

  // Compatibilità: alias vecchio nome
  function initVocabRomajiInput(item) { initVocabKanaRead(item) }

  // Conferma blocco: l'utente ha letto il kana corrente e scritto il romaji
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
      // Fine parola
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
    if (ok) quizResults.value = { ...quizResults.value, correct: quizResults.value.correct + 1 }
    speakText(
      quizType.value === 'kana'
        ? item.character
        : item.word
    )

    const todayStr = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
      .toISOString().split('T')[0]
    const cur = _normalizeDayStats(dailyStats.value[todayStr])
    const isKanaQuiz = quizType.value === 'kana'
    const nextDay = {
      ...cur,
      total: cur.total + 1,
      correct: cur.correct + (ok ? 1 : 0),
      kana: isKanaQuiz
        ? { total: cur.kana.total + 1, correct: cur.kana.correct + (ok ? 1 : 0) }
        : cur.kana,
      vocab: !isKanaQuiz
        ? { total: cur.vocab.total + 1, correct: cur.vocab.correct + (ok ? 1 : 0) }
        : cur.vocab,
    }
    dailyStats.value = {
      ...dailyStats.value,
      [todayStr]: nextDay,
    }

    const upd = (data) =>
      data.map((x) => {
        if (x.id === item.id) {
          const ns = ok ? Math.min(100, x.score + 25) : Math.max(0, x.score - 20)
          return { ...x, score: ns, attempts: x.attempts + 1 }
        }
        return x
      })

    if (quizType.value === 'kana') {
      kanaData.value = upd(kanaData.value)
    } else {
      vocabData.value = upd(vocabData.value)
    }

    // Unica chiamata sync che salva tutto
    sync()

    // Determina le label per il feedback
    const isKana = quizType.value === 'kana'
    const isVocabKanaToRomaji = quizType.value === 'vocab-kana-to-romaji'
    let correctAnswer = ''
    if (quizType.value === 'kana') {
      correctAnswer = quizDirection.value === 'ja-to-romaji' ? item.romaji : item.character
    } else if (quizType.value === 'vocab') {
      correctAnswer = quizDirection.value === 'ja-to-romaji' ? item.meaning : item.word
    } else if (quizType.value === 'vocab-romaji' || quizType.value === 'vocab-kana-to-romaji') {
      correctAnswer = item.romaji.split('/')[0]
    } else {
      correctAnswer = isKana ? item.romaji : item.meaning
    }

    if (!skipFeedback) {
      if (ok && !isVocabKanaToRomaji) {
        // Corretto: nessun overlay, avanza subito dopo breve pausa (tranne vocab-kana-to-romaji)
        setTimeout(() => { _advanceQuiz() }, 600)
      } else if (!ok || isVocabKanaToRomaji) {
        // Sbagliato: modale con spiegazione; oppure vocab-kana-to-romaji: sempre modale (anche se corretto)
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
      // Canvas quiz: avanza direttamente
      setTimeout(() => { _advanceQuiz() }, 400)
    }
  }

  function advanceAfterFeedback() {
    _advanceQuiz()
  }

  function handleManualSubmit() {
    if (!isAnswered.value && manualInput.value.trim()) {
      isAnswered.value = true
      const item = quizQueue.value[currentQuestionIndex.value]
      const userText = manualInput.value.trim()
      let correctText
      if (quizType.value === 'kana') {
        correctText = quizDirection.value === 'ja-to-romaji'
          ? item.romaji.split('/')[0].trim().toLowerCase()
          : item.character.trim()
      } else if (quizType.value === 'vocab') {
        correctText = quizDirection.value === 'ja-to-romaji'
          ? item.meaning.trim().toLowerCase()
          : item.word.split('/')[0].trim()
      } else if (quizType.value === 'vocab-romaji' || quizType.value === 'vocab-kana-to-romaji') {
        correctText = normalizeRomajiForCompare(item.romaji.split('/')[0].trim())
      } else {
        correctText = item.romaji.split('/')[0].trim().toLowerCase()
      }
      const normalizedUser = (quizType.value === 'vocab-kana-to-romaji' || quizType.value === 'vocab-romaji')
        ? normalizeRomajiForCompare(userText)
        : userText.toLowerCase()
      const ok = normalizedUser === correctText
      processAnswer(ok, item, userText)
    }
  }

  // Normalize romaji for comparison (macrons → single vowel, lowercase)
  function normalizeRomajiForCompare(str) {
    return str
      .toLowerCase()
      .replace(/ō/g, 'o')
      .replace(/ū/g, 'u')
      .replace(/ē/g, 'e')
      .replace(/ā/g, 'a')
      .replace(/ī/g, 'i')
      .replace(/\s+/g, ' ')
      .trim()
  }

  function handleAnswer(option) {
    if (!isAnswered.value) {
      selectedOption.value = option
      isAnswered.value = true
      const item = quizQueue.value[currentQuestionIndex.value]
      const ok = option.id === item.id
      // La "risposta utente" è il testo dell'opzione scelta (se sbagliata)
      const userText = ok ? '' : getOptionLabel_internal(option)
      processAnswer(ok, item, userText)
    }
  }

  // Utility interna per ricavare il label di un'opzione
  function getOptionLabel_internal(opt) {
    if (quizType.value === 'vocab-romaji') return opt.romaji.split('/')[0]
    if (quizDirection.value === 'ja-to-romaji')
      return quizType.value === 'kana' ? opt.romaji : opt.meaning
    return quizType.value === 'kana' ? opt.character : opt.word.split('/')[0]
  }

  function handleStartQuizClick(type, forced = null) {
    quizType.value = type
    if (forced) {
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
      newPresetName.value = ''
      quizSetupModalOpen.value = true
    } else if (type === 'vocab-kana-to-romaji') {
      const randomWords = vocabData.value.filter(v => v.category === 'Random')
      if (randomWords.length < 1) {
        customAlert.value = '🌸 Aggiungi almeno una parola nella categoria Random!'
        return
      }
      quizPendingItems.value = randomWords
      difficultyModalOpen.value = true
    } else {
      // Quiz vocabolario: apri la modal selezione categorie
      const allCats = [...new Set(vocabData.value.map(v => v.category))]
      selectedVocabCategories.value = [...allCats] // tutte selezionate di default
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
    vocabSetupModalOpen.value = false
    difficultyModalOpen.value = true
  }

  function proceedFromSetup() {
    if (selectedKanaIds.value.length < 4) {
      customAlert.value = 'Seleziona almeno 4 Kana!'
      return
    }
    const selectedItems = kanaData.value.filter(k => selectedKanaIds.value.includes(k.id))
    quizPendingItems.value = selectedItems
    quizSetupModalOpen.value = false
    difficultyModalOpen.value = true
  }

  function startQuizFinal(diff) {
    quizDifficulty.value = diff
    difficultyModalOpen.value = false
    const shuffled = [...quizPendingItems.value].sort(() => 0.5 - Math.random())
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

  // Genera le opzioni per vocab-romaji (le opzioni sono i romaji delle parole)
  function _genVocabRomajiOptions(cur) {
    if (quizDifficulty.value === 'difficile') {
      isAnswered.value = false
      return
    }
    const num = quizDifficulty.value === 'facile' ? 3 : 4
    const wrong = quizPendingItems.value
      .filter(i => i.id !== cur.id)
      .sort(() => 0.5 - Math.random())
      .slice(0, num - 1)
    options.value = [cur, ...wrong].sort(() => 0.5 - Math.random())
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

  function resetVocabScore(id) {
    vocabData.value = vocabData.value.map(v => v.id === id ? { ...v, score: 0, attempts: 0 } : v)
    saveNow().catch(() => {})
  }

  function deleteVocabWord(id) {
    vocabData.value = vocabData.value.filter(v => v.id !== id)
    selectedVocabModal.value = null
    saveNow().catch(() => {})
  }

  function addVocabWord(payload) {
    const romaji = payload.romaji?.trim() || ''
    const word = payload.word?.trim() || (romaji ? toHiragana(romaji) : '')
    const newWord = {
      id: 'v' + Date.now(),
      word,
      romaji,
      meaning: payload.meaning?.trim() || '',
      category: payload.category?.trim() || 'Random',
      tone: payload.tone || 'Neutro',
      personalNote: payload.personalNote?.trim() || '',
      score: 0,
      attempts: 0,
    }
    vocabData.value = [...vocabData.value, newWord]
    saveNow().catch(() => {})
  }
  let _unsubSnapshot = null

  // Merge: unisce i dati del cloud con l'array base locale
  // - keepAllInit true (kana): tutti gli item di init restano, il cloud sovrascrive dove presente
  // - keepAllInit false (vocab): solo gli item di init presenti nel cloud (le parole cancellate non riappaiono)
  // - Aggiunge sempre gli item solo nel cloud (es. parole aggiunte dall'utente)
  function _mergeFunc(initArr, cloud, keepAllInit = false) {
    if (!cloud || !Array.isArray(cloud) || cloud.length === 0) return initArr.map(i => ({ ...i }))
    const cloudMap = new Map(cloud.map(i => [i.id, i]))
    const initIds = new Set(initArr.map(i => i.id))
    const mergedFromInit = keepAllInit
      ? initArr.map((base) => ({ ...base, ...cloudMap.get(base.id) }))
      : initArr
          .filter((base) => cloudMap.has(base.id))
          .map((base) => ({ ...base, ...cloudMap.get(base.id) }))
    const cloudOnly = cloud.filter((c) => !initIds.has(c.id))
    return [...mergedFromInit, ...cloudOnly]
  }

  function _applyData(d) {
    // Supporta formato compatto REST (data = json string) e formato legacy (campi in chiaro)
    let raw = d
    if (typeof d?.data === 'string') {
      try { raw = JSON.parse(d.data) } catch (_) { raw = d }
    }
    kanaData.value = _mergeFunc(INITIAL_KANA, raw.kanaData, true)
    vocabData.value = _mergeFunc(INITIAL_VOCAB, raw.vocabData)
    if (raw.dailyStats && typeof raw.dailyStats === 'object') {
      const normalized = {}
      for (const [date, day] of Object.entries(raw.dailyStats)) {
        normalized[date] = _normalizeDayStats(day)
      }
      dailyStats.value = normalized
    }
    if (Array.isArray(raw.kanaPresets)) kanaPresets.value = raw.kanaPresets.map(p => ({ ...p }))
  }

  async function _loadProfileData() {
    if (!db || !currentProfile.value) { isCloudLoaded.value = true; return }
    if (_unsubSnapshot) { _unsubSnapshot(); _unsubSnapshot = null }

    const docRef = _profileDocRef()
    isCloudLoaded.value = false

    // onSnapshot + fallback REST API ───────────────────────────────────────────
    // In incognito onSnapshot può non ricevere dati; REST API GET funziona con fetch.
    let _firstSnapDone = false
    let _dataLoaded = false

    function _applyIfNeeded(d) {
      if (_dataLoaded) return
      _dataLoaded = true
      const payload = typeof d?.data === 'string' ? JSON.parse(d.data) : d
      _applyData(payload)
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
        _applyData(d)
        console.log('🔄 onSnapshot: aggiornamento')
      }
    }, (err) => {
      console.error('❌ onSnapshot error:', err.code)
      if (!isCloudLoaded.value) isCloudLoaded.value = true
    })

    // Fallback REST: carica via fetch (funziona in incognito dove onSnapshot fallisce)
    _loadViaRestApi().then((data) => {
      if (data) {
        _applyIfNeeded(data)
        console.log('✅ REST API caricato dal cloud')
      }
    })

    // Timeout: dopo 5s sblocca comunque
    setTimeout(() => {
      if (!isCloudLoaded.value) isCloudLoaded.value = true
    }, 5000)
  }

  async function _tryMigrateFromCapital(docRef) {
    try {
      const profileCapital = (currentProfile.value || '').replace(/^\w/, c => c.toUpperCase())
      // Percorso con maiuscola (es. Andrea) – _profileDocRef fa toLowerCase quindi usiamo doc() diretto
      const oldRef = doc(db, 'artifacts', appId, 'profiles', profileCapital, 'appState', 'main')
      console.log('🔄 Provo migrazione da vecchio doc:', oldRef.path)
      const oldSnap = await getDoc(oldRef)
      if (oldSnap.exists()) {
        const d = oldSnap.data()
        const payload = typeof d.data === 'string' ? JSON.parse(d.data) : { kanaData: d.kanaData, vocabData: d.vocabData, dailyStats: d.dailyStats, kanaPresets: d.kanaPresets }
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
    currentProfile.value = normalized
    localStorage.setItem('hiragana_profile', normalized)
    profileSelectOpen.value = false
    // Resetta ai valori iniziali (la cache locale verrà caricata subito dentro _loadProfileData)
    kanaData.value = INITIAL_KANA.map(k => ({ ...k }))
    vocabData.value = INITIAL_VOCAB.map(v => ({ ...v }))
    dailyStats.value = {}
    kanaPresets.value = []
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

    // Auth Firebase → poi carica/aggiorna da Firestore
    onAuthStateChanged(auth, (user) => {
      if (user) {
        if (currentProfile.value) {
          _loadProfileData()
        }
      } else {
        signInAnonymously(auth).catch((err) => {
          console.error('❌ signInAnonymously failed:', err)
          // Se auth fallisce e non c'è cache, sblocca comunque la UI
          if (!isCloudLoaded.value) isCloudLoaded.value = true
        })
      }
    })

    // Timeout di sicurezza: dopo 6s sblocca comunque per evitare spinner infinito
    setTimeout(() => {
      if (!isCloudLoaded.value) isCloudLoaded.value = true
    }, 6000)
  }

  return {
    kanaData, vocabData, dailyStats, kanaPresets, user, isCloudLoaded,
    currentProfile, profileSelectOpen, isSyncing, saveSuccess, saveErrorModal,
    selectedKanaModal, selectedVocabModal, customAlert, confirmModal,
    hideGridRomaji, statsTimeRange,
    quizActive, showSaveProgressAfterQuiz, quizSetupModalOpen, vocabSetupModalOpen, difficultyModalOpen,
    selectedKanaIds, newPresetName, quizPendingItems,
    selectedVocabCategories,
    quizDifficulty, quizDirection, quizQueue, currentQuestionIndex,
    quizType, options, selectedOption, isAnswered, quizResults, manualInput,
    vocabRomajiBlocks, vocabRomajiCurrentIdx, vocabRomajiBlockInput,
    answerFeedback,
    speakText, sync, saveNow, endQuiz, closeQuizAndOptionalSave, genOptions, initVocabKanaRead, initVocabRomajiInput,
    processAnswer,
    confirmRomajiBlock,
    handleManualSubmit, handleAnswer,
    advanceAfterFeedback,
    handleStartQuizClick, proceedFromSetup, proceedFromVocabSetup, startQuizFinal,
    updateVocabNoteLocal,
    resetKanaScore, resetVocabScore, deleteVocabWord, addVocabWord,
    selectProfile, switchProfile,
    init,
  }
})
