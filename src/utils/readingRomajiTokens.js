import hiraganaGrid from '../data/hiragana-grid.json' with { type: 'json' }

/**
 * Hepburn-style romaji normalization for reading-text compare.
 * Avoids global sei→see (breaks seikai) and global ou→oo (breaks nou / inou).
 * Macrons, ei at word end (えい), ou clusters not preceded by n (とう, きょう, …).
 */
export const normalizeRomajiForCompare = (str) => {
  let s = String(str)
    .toLowerCase()
    .replace(/ā/g, 'aa')
    .replace(/ī/g, 'ii')
    .replace(/ū/g, 'uu')
    .replace(/ē/g, 'ee')
    .replace(/ō/g, 'oo')
    .replace(/\s+/g, ' ')
    .trim()
  s = s.replace(/([^n])ou/g, '$1oo')
  s = s.replace(/^ou/g, 'oo')
  s = s.replace(/ei$/g, 'ee')
  return s
}

/**
 * User input: same long-vowel rules as compare + particle variants.
 */
export const normalizeReadingRomaji = (str) => {
  let s = normalizeRomajiForCompare(str)
  s = s.replace(/\bwo\b/g, 'o')
  s = s.replace(/\bhe\b/g, 'e')
  s = s.replace(/\bha\b/g, 'wa')
  return s
}

/** Strip to a-z only for mora equality (reading texts). */
export const compactReadingKey = (str) =>
  normalizeReadingRomaji(str).replace(/[^a-z]/g, '')

export const compactCompareKey = (str) => {
  let s = normalizeRomajiForCompare(str)
  s = s.replace(/\bwo\b/g, 'o')
  s = s.replace(/\bhe\b/g, 'e')
  s = s.replace(/\bha\b/g, 'wa')
  return s.replace(/[^a-z]/g, '')
}

/** Full reference line (Crunchy) compact match in build script. */
export const compactRomajiKey = (str) =>
  normalizeReadingRomaji(str).replace(/[^a-z]/g, '')

const _cells = hiraganaGrid.flat().filter(Boolean).sort((a, b) => b.c.length - a.c.length)

function geminateRomaji(nextRomaji) {
  const r = nextRomaji.toLowerCase()
  if (r.startsWith('chi')) return `t${r}`
  if (r.startsWith('shi')) return `s${r}`
  if (r.startsWith('tsu')) return `t${r}`
  const c = r[0]
  if (!c || /[aeiou]/.test(c)) return r
  return `${c}${r}`
}

/**
 * Tokenize hiragana into display units; each kana token has { graph, romaji, statChar }.
 * statChar is the kana used for mastery lookup (same as graph except っ has statChar null).
 * は uses romajiCandidates ['ha','wa'] until resolved.
 */
export function tokenizeHiraganaRaw(hiragana) {
  const s = String(hiragana)
    .replace(/\s+/g, '')
    .replace(/,/g, '、')
    .replace(/\./g, '。')
  const tokens = []
  let i = 0
  while (i < s.length) {
    const ch = s[i]
    if (/[、。．！？「」『』]/.test(ch)) {
      tokens.push({ type: 'punct', graph: ch, romaji: null, statChar: null })
      i += 1
      continue
    }
    if (ch === 'っ' && i + 1 < s.length) {
      let matched = null
      for (const cell of _cells) {
        if (s.startsWith(cell.c, i + 1)) {
          matched = cell
          break
        }
      }
      if (matched) {
        const gRom = geminateRomaji(matched.r)
        tokens.push({
          type: 'kana',
          graph: 'っ',
          romaji: '',
          romajiCandidates: [],
          statChar: null,
          isGeminatePrefix: true,
        })
        tokens.push({
          type: 'kana',
          graph: matched.c,
          romaji: gRom,
          romajiCandidates: [gRom],
          statChar: matched.c,
          afterGeminate: true,
        })
        i += 1 + matched.c.length
        continue
      }
    }
    let matched = null
    for (const cell of _cells) {
      if (s.startsWith(cell.c, i)) {
        matched = cell
        break
      }
    }
    if (!matched) {
      tokens.push({ type: 'unknown', graph: ch, romaji: '?', statChar: null })
      i += 1
      continue
    }
    let romaji = matched.r
    let candidates = [romaji]
    if (matched.c === 'を') {
      romaji = 'o'
      candidates = ['o']
    } else if (matched.c === 'へ') {
      const after = s.slice(i + matched.c.length)
      const particleE = !(after.startsWith('や') || after.startsWith('ん'))
      romaji = particleE ? 'e' : 'he'
      candidates = [romaji]
    } else if (matched.c === 'は') {
      candidates = ['ha', 'wa']
      romaji = 'ha'
    }
    tokens.push({
      type: 'kana',
      graph: matched.c,
      romaji,
      romajiCandidates: candidates,
      statChar: matched.c,
    })
    i += matched.c.length
  }
  return tokens
}

/**
 * Resolve は readings to match compactRomajiKey target.
 */
export function resolveHaTokens(tokens, targetCompact) {
  const haIndices = tokens
    .map((t, idx) => (t.type === 'kana' && t.graph === 'は' ? idx : -1))
    .filter((idx) => idx >= 0)
  const n = haIndices.length
  if (n === 0) {
    return tokens.map((t) => finalizeToken(t))
  }
  for (let mask = 0; mask < 1 << n; mask += 1) {
    const trial = tokens.map((t, idx) => {
      if (t.type !== 'kana' || t.graph !== 'は') return t
      const bit = haIndices.indexOf(idx)
      const useWa = (mask >> bit) & 1
      return {
        ...t,
        romaji: useWa ? 'wa' : 'ha',
        romajiCandidates: [useWa ? 'wa' : 'ha'],
      }
    })
    const compact = buildCompactFromResolved(trial)
    if (compact === targetCompact) {
      return trial.map((t) => finalizeToken(t))
    }
  }
  return tokens.map((t) => finalizeToken(t))
}

function buildCompactFromResolved(tokens) {
  const parts = []
  for (const t of tokens) {
    if (t.type === 'punct') continue
    if (t.type !== 'kana') continue
    if (t.isGeminatePrefix) continue
    parts.push(t.romaji || '')
  }
  return compactReadingKey(parts.join(''))
}

function finalizeToken(t) {
  if (t.type !== 'kana') return t
  const romaji = t.romaji || (t.romajiCandidates && t.romajiCandidates[0]) || ''
  return {
    type: 'kana',
    graph: t.graph,
    romaji,
    statChar: t.statChar,
    isGeminatePrefix: t.isGeminatePrefix,
  }
}

/**
 * Public tokens for JSON + UI: { punct?, graph, romaji? }
 */
export function tokensForJson(tokens) {
  return tokens.map((t) => {
    if (t.type === 'punct') return { punct: true, graph: t.graph }
    if (t.type === 'kana' && t.isGeminatePrefix) return { graph: t.graph, romaji: '', geminate: true }
    if (t.type === 'kana') return { graph: t.graph, romaji: t.romaji }
    return { graph: t.graph, romaji: t.romaji || '' }
  })
}

/** Kana-only tokens (for stats + romaji compare sequence). */
export function kanaRomajiSequence(tokens) {
  const out = []
  for (const t of tokens) {
    if (t.type !== 'kana') continue
    if (t.isGeminatePrefix) continue
    out.push({ graph: t.graph, romaji: t.romaji, statChar: t.statChar })
  }
  return out
}

/**
 * Morae with っ merged into the following kana (display + word alignment).
 */
export function moraeMergedFromResolved(resolved) {
  const out = []
  for (let i = 0; i < resolved.length; i += 1) {
    const t = resolved[i]
    if (t.type === 'punct' || t.type === 'unknown') continue
    if (t.type === 'kana' && t.isGeminatePrefix) {
      const n = resolved[i + 1]
      if (n && n.type === 'kana' && !n.isGeminatePrefix) {
        out.push({
          graph: t.graph + n.graph,
          romaji: n.romaji,
          statChar: n.statChar,
        })
        i += 1
      }
      continue
    }
    if (t.type === 'kana') {
      out.push({ graph: t.graph, romaji: t.romaji, statChar: t.statChar })
    }
  }
  return out
}

/**
 * Split reference romaji into words (space-separated, as on Crunchy Nihongo).
 */
export function splitRomajiReferenceWords(romajiLine) {
  return String(romajiLine)
    .trim()
    .split(/\s+/)
    .map((x) => x.trim())
    .filter(Boolean)
}

/**
 * Align romaji words to merged morae; fill hiragana per word from resolved token order.
 */
export function buildWordSegmentsFromResolved(resolved, romajiLine) {
  const morae = moraeMergedFromResolved(resolved)
  const parts = splitRomajiReferenceWords(romajiLine)
  const segments = []
  let mi = 0
  for (const w of parts) {
    const tw = compactReadingKey(w)
    if (!tw) continue
    const start = mi
    let acc = ''
    while (mi < morae.length) {
      acc += morae[mi].romaji
      mi += 1
      if (compactReadingKey(acc) === tw) break
    }
    segments.push({
      romaji: w,
      moraStart: start,
      moraEnd: mi,
      hiragana: '',
    })
  }
  let si = 0
  let mc = 0
  for (const t of resolved) {
    if (t.type === 'punct' || t.type === 'unknown') {
      if (!segments.length) continue
      let idx = si
      if (idx >= segments.length) idx = segments.length - 1
      segments[idx].hiragana += t.graph
      continue
    }
    if (t.type === 'kana' && t.isGeminatePrefix) {
      if (segments[si]) segments[si].hiragana += t.graph
      continue
    }
    if (t.type === 'kana') {
      if (si < segments.length && mc === segments[si].moraEnd) si += 1
      if (segments[si]) segments[si].hiragana += t.graph
      mc += 1
    }
  }
  return segments
}

export function parseUserRomajiWords(input) {
  return String(input)
    .trim()
    .split(/\s+/)
    .map((x) =>
      x
        .trim()
        .replace(/^[,，.。!！?？「」『』]+|[,，。.!！?？「」『』]+$/g, ''),
    )
    .filter(Boolean)
    .map((x) => normalizeReadingRomaji(x))
}

const expectedWordFromKana = (word, kanaSequence) =>
  kanaSequence
    .slice(word.moraStart, word.moraEnd)
    .map((k) => k.romaji || '')
    .join('')

export function compareReadingWords(userWords, wordSegments, kanaSequence = null) {
  const n = wordSegments.length
  const m = userWords.length
  const wordOk = []
  for (let j = 0; j < n; j += 1) {
    const expectedRaw = kanaSequence?.length
      ? expectedWordFromKana(wordSegments[j], kanaSequence)
      : wordSegments[j].romaji
    const eu = compactCompareKey(expectedRaw)
    const uu = j < m ? compactCompareKey(userWords[j]) : ''
    wordOk.push(j < m && eu === uu)
  }
  return {
    wordOk,
    aligned: n === m && wordOk.every(Boolean),
  }
}

/**
 * Word-mode fine grading: return one boolean per kana/mora.
 * It compares each completed user word against expected mora slices, so a typo
 * penalizes only the affected kana instead of the full word block.
 */
export function compareReadingWordsPerKana(userWords, wordSegments, kanaSequence) {
  const kanaOk = []
  for (let j = 0; j < wordSegments.length; j += 1) {
    const seg = wordSegments[j]
    const morae = kanaSequence.slice(seg.moraStart, seg.moraEnd)
    const rawParts = morae.map((m) => m.romaji || '')
    const fullExp = rawParts.join('')
    const expCanon = compactCompareKey(fullExp)
    const userCanon = j < userWords.length ? compactCompareKey(userWords[j]) : ''
    if (!morae.length) continue
    if (!userCanon) {
      for (let k = 0; k < morae.length; k += 1) kanaOk.push(false)
      continue
    }
    if (expCanon === userCanon) {
      for (let k = 0; k < morae.length; k += 1) kanaOk.push(true)
      continue
    }
    const bounds = [0]
    for (let i = 0; i < rawParts.length; i += 1) {
      bounds.push(compactCompareKey(rawParts.slice(0, i + 1).join('')).length)
    }
    if (expCanon.length !== userCanon.length) {
      for (let k = 0; k < morae.length; k += 1) kanaOk.push(false)
      continue
    }
    for (let i = 0; i < morae.length; i += 1) {
      const segE = expCanon.slice(bounds[i], bounds[i + 1])
      const segU = userCanon.slice(bounds[i], bounds[i + 1])
      kanaOk.push(segE === segU)
    }
  }
  return { kanaOk }
}

export function compareReadingTokenProgress(userTokens, expectedSequence) {
  const n = expectedSequence.length
  const m = userTokens.length
  const kanaState = []
  for (let j = 0; j < n; j += 1) {
    if (j >= m) {
      kanaState.push(null)
      continue
    }
    const eu = compactCompareKey(expectedSequence[j].romaji)
    const uu = compactCompareKey(userTokens[j])
    if (!uu) {
      kanaState.push(null)
      continue
    }
    kanaState.push(eu.startsWith(uu))
  }
  return { kanaState }
}

export function compareReadingWordProgress(rawInput, wordSegments, kanaSequence = null) {
  const input = String(rawInput || '')
  const userWords = parseUserRomajiWords(input)
  const hasTrailingSpace = /\s$/.test(input)
  const completedCount = hasTrailingSpace
    ? userWords.length
    : Math.max(0, userWords.length - 1)
  const n = wordSegments.length
  const wordState = []
  for (let j = 0; j < n; j += 1) {
    if (j >= completedCount) {
      wordState.push(null)
      continue
    }
    const expectedRaw = kanaSequence?.length
      ? expectedWordFromKana(wordSegments[j], kanaSequence)
      : wordSegments[j].romaji
    const eu = compactCompareKey(expectedRaw)
    const uu = compactCompareKey(userWords[j])
    if (!uu) {
      wordState.push(null)
      continue
    }
    // Word mode: evaluate only completed words and require full-word equality.
    wordState.push(eu === uu)
  }
  return { wordState }
}

export function expandWordOkToKanaOk(wordSegments, wordOk) {
  const kanaOk = []
  for (let j = 0; j < wordSegments.length; j += 1) {
    const ok = !!wordOk[j]
    const n = wordSegments[j].moraEnd - wordSegments[j].moraStart
    for (let k = 0; k < n; k += 1) kanaOk.push(ok)
  }
  return kanaOk
}

/**
 * From persisted JSON tokens: morae the user types (skip punctuation and bare っ).
 */
export function kanaSequenceForQuiz(storedTokens) {
  const out = []
  for (const t of storedTokens) {
    if (t.punct) continue
    const r = t.romaji
    if (r === '' || r == null) continue
    out.push({
      graph: t.graph,
      romaji: r,
      statChar: t.graph,
    })
  }
  return out
}

/**
 * Parse user input: split on whitespace, filter empty, normalize each token.
 */
export const parseUserRomajiTokens = (input) =>
  String(input)
    .trim()
    .split(/\s+/)
    .map((x) =>
      x
        .trim()
        .replace(/^[,，.。]+|[,，。.]+$/g, ''),
    )
    .filter(Boolean)
    .map((x) => normalizeReadingRomaji(x))

/**
 * Compare user token array to expected sequence (one user token per kana mora, space-separated).
 */
export function compareReadingTokens(userTokens, expectedSequence) {
  const expected = expectedSequence.map((x) => normalizeReadingRomaji(x.romaji))
  const n = expected.length
  const m = userTokens.length
  const kanaOk = []
  for (let j = 0; j < n; j += 1) {
    const eu = compactCompareKey(expectedSequence[j].romaji)
    const uu = j < m ? compactCompareKey(userTokens[j]) : ''
    kanaOk.push(j < m && eu === uu)
  }
  const aligned = n === m && kanaOk.every(Boolean)
  return { kanaOk, aligned, expectedRomaji: expected }
}
