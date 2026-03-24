/**
 * Short Italian hints for common particles / grammar (reading aid, not full dictionary).
 */
const PARTICLE_GLOSS = {
  no: 'Particella possessiva / collegamento (di, di tipo)',
  ni: 'Direzione, luogo, tempo (a, in, verso)',
  na: 'Aggettivo な (prima del nome)',
  wa: 'Particella del tema (quanto a…)',
  ga: 'Particella del soggetto',
  o: 'Particella dell’oggetto diretto',
  to: 'E, con; citazione',
  mo: 'Anche, persino',
  de: 'Mezzo, luogo, causa (con, in, per)',
  kara: 'Da, perché, dopo',
  e: 'Verso, a (direzione)',
  ya: 'E, oppure (enumerazione)',
  ka: 'Domanda; alternativa',
  ne: 'Rafforzativo, conferma',
  yo: 'Enfasi',
  made: 'Fino a',
  koto: 'Cosa, fatto (nominalizzazione)',
  goto: 'Cosa, questione',
  demo: 'Anche se, persino',
  bakari: 'Solo, appena',
  you: 'Modo, come (~ように)',
  niwa: 'Per quanto riguarda',
  dake: 'Solo',
  hodo: 'Grado, circa',
  kurai: 'Circa, estensione',
  mitai: 'Come, simile a',
  kudasai: 'Per favore (cortese)',
  te: 'Forma in -te (collegamento, richiesta, gerundio)',
}

export function glossItForRomajiWord(romajiWord) {
  const k = String(romajiWord)
    .toLowerCase()
    .replace(/^[,，.。!！?？「」『』]+|[,，。.!！?？]+$/g, '')
  const key = k.replace(/[^a-z]/g, '')
  if (!key) return null
  return PARTICLE_GLOSS[key] || PARTICLE_GLOSS[k.split(/[^a-z]+/).filter(Boolean)[0]] || null
}
