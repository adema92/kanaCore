/**
 * One-off builder: parses scripts/kaguya-page.txt → src/data/kaguya-hiragana-reading.json
 * Run: node scripts/build-kaguya-json.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  tokenizeHiraganaRaw,
  resolveHaTokens,
  tokensForJson,
  kanaRomajiSequence,
  compactRomajiKey,
  buildWordSegmentsFromResolved,
  moraeMergedFromResolved,
  compactReadingKey,
  splitRomajiReferenceWords,
} from '../src/utils/readingRomajiTokens.js'
import { ITALIAN_BY_NUM } from './kaguya-italian.mjs'
import { lookupWordIt } from './kaguya-word-it-lookup.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pagePath = path.join(__dirname, 'kaguya-page.txt')
const outPath = path.join(__dirname, '../src/data/kaguya-hiragana-reading.json')

/** Hiragana fixes (source typos vs standard reading). */
const HIRAGANA_FIXES = [
  [/おはあさん/g, 'おばあさん'],
  [/てんによ/g, 'てんにん'],
]

/** Romaji line fixes vs tokenizer output (page quirks). */
const ROMAJI_LINE_FIXES = [
  [/^man tsuki /i, 'mangetsu '],
  [/\bman tsuki\b/gi, 'mangetsu'],
  [/\btaachi\b/gi, 'tachi'],
  [/\btaoremashit\b/gi, 'taoremashita'],
]

/** Hiragana is source of truth; align reference romaji when the page line omits kana or mismatches. */
const ROMAJI_PAGE_FIXES_BY_NUM = {
  47: (s) => s.replace(/\bkuramochi wa\b/i, 'kuramochi no miko wa'),
  84: (s) => s.replace(/\byonen me haru\b/i, 'yonen me no haru'),
  86: (s) => s.replace(/\bshinpai koto\b/i, 'shinpai goto'),
  98: (s) => s.replace(/\bkanashitekute\b/i, 'kanashikute'),
  113: (s) => s.replace(/\bsodatte\b/i, 'sodatete'),
}

function stripRomajiQuotes(line) {
  return line.replace(/^["「『]|["」』]$/g, '').trim()
}

function normalizeRomajiLine(line, num) {
  let s = stripRomajiQuotes(line)
  for (const [re, rep] of ROMAJI_LINE_FIXES) s = s.replace(re, rep)
  const fix = ROMAJI_PAGE_FIXES_BY_NUM[num]
  if (fix) s = fix(s)
  return s
}

function fixHiragana(h) {
  let s = h.replace(/\s+/g, '')
  for (const [re, rep] of HIRAGANA_FIXES) s = s.replace(re, rep)
  return s
}

function inferPart(linesBefore, lineIdx) {
  let part = 1
  const text = linesBefore.slice(0, lineIdx + 1).join('\n')
  const re = /^## Part (\d+)/gm
  let m
  while ((m = re.exec(text)) !== null) part = parseInt(m[1], 10)
  return part
}

function nextNonEmpty(lines, start) {
  let j = start
  while (j < lines.length && lines[j].trim() === '') j += 1
  return j
}

function parsePage(raw) {
  const lines = raw.split('\n')
  const entries = []
  for (let i = 0; i < lines.length; i += 1) {
    const m = /^(\d+)\.\s*(.+)$/.exec(lines[i].trim())
    if (!m) continue
    const num = parseInt(m[1], 10)
    const hiragana = m[2].trim()
    let j = nextNonEmpty(lines, i + 1)
    if (lines[j]?.trim() !== 'Show/Hide Romaji') continue
    j = nextNonEmpty(lines, j + 1)
    const romajiLine = lines[j]?.trim()
    if (!romajiLine || romajiLine === 'Show/Hide Translation') continue
    j = nextNonEmpty(lines, j + 1)
    if (lines[j]?.trim() !== 'Show/Hide Translation') continue
    j = nextNonEmpty(lines, j + 1)
    const translationEn = lines[j]?.trim()
    if (!translationEn) continue
    const part = inferPart(lines, i)
    entries.push({
      num,
      part,
      hiragana,
      romajiLine,
      translationEn,
    })
  }
  return entries.sort((a, b) => a.num - b.num)
}

function buildEntry(e) {
  const hiragana = fixHiragana(e.hiragana)
  const romajiNorm = normalizeRomajiLine(e.romajiLine, e.num)
  const target = compactRomajiKey(romajiNorm)
  const raw = tokenizeHiraganaRaw(hiragana)
  const resolved = resolveHaTokens(raw, target)
  const built = compactRomajiKey(
    kanaRomajiSequence(resolved)
      .map((k) => k.romaji)
      .join(''),
  )
  const mismatch = built !== target
  const segments = buildWordSegmentsFromResolved(resolved, romajiNorm)
  const morae = moraeMergedFromResolved(resolved)
  const refWordCount = splitRomajiReferenceWords(romajiNorm).filter((w) => compactReadingKey(w)).length
  let wordAlignOk = segments.length === refWordCount
  if (segments.length && segments[segments.length - 1].moraEnd !== morae.length) wordAlignOk = false
  for (const seg of segments) {
    const slice = morae.slice(seg.moraStart, seg.moraEnd).map((m) => m.romaji).join('')
    if (compactReadingKey(slice) !== compactReadingKey(seg.romaji)) wordAlignOk = false
  }
  const words = segments.map((s) => ({
    romaji: s.romaji,
    hiragana: s.hiragana,
    moraStart: s.moraStart,
    moraEnd: s.moraEnd,
    wordIt: lookupWordIt(s.romaji),
  }))
  return {
    id: `kaguya-${e.num}`,
    part: e.part,
    sentenceIndex: e.num,
    hiragana,
    romajiReference: romajiNorm,
    translationIt: ITALIAN_BY_NUM[e.num] || e.translationEn,
    tokens: tokensForJson(resolved),
    words,
    _mismatch: mismatch,
    _wordAlignOk: wordAlignOk,
    _built: built,
    _target: target,
  }
}

const raw = fs.readFileSync(pagePath, 'utf8')
const parsed = parsePage(raw)
const built = parsed.map(buildEntry)
const mismatches = built.filter((x) => x._mismatch)
if (mismatches.length) {
  console.warn('Romaji compact mismatches (hiragana tokenization vs fixed reference):')
  for (const x of mismatches) {
    console.warn(`  #${x.sentenceIndex}`, x._built, '!==', x._target)
  }
}
const wordAlignBad = built.filter((x) => !x._wordAlignOk)
if (wordAlignBad.length) {
  console.warn('Word / mora alignment issues (romajiReference vs hiragana):')
  for (const x of wordAlignBad) {
    console.warn(`  #${x.sentenceIndex}`)
  }
}
const clean = built.map(({ _mismatch, _wordAlignOk, _built, _target, ...rest }) => rest)
fs.writeFileSync(outPath, JSON.stringify(clean, null, 0), 'utf8')
console.log(`Wrote ${clean.length} entries → ${outPath}`)
