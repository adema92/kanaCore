import React, { useState, useEffect, useRef } from "react";
import {
  BookOpen,
  CheckCircle,
  Brain,
  PlusCircle,
  BarChart2,
  X,
  Trophy,
  Volume2,
  PenTool,
  Eraser,
  CalendarDays,
  Info,
  Grid,
  Eye,
  EyeOff,
  RotateCcw,
  AlertTriangle,
  ChevronRight,
  History,
  GraduationCap,
  Languages,
  LayoutDashboard,
} from "lucide-react";
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, setDoc, onSnapshot } from "firebase/firestore";

// --- CONFIGURAZIONE FIREBASE ---
const firebaseConfig =
  typeof __firebase_config === "string"
    ? JSON.parse(__firebase_config)
    : __firebase_config;
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";

// --- HELPERS ---
const getMasteryColor = (score) => {
  if (score >= 80)
    return "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100";
  if (score >= 40)
    return "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100";
  return "bg-rose-50 text-rose-500 border-rose-200 hover:bg-rose-100";
};

const getMasteryDot = (score) => {
  if (score >= 80) return "bg-emerald-400";
  if (score >= 40) return "bg-amber-400";
  return "bg-rose-400";
};

// --- DATASET INIZIALE (VOCALI A 50) ---
const INITIAL_KANA = [
  {
    id: "k1",
    character: "あ",
    romaji: "a",
    personalNote: "",
    score: 50,
    attempts: 1,
  },
  {
    id: "k2",
    character: "い",
    romaji: "i",
    personalNote: "",
    score: 50,
    attempts: 1,
  },
  {
    id: "k3",
    character: "う",
    romaji: "u",
    personalNote: "",
    score: 50,
    attempts: 1,
  },
  {
    id: "k4",
    character: "え",
    romaji: "e",
    personalNote: "",
    score: 50,
    attempts: 1,
  },
  {
    id: "k5",
    character: "お",
    romaji: "o",
    personalNote: "",
    score: 50,
    attempts: 1,
  },
  {
    id: "k6",
    character: "か",
    romaji: "ka",
    personalNote: "",
    score: 0,
    attempts: 0,
  },
  {
    id: "k7",
    character: "き",
    romaji: "ki",
    personalNote: "",
    score: 0,
    attempts: 0,
  },
  {
    id: "k8",
    character: "く",
    romaji: "ku",
    personalNote: "",
    score: 0,
    attempts: 0,
  },
  {
    id: "k9",
    character: "け",
    romaji: "ke",
    personalNote: "",
    score: 0,
    attempts: 0,
  },
  {
    id: "k10",
    character: "こ",
    romaji: "ko",
    personalNote: "",
    score: 0,
    attempts: 0,
  },
  {
    id: "k11",
    character: "が",
    romaji: "ga",
    personalNote: "",
    score: 0,
    attempts: 0,
  },
  {
    id: "k12",
    character: "ぎ",
    romaji: "gi",
    personalNote: "",
    score: 0,
    attempts: 0,
  },
  {
    id: "k13",
    character: "ぐ",
    romaji: "gu",
    personalNote: "",
    score: 0,
    attempts: 0,
  },
  {
    id: "k14",
    character: "げ",
    romaji: "ge",
    personalNote: "",
    score: 0,
    attempts: 0,
  },
  {
    id: "k15",
    character: "ご",
    romaji: "go",
    personalNote: "",
    score: 0,
    attempts: 0,
  },
];

const BASE_PRESETS = [
  { id: "p1", name: "Vocali", kanaIds: ["k1", "k2", "k3", "k4", "k5"] },
  { id: "p2", name: "Riga K", kanaIds: ["k6", "k7", "k8", "k9", "k10"] },
  { id: "p3", name: "Riga G", kanaIds: ["k11", "k12", "k13", "k14", "k15"] },
];

const INITIAL_VOCAB = [
  {
    id: "v1a",
    word: "おはよう",
    romaji: "Ohayō",
    meaning: "Buongiorno",
    category: "Saluti",
    tone: "Informale",
    personalNote: "",
    score: 0,
    attempts: 0,
  },
  {
    id: "v1b",
    word: "おはようございます",
    romaji: "Ohayōgozaimasu",
    meaning: "Buongiorno",
    category: "Saluti",
    tone: "Formale",
    personalNote: "",
    score: 0,
    attempts: 0,
  },
  {
    id: "v2",
    word: "こんにちは",
    romaji: "Konnichiwa",
    meaning: "Buon pomeriggio",
    category: "Saluti",
    tone: "Neutro",
    personalNote: "",
    score: 0,
    attempts: 0,
  },
  {
    id: "v3",
    word: "こんばんは",
    romaji: "Konbanwa",
    meaning: "Buonasera",
    category: "Saluti",
    tone: "Neutro",
    personalNote: "",
    score: 0,
    attempts: 0,
  },
  {
    id: "v9",
    word: "あい",
    romaji: "Ai",
    meaning: "Amore",
    category: "Random",
    tone: "Neutro",
    personalNote: "",
    score: 0,
    attempts: 0,
  },
];

const HIRAGANA_GRID = [
  [
    { c: "あ", r: "a" },
    { c: "い", r: "i" },
    { c: "う", r: "u" },
    { c: "え", r: "e" },
    { c: "お", r: "o" },
  ],
  [
    { c: "か", r: "ka" },
    { c: "き", r: "ki" },
    { c: "く", r: "ku" },
    { c: "け", r: "ke" },
    { c: "こ", r: "ko" },
  ],
  [
    { c: "が", r: "ga" },
    { c: "ぎ", r: "gi" },
    { c: "ぐ", r: "gu" },
    { c: "げ", r: "ge" },
    { c: "ご", r: "go" },
  ],
  [
    { c: "さ", r: "sa" },
    { c: "し", r: "shi" },
    { c: "す", r: "su" },
    { c: "せ", r: "se" },
    { c: "そ", r: "so" },
  ],
  [
    { c: "ざ", r: "za" },
    { c: "じ", r: "ji" },
    { c: "ず", r: "zu" },
    { c: "ぜ", r: "ze" },
    { c: "ぞ", r: "zo" },
  ],
  [
    { c: "た", r: "ta" },
    { c: "ち", r: "chi" },
    { c: "つ", r: "tsu" },
    { c: "て", r: "te" },
    { c: "と", r: "to" },
  ],
  [
    { c: "だ", r: "da" },
    { c: "ぢ", r: "ji" },
    { c: "づ", r: "zu" },
    { c: "で", r: "de" },
    { c: "ど", r: "do" },
  ],
  [
    { c: "な", r: "na" },
    { c: "に", r: "ni" },
    { c: "ぬ", r: "nu" },
    { c: "ね", r: "ne" },
    { c: "の", r: "no" },
  ],
  [
    { c: "は", r: "ha" },
    { c: "ひ", r: "hi" },
    { c: "ふ", r: "fu" },
    { c: "へ", r: "he" },
    { c: "ほ", r: "ho" },
  ],
  [
    { c: "ば", r: "ba" },
    { c: "び", r: "bi" },
    { c: "ぶ", r: "bu" },
    { c: "べ", r: "be" },
    { c: "ぼ", r: "bo" },
  ],
  [
    { c: "ぱ", r: "pa" },
    { c: "ぴ", r: "pi" },
    { c: "ぷ", r: "pu" },
    { c: "ぺ", r: "pe" },
    { c: "ぽ", r: "po" },
  ],
  [
    { c: "ま", r: "ma" },
    { c: "み", r: "mi" },
    { c: "む", r: "mu" },
    { c: "め", r: "me" },
    { c: "も", r: "mo" },
  ],
  [
    { c: "や", r: "ya" },
    null,
    { c: "ゆ", r: "yu" },
    null,
    { c: "よ", r: "yo" },
  ],
  [
    { c: "ら", r: "ra" },
    { c: "り", r: "ri" },
    { c: "る", r: "ru" },
    { c: "れ", r: "re" },
    { c: "ろ", r: "ro" },
  ],
  [{ c: "わ", r: "wa" }, null, null, null, { c: "を", r: "wo" }],
  [{ c: "ん", r: "n" }, null, null, null, null],
];

const CHANGELOG = [
  {
    version: "v2.2.4",
    date: "08 Mar 2026",
    changes: [
      "Ripristinata voce naturale giapponese (filtro Google/Natural)",
      "Ottimizzazione definitiva speaker",
      "Mantenuto layout desktop compatto",
    ],
  },
  {
    version: "v2.2.3",
    date: "08 Mar 2026",
    changes: [
      "Ottimizzate misure grafiche quiz",
      "Ripristinata creazione manuale preset",
      "Navigazione inferiore ultra-sottile",
    ],
  },
];

// --- COMPONENTS ---
const StrokeOrderSVG = ({ character }) => {
  const [svgData, setSvgData] = useState(null);
  useEffect(() => {
    if (!character) return;
    const code = character.charCodeAt(0).toString(16).toLowerCase();
    const url = `https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg@master/kanji/0${code}.svg`;
    fetch(url)
      .then((res) => res.text())
      .then((text) => {
        let cleaned = text
          .replace(/<!DOCTYPE[\s\S]*?\[[\s\S]*?\]>\n?/g, "")
          .replace(/<!DOCTYPE[\s\S]*?>\n?/g, "")
          .replace(/\]>\n?/g, "");
        const style = `<style>g[id^="kvg:StrokePaths"] path { stroke-width: 6px !important; stroke: #334155 !important; stroke-linecap: round !important; stroke-linejoin: round !important; } g[id^="kvg:StrokeNumbers"] text { font-size: 14px !important; fill: #ef4444 !important; font-weight: bold !important; }</style></style>`;
        setSvgData(cleaned.replace("</svg>", style));
      })
      .catch(() => setSvgData(""));
  }, [character]);
  return svgData ? (
    <div
      className="w-full h-full [&>svg]:w-full [&>svg]:h-full"
      dangerouslySetInnerHTML={{ __html: svgData }}
    />
  ) : (
    <div className="animate-pulse flex items-center justify-center text-slate-300">
      ...
    </div>
  );
};

const DrawingCanvas = ({ onDraw, id }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 14;
    ctx.strokeStyle = "#334155";
  }, [id]);
  const start = (e) => {
    e.preventDefault();
    setIsDrawing(true);
    draw(e);
  };
  const stop = () => {
    setIsDrawing(false);
    canvasRef.current.getContext("2d").beginPath();
    if (onDraw) onDraw();
  };
  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const ctx = canvasRef.current.getContext("2d");
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  return (
    <div className="relative w-full max-w-[280px] mx-auto flex flex-col items-center">
      <canvas
        id="drawing-board"
        ref={canvasRef}
        width={280}
        height={280}
        className="bg-white rounded-[2rem] shadow-inner border-4 border-pink-100 touch-none w-full h-auto aspect-square mx-auto"
        onPointerDown={start}
        onPointerMove={draw}
        onPointerUp={stop}
      />
      <button
        onClick={() =>
          canvasRef.current.getContext("2d").clearRect(0, 0, 280, 280)
        }
        className="absolute -bottom-2 right-4 bg-white p-3 rounded-full text-slate-400 shadow-lg border border-slate-100 active:scale-90"
      >
        <Eraser size={20} />
      </button>
    </div>
  );
};

export default function App() {
  const [currentView, setCurrentView] = useState("stats");
  const [kanaData, setKanaData] = useState(INITIAL_KANA);
  const [vocabData, setVocabData] = useState(INITIAL_VOCAB);
  const [dailyStats, setDailyStats] = useState({});
  const [kanaPresets, setKanaPresets] = useState([]);
  const [user, setUser] = useState(null);
  const [isCloudLoaded, setIsCloudLoaded] = useState(!auth);

  // UI States
  const [selectedKanaModal, setSelectedKanaModal] = useState(null);
  const [selectedVocabModal, setSelectedVocabModal] = useState(null);
  const [customAlert, setCustomAlert] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [hideGridRomaji, setHideGridRomaji] = useState(true);
  const [changelogModalOpen, setChangelogModalOpen] = useState(false);

  // Quiz States
  const [quizActive, setQuizActive] = useState(false);
  const [quizSetupModalOpen, setQuizSetupModalOpen] = useState(false);
  const [difficultyModalOpen, setDifficultyModalOpen] = useState(false);
  const [selectedKanaIds, setSelectedKanaIds] = useState([]);
  const [newPresetName, setNewPresetName] = useState("");
  const [quizPendingItems, setQuizPendingItems] = useState([]);
  const [quizDifficulty, setQuizDifficulty] = useState("medio");
  const [quizDirection, setQuizDirection] = useState("ja-to-romaji");
  const [quizQueue, setQuizQueue] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizType, setQuizType] = useState("kana");
  const [options, setOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [quizResults, setQuizResults] = useState({ correct: 0, total: 0 });
  const [manualInput, setManualInput] = useState("");
  const inputRef = useRef(null);

  // Writing
  const [writeActive, setWriteActive] = useState(false);
  const [writeCurrentKana, setWriteCurrentKana] = useState(null);
  const [writeFeedback, setWriteFeedback] = useState(null);
  const [vocabWriteChars, setVocabWriteChars] = useState([]);
  const [vocabWriteIndex, setVocabWriteIndex] = useState(0);
  const [vocabWriteMistakes, setVocabWriteMistakes] = useState(0);
  const [statsTimeRange, setStatsTimeRange] = useState("settimana");

  // --- INTERNAL UTILS ---
  const speakText = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const cleanText = text.split("/")[0].trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "ja-JP";

    // Seleziona la voce migliore (più naturale)
    const voices = window.speechSynthesis.getVoices();
    // Priorità alle voci Google o a versioni definite "Natural" o "Online"
    const naturalVoice =
      voices.find(
        (v) =>
          v.lang.startsWith("ja") &&
          (v.name.includes("Google") ||
            v.name.includes("Natural") ||
            v.name.includes("Online"))
      ) || voices.find((v) => v.lang.startsWith("ja"));

    if (naturalVoice) utterance.voice = naturalVoice;

    // Parametri per rendere la voce meno robotica
    utterance.rate = 0.88;
    utterance.pitch = 1.05;

    window.speechSynthesis.speak(utterance);
  };

  const endQuiz = () => {
    setQuizActive(false);
    setQuizQueue([]);
    setWriteActive(false);
    setWriteCurrentKana(null);
    setVocabWriteChars([]);
  };

  // --- FIREBASE SYNC ---
  useEffect(() => {
    if (!auth) return;
    signInAnonymously(auth).catch(() => setIsCloudLoaded(true));
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    const mergeFunc = (init, cloud) => {
      if (!cloud || !Array.isArray(cloud)) return init;
      const map = new Map(cloud.map((i) => [i.id, i]));
      return init.map((i) => (map.has(i.id) ? { ...i, ...map.get(i.id) } : i));
    };
    return onSnapshot(
      doc(db, "artifacts", appId, "users", user.uid, "appState", "main"),
      (snap) => {
        if (snap.exists() && !snap.metadata.hasPendingWrites) {
          const d = snap.data();
          setKanaData(mergeFunc(INITIAL_KANA, d.kanaData));
          setVocabData(mergeFunc(INITIAL_VOCAB, d.vocabData));
          if (d.dailyStats) setDailyStats(d.dailyStats);
          if (d.kanaPresets) setKanaPresets(d.kanaPresets);
        }
        setIsCloudLoaded(true);
      }
    );
  }, [user]);

  // Caricamento asincrono voci per alcuni browser
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      const loadVoices = () => window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const sync = (upd) => {
    if (user && db)
      setDoc(
        doc(db, "artifacts", appId, "users", user.uid, "appState", "main"),
        upd,
        { merge: true }
      );
  };

  const processAnswer = (ok, item) => {
    if (ok) setQuizResults((p) => ({ ...p, correct: p.correct + 1 }));
    speakText(
      quizType.includes("kana") || quizType === "write"
        ? item.character
        : item.word
    );

    const todayStr = new Date(
      new Date().getTime() - new Date().getTimezoneOffset() * 60000
    )
      .toISOString()
      .split("T")[0];
    setDailyStats((prev) => {
      const cur = prev[todayStr] || { correct: 0, total: 0 };
      const next = {
        ...prev,
        [todayStr]: {
          correct: cur.correct + (ok ? 1 : 0),
          total: cur.total + 1,
        },
      };
      sync({ dailyStats: next });
      return next;
    });

    const upd = (data) =>
      data.map((x) => {
        if (x.id === item.id) {
          let ns = ok ? Math.min(100, x.score + 25) : Math.max(0, x.score - 20);
          return { ...x, score: ns, attempts: x.attempts + 1 };
        }
        return x;
      });
    if (quizType.includes("kana") || quizType === "write") {
      const d = upd(kanaData);
      setKanaData(d);
      sync({ kanaData: d });
    } else {
      const d = upd(vocabData);
      setVocabData(d);
      sync({ vocabData: d });
    }

    setTimeout(() => {
      if (currentQuestionIndex + 1 < quizQueue.length) {
        setCurrentQuestionIndex((p) => p + 1);
        if (quizType === "vocab-write")
          initVocabWrite(quizQueue[currentQuestionIndex + 1]);
        else {
          genOptions(quizQueue[currentQuestionIndex + 1]);
          setManualInput("");
        }
      } else endQuiz();
    }, 400);
  };

  const checkAccuracy = (targetChar) => {
    const canvas = document.getElementById("drawing-board");
    if (!canvas) return false;
    const drawnData = canvas.getContext("2d").getImageData(0, 0, 320, 320).data;
    const temp = document.createElement("canvas");
    temp.width = 320;
    temp.height = 320;
    const tctx = temp.getContext("2d");
    tctx.font = "bold 220px sans-serif";
    tctx.textAlign = "center";
    tctx.textBaseline = "middle";
    tctx.lineWidth = 22;
    tctx.strokeStyle = "black";
    tctx.strokeText(targetChar, 160, 160);
    tctx.fillText(targetChar, 160, 160);
    const targetData = tctx.getImageData(0, 0, 320, 320).data;
    let overlap = 0,
      drawn = 0,
      totalTarget = 0;
    for (let i = 3; i < drawnData.length; i += 4) {
      if (drawnData[i] > 20) drawn++;
      if (targetData[i] > 20) totalTarget++;
      if (drawnData[i] > 20 && targetData[i] > 20) overlap++;
    }
    return drawn > 40 && overlap / totalTarget > 0.3 && overlap / drawn > 0.28;
  };

  const genOptions = (cur) => {
    if (quizDifficulty === "difficile") {
      setIsAnswered(false);
      return;
    }
    const num = quizDifficulty === "facile" ? 3 : 4;
    const wr = quizPendingItems
      .filter((i) => i.id !== cur.id)
      .sort(() => 0.5 - Math.random())
      .slice(0, num - 1);
    setOptions([cur, ...wr].sort(() => 0.5 - Math.random()));
    setSelectedOption(null);
    setIsAnswered(false);
  };

  const initVocabWrite = (item) => {
    const word = item.word.split("/")[0].trim().replace(/\s+/g, "");
    setVocabWriteChars(Array.from(word));
    setVocabWriteIndex(0);
    setWriteFeedback(null);
    setVocabWriteMistakes(0);
  };

  const handleStartQuizClick = (type, forced = null) => {
    setQuizType(type);
    if (forced) {
      setQuizPendingItems(forced);
      setDifficultyModalOpen(true);
      return;
    }
    if (type.includes("kana") || type === "write") {
      const min = type === "write" ? 1 : 4;
      if (kanaData.length < min) {
        setCustomAlert("🌸 Aggiungi almeno 4 Kana prima!");
        return;
      }
      setSelectedKanaIds(kanaData.map((k) => k.id));
      setQuizSetupModalOpen(true);
    } else {
      if (vocabData.length < (type === "vocab" ? 4 : 1)) {
        setCustomAlert("🌸 Aggiungi parole prima!");
        return;
      }
      setQuizPendingItems(vocabData);
      setDifficultyModalOpen(true);
    }
  };

  const proceedFromSetup = () => {
    const min = quizType === "write" ? 1 : 4;
    if (selectedKanaIds.length < min) {
      setCustomAlert(`Seleziona almeno ${min} Kana!`);
      return;
    }
    const selectedItems = kanaData.filter((k) =>
      selectedKanaIds.includes(k.id)
    );
    setQuizPendingItems(selectedItems);
    setQuizSetupModalOpen(false);
    if (quizType === "write") {
      const first =
        selectedItems[Math.floor(Math.random() * selectedItems.length)];
      setWriteCurrentKana(first);
      setWriteFeedback(null);
      setWriteActive(true);
      speakText(first.character);
    } else setDifficultyModalOpen(true);
  };

  const startQuizFinal = (diff) => {
    setQuizDifficulty(diff);
    setDifficultyModalOpen(false);
    const shuffled = [...quizPendingItems].sort(() => 0.5 - Math.random());
    setQuizQueue(shuffled);
    setCurrentQuestionIndex(0);
    setQuizResults({ correct: 0, total: shuffled.length });
    if (quizType === "vocab-write") initVocabWrite(shuffled[0]);
    else {
      genOptions(shuffled[0]);
      setManualInput("");
    }
    setQuizActive(true);
  };

  const evaluateVocabWrite = () => {
    setWriteFeedback("evaluating");
    const ok = checkAccuracy(vocabWriteChars[vocabWriteIndex]);
    setTimeout(() => {
      if (ok) {
        setWriteFeedback("correct");
        speakText(vocabWriteChars[vocabWriteIndex]);
        setTimeout(() => {
          if (vocabWriteIndex + 1 < vocabWriteChars.length) {
            setVocabWriteIndex((v) => v + 1);
            setWriteFeedback(null);
          } else
            processAnswer(
              vocabWriteMistakes === 0,
              quizQueue[currentQuestionIndex]
            );
        }, 600);
      } else {
        setVocabWriteMistakes((m) => m + 1);
        setWriteFeedback("wrong");
        setTimeout(() => setWriteFeedback(null), 1000);
      }
    }, 300);
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!isAnswered && manualInput.trim()) {
      setIsAnswered(true);
      processAnswer(
        manualInput.trim().toLowerCase() ===
          quizQueue[currentQuestionIndex].romaji
            .split("/")[0]
            .trim()
            .toLowerCase(),
        quizQueue[currentQuestionIndex]
      );
    }
  };
  const handleAnswer = (option) => {
    if (!isAnswered) {
      setSelectedOption(option);
      setIsAnswered(true);
      processAnswer(
        option.id === quizQueue[currentQuestionIndex].id,
        quizQueue[currentQuestionIndex]
      );
    }
  };
  const updateKanaNoteLocal = (id, val) => {
    const next = kanaData.map((k) =>
      k.id === id ? { ...k, personalNote: val } : k
    );
    setKanaData(next);
    sync({ kanaData: next });
  };
  const updateVocabNoteLocal = (id, val) => {
    const next = vocabData.map((v) =>
      v.id === id ? { ...v, personalNote: val } : v
    );
    setVocabData(next);
    sync({ vocabData: next });
  };

  if (!isCloudLoaded)
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center flex-col gap-4">
        <Brain size={60} className="text-pink-400 animate-bounce" />
        <p className="text-slate-400 font-black text-sm uppercase tracking-widest">
          Caricamento Cloud...
        </p>
      </div>
    );

  // --- VIEWS ---
  const renderStats = () => {
    const localToday = new Date(
      new Date().getTime() - new Date().getTimezoneOffset() * 60000
    )
      .toISOString()
      .split("T")[0];
    const data =
      statsTimeRange === "giorno"
        ? [
            {
              label: "Oggi",
              total: dailyStats[localToday]?.total || 0,
              correct: dailyStats[localToday]?.correct || 0,
            },
          ]
        : Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            const s = dailyStats[
              new Date(d.getTime() - d.getTimezoneOffset() * 60000)
                .toISOString()
                .split("T")[0]
            ] || { total: 0, correct: 0 };
            return {
              label: d.toLocaleDateString("it-IT", { weekday: "short" }),
              ...s,
            };
          });
    const maxVal = Math.max(...data.map((d) => d.total), 10);
    return (
      <div className="space-y-4 pb-24 w-full px-6 flex flex-col items-center mx-auto animate-in fade-in max-w-4xl">
        <header className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-indigo-100 text-center w-full">
          <h1 className="text-2xl font-black text-slate-700 mb-1">
            Il tuo Log 📈
          </h1>
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="bg-indigo-50 p-5 rounded-3xl border border-indigo-100 shadow-inner">
              <span className="text-[10px] font-bold text-indigo-400 uppercase block mb-1 tracking-widest">
                Kana OK
              </span>
              <div className="text-3xl font-black text-indigo-600">
                {kanaData.filter((k) => k.score >= 80).length}
              </div>
            </div>
            <div className="bg-purple-50 p-5 rounded-3xl border border-purple-100 shadow-inner">
              <span className="text-[10px] font-bold text-purple-400 uppercase block mb-1 tracking-widest">
                Parole OK
              </span>
              <div className="text-3xl font-black text-purple-600">
                {vocabData.filter((v) => v.score >= 80).length}
              </div>
            </div>
          </div>
          <button
            onClick={() => setChangelogModalOpen(true)}
            className="mt-6 flex items-center justify-center gap-2 mx-auto text-[10px] font-black text-slate-300 uppercase tracking-widest bg-slate-50 px-5 py-2 rounded-full border border-slate-100 active:bg-slate-100 transition-all shadow-sm"
          >
            <History size={14} /> Changelog v2.2.4
          </button>
        </header>
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-indigo-50 w-full">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8 max-w-xs mx-auto">
            {["giorno", "settimana"].map((tr) => (
              <button
                key={tr}
                onClick={() => setStatsTimeRange(tr)}
                className={`flex-1 text-[10px] font-black py-2.5 rounded-xl uppercase transition-all ${
                  statsTimeRange === tr
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {tr}
              </button>
            ))}
          </div>
          <div className="flex items-end justify-between h-40 gap-3 px-1">
            {data.map((d, i) => (
              <div
                key={i}
                className="flex-1 flex flex-col items-center h-full justify-end group"
              >
                <div
                  className="w-full bg-slate-50 rounded-t-xl relative overflow-hidden shadow-inner border"
                  style={{ height: `${(d.total / maxVal) * 100}%` }}
                >
                  <div
                    className="absolute bottom-0 w-full bg-emerald-400 transition-all duration-700"
                    style={{
                      height: `${
                        d.total > 0 ? (d.correct / d.total) * 100 : 0
                      }%`,
                    }}
                  ></div>
                </div>
                <span className="text-[10px] font-bold text-slate-400 mt-3 uppercase">
                  {d.label}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-4 w-full">
          <button
            onClick={() =>
              setConfirmModal({
                title: "Reset Kana",
                text: "Vuoi azzerare i progressi dei Kana?",
                onConfirm: () => {
                  setKanaData(
                    INITIAL_KANA.map((k) => ({ ...k, score: 0, attempts: 0 }))
                  );
                  sync({
                    kanaData: INITIAL_KANA.map((k) => ({
                      ...k,
                      score: 0,
                      attempts: 0,
                    })),
                  });
                  setConfirmModal(null);
                },
              })
            }
            className="flex-1 bg-rose-50 text-rose-500 font-bold py-4 rounded-[2rem] text-xs border border-rose-100 flex items-center justify-center gap-3 active:scale-95 transition-transform shadow-sm uppercase tracking-widest"
          >
            <RotateCcw size={16} /> Reset Kana
          </button>
          <button
            onClick={() =>
              setConfirmModal({
                title: "Reset Parole",
                text: "Vuoi azzerare i progressi delle Parole?",
                onConfirm: () => {
                  setVocabData(
                    INITIAL_VOCAB.map((v) => ({ ...v, score: 0, attempts: 0 }))
                  );
                  sync({
                    vocabData: INITIAL_VOCAB.map((v) => ({
                      ...v,
                      score: 0,
                      attempts: 0,
                    })),
                  });
                  setConfirmModal(null);
                },
              })
            }
            className="flex-1 bg-rose-50 text-rose-500 font-bold py-4 rounded-[2rem] text-xs border border-rose-100 flex items-center justify-center gap-3 active:scale-95 transition-transform shadow-sm uppercase tracking-widest"
          >
            <RotateCcw size={16} /> Reset Parole
          </button>
        </div>
      </div>
    );
  };

  const renderKana = () => (
    <div className="space-y-4 pb-24 w-full px-6 flex flex-col items-center mx-auto animate-in fade-in max-w-4xl">
      <div className="bg-gradient-to-br from-pink-400 to-rose-400 p-8 rounded-[2.5rem] text-white shadow-lg text-center w-full mx-auto">
        <h1 className="text-3xl font-black mb-1 text-center">Hiragana</h1>
        <div className="flex gap-4 mt-6 justify-center">
          <button
            onClick={() => handleStartQuizClick("kana")}
            className="flex-1 max-w-xs bg-white text-rose-500 font-black py-4 rounded-[2rem] text-sm flex items-center justify-center gap-2 shadow-md hover:scale-105 transition-all uppercase tracking-widest"
          >
            <BookOpen size={18} /> Quiz Lettura
          </button>
          <button
            onClick={() => handleStartQuizClick("write")}
            className="flex-1 max-w-xs bg-slate-800 text-white font-black py-4 rounded-[2rem] text-sm flex items-center justify-center gap-2 shadow-md hover:scale-105 transition-all uppercase tracking-widest"
          >
            <PenTool size={18} /> Scrittura
          </button>
        </div>
        <button
          onClick={() => setHideGridRomaji(!hideGridRomaji)}
          className="w-full max-w-xs mt-6 mx-auto bg-white/20 border border-white/30 text-white font-bold py-2 rounded-2xl text-[10px] uppercase tracking-widest block"
        >
          {hideGridRomaji ? "Mostra Romaji" : "Nascondi Romaji"}
        </button>
      </div>
      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-pink-50 w-full mx-auto">
        <div className="grid grid-cols-5 md:grid-cols-10 gap-3">
          {HIRAGANA_GRID.flat().map((item, idx) => {
            if (!item)
              return (
                <div
                  key={idx}
                  className="aspect-square opacity-0 pointer-events-none"
                ></div>
              );
            const k = kanaData.find((x) => x.character === item.c);
            return (
              <div
                key={idx}
                onClick={() => {
                  setSelectedKanaModal(
                    k || {
                      id: "new",
                      character: item.c,
                      romaji: item.r,
                      isNew: true,
                    }
                  );
                  speakText(item.c);
                }}
                className={`aspect-square rounded-[1.2rem] border-2 flex flex-col items-center justify-center cursor-pointer transition-all active:scale-90 hover:shadow-lg ${
                  k
                    ? getMasteryColor(k.score)
                    : "bg-slate-50 border-slate-100 text-slate-200 border-dashed"
                }`}
              >
                <span className="text-2xl font-black">{item.c}</span>
                {!hideGridRomaji && (
                  <span className="text-[9px] font-bold uppercase opacity-40 mt-1 tracking-widest">
                    {item.r}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderVocab = () => (
    <div className="space-y-6 pb-24 w-full px-6 flex flex-col items-center mx-auto animate-in fade-in max-w-4xl">
      <div className="bg-gradient-to-br from-purple-400 to-indigo-400 p-8 rounded-[2.5rem] text-white shadow-lg text-center w-full mx-auto">
        <h1 className="text-3xl font-black mb-1 uppercase tracking-tight text-center">
          Vocabolario
        </h1>
        <div className="flex gap-4 mt-6 justify-center">
          <button
            onClick={() => handleStartQuizClick("vocab")}
            className="flex-1 max-w-xs bg-white text-purple-600 font-black py-4 rounded-[2rem] text-sm shadow-md hover:scale-105 transition-all"
          >
            Lettura
          </button>
          <button
            onClick={() => handleStartQuizClick("vocab-write")}
            className="flex-1 max-w-xs bg-slate-800 text-white font-black py-4 rounded-[2rem] text-sm shadow-md hover:scale-105 transition-all"
          >
            Scrittura
          </button>
        </div>
      </div>
      {Object.entries(
        vocabData.reduce((acc, curr) => {
          if (!acc[curr.category]) acc[curr.category] = [];
          acc[curr.category].push(curr);
          return acc;
        }, {})
      ).map(([cat, words]) => (
        <div key={cat} className="space-y-3 w-full mx-auto">
          <h3 className="font-black text-purple-400 uppercase text-[10px] tracking-[0.4em] pl-4">
            ✨ {cat}
          </h3>
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-purple-50 overflow-hidden w-full mx-auto">
            {words.map((w) => (
              <div
                key={w.id}
                onClick={() => setSelectedVocabModal(w)}
                className="p-5 border-b last:border-b-0 flex items-center justify-between active:bg-slate-50 transition-colors cursor-pointer group"
              >
                <div className="flex-1 truncate pr-4 text-left">
                  <div className="flex items-center gap-4 font-black text-slate-700 mb-0.5">
                    <span className="text-2xl">{w.word.split("/")[0]}</span>
                    <span className="text-[9px] font-bold text-purple-400 bg-purple-50 px-2 py-0.5 rounded-lg uppercase tracking-widest shadow-sm">
                      {w.romaji.split("/")[0]}
                    </span>
                  </div>
                  <div className="text-base font-medium text-slate-400 truncate italic opacity-80">
                    {w.meaning}
                  </div>
                </div>
                <div
                  className={`w-3.5 h-3.5 rounded-full ${getMasteryDot(
                    w.score
                  )} shrink-0 shadow-sm group-hover:scale-125 transition-transform`}
                ></div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderReview = () => {
    const kR = kanaData.filter((k) => k.score < 80);
    const vR = vocabData.filter((v) => v.score < 80);
    return (
      <div className="space-y-6 pb-24 w-full px-6 flex flex-col items-center mx-auto animate-in fade-in max-w-4xl">
        <div className="bg-gradient-to-br from-amber-400 to-orange-400 p-10 rounded-[3rem] text-white shadow-xl text-center w-full mx-auto relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <GraduationCap size={120} />
          </div>
          <Brain
            size={80}
            className="mx-auto mb-6 opacity-90 drop-shadow-xl animate-pulse"
          />
          <h1 className="text-4xl font-black mb-2 text-center">Ripasso 🎓</h1>
          <p className="text-orange-50 text-base font-medium mb-10 text-center uppercase tracking-widest opacity-80">
            Migliora {kR.length + vR.length} elementi critici
          </p>
          <div className="space-y-4 w-full max-w-md mx-auto">
            <button
              onClick={() => handleStartQuizClick("kana", kR)}
              className="w-full bg-white text-orange-500 font-black py-5 rounded-[2rem] shadow-sm uppercase tracking-widest active:scale-95 transition-all text-sm"
            >
              Ripassa Kana ({kR.length})
            </button>
            <button
              onClick={() => handleStartQuizClick("vocab", vR)}
              className="w-full bg-white text-orange-500 font-black py-5 rounded-[2rem] shadow-sm uppercase tracking-widest active:scale-95 transition-all text-sm"
            >
              Ripassa Parole ({vR.length})
            </button>
            <button
              onClick={() => handleStartQuizClick("vocab-write", vR)}
              className="w-full bg-orange-600 border-2 border-white/30 text-white font-black py-5 rounded-[2.5rem] uppercase tracking-widest shadow-lg active:scale-95 transition-all text-sm"
            >
              Scrittura Parole ({vR.length})
            </button>
          </div>
        </div>
      </div>
    );
  };

  const finalInputClass = `w-full p-6 rounded-[2.5rem] border-4 text-center font-black text-3xl shadow-lg focus:outline-none transition-all ${
    isAnswered
      ? manualInput.trim().toLowerCase() ===
        (quizQueue[currentQuestionIndex]?.romaji
          ?.split("/")[0]
          ?.trim()
          ?.toLowerCase() || "")
        ? "border-emerald-400 bg-emerald-50 text-emerald-600"
        : "border-rose-400 bg-rose-50 text-rose-600"
      : "border-slate-100 focus:border-pink-300"
  }`;

  const isKanaQuiz = quizType.includes("kana") || quizType === "write";

  return (
    <div className="min-h-screen bg-[#fff0f5] font-sans text-slate-800 flex flex-col items-center overflow-x-hidden">
      {/* SELECTION MODAL */}
      {quizSetupModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-6">
          <div className="bg-white p-8 rounded-[3.5rem] shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col animate-in zoom-in-95 mx-auto">
            <div className="flex justify-between items-center mb-8 px-2 text-slate-700 font-black tracking-widest uppercase">
              <h3 className="text-xl">Selezione</h3>
              <div className="flex gap-6 items-center">
                <button
                  onClick={() => setSelectedKanaIds([])}
                  className="text-[10px] font-black text-indigo-400 uppercase underline"
                >
                  Svuota
                </button>
                <button
                  onClick={() => setQuizSetupModalOpen(false)}
                  className="bg-slate-50 p-2 rounded-full text-slate-400 shadow-sm"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 pr-2 space-y-8 custom-scrollbar">
              <div>
                <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] mb-4 pl-2 text-left">
                  Preset rapidi
                </h4>
                <div className="flex flex-wrap gap-3 mb-8">
                  {BASE_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedKanaIds(p.kanaIds)}
                      className="px-6 py-2.5 bg-indigo-50 text-indigo-600 font-black py-2 px-5 rounded-2xl uppercase shadow-sm border-2 border-indigo-100 text-[10px] hover:bg-indigo-100 transition-all"
                    >
                      {p.name}
                    </button>
                  ))}
                  {kanaPresets.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center bg-indigo-50 border-2 border-indigo-100 rounded-2xl overflow-hidden shadow-sm"
                    >
                      <button
                        onClick={() => setSelectedKanaIds(p.kanaIds)}
                        className="px-5 py-2.5 text-indigo-600 font-black uppercase text-[10px] hover:bg-indigo-100 transition-all"
                      >
                        {p.name}
                      </button>
                      <button
                        onClick={() => {
                          const np = kanaPresets.filter((x) => x.id !== p.id);
                          setKanaPresets(np);
                          sync({ kanaPresets: np });
                        }}
                        className="px-3 text-indigo-300 border-l-2 h-full hover:text-rose-50 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 px-1 max-w-md">
                  <input
                    type="text"
                    placeholder="Nuovo preset..."
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    className="flex-1 border-4 border-slate-50 rounded-2xl px-6 py-3 text-sm outline-none focus:border-indigo-200 transition-all shadow-inner"
                  />
                  <button
                    onClick={() => {
                      if (!newPresetName.trim() || selectedKanaIds.length === 0)
                        return;
                      const np = [
                        ...kanaPresets,
                        {
                          id: "p" + Date.now(),
                          name: newPresetName,
                          kanaIds: [...selectedKanaIds],
                        },
                      ];
                      setKanaPresets(np);
                      sync({ kanaPresets: np });
                      setNewPresetName("");
                    }}
                    className="bg-slate-800 text-white px-8 py-3 rounded-2xl font-black uppercase shadow-xl text-[10px] tracking-widest active:scale-95 transition-all"
                  >
                    SALVA
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-8 gap-2 px-1 pb-4">
                {kanaData.map((k) => (
                  <button
                    key={k.id}
                    onClick={() =>
                      setSelectedKanaIds((prev) =>
                        prev.includes(k.id)
                          ? prev.filter((id) => id !== k.id)
                          : [...prev, k.id]
                      )
                    }
                    className={`aspect-square rounded-xl flex items-center justify-center text-xl font-black border-2 transition-all ${
                      selectedKanaIds.includes(k.id)
                        ? "bg-pink-400 border-pink-400 text-white shadow-lg"
                        : "bg-white border-slate-100 text-slate-300 hover:border-pink-100"
                    }`}
                  >
                    {k.character}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={proceedFromSetup}
              className="w-full bg-pink-400 text-white font-black py-6 rounded-[2.5rem] mt-6 shadow-xl uppercase tracking-widest active:scale-95 transition-all mx-auto"
            >
              Continua
            </button>
          </div>
        </div>
      )}

      {/* QUIZ ACTIVE VIEW (COMPATTATA) */}
      {quizActive && (
        <div className="fixed inset-0 bg-[#fff0f5] z-[300] flex flex-col items-center">
          <div className="p-4 bg-white shadow-sm flex items-center gap-10 w-full max-w-4xl rounded-b-[2.5rem] border-b">
            <button
              onClick={endQuiz}
              className="p-3 bg-slate-50 rounded-full text-slate-300 hover:bg-rose-50 transition-all"
            >
              <X size={24} />
            </button>
            <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner border">
              <div
                className={`h-full transition-all duration-300 ${
                  isKanaQuiz ? "bg-pink-400" : "bg-purple-400"
                }`}
                style={{
                  width: `${(currentQuestionIndex / quizQueue.length) * 100}%`,
                }}
              ></div>
            </div>
            <span className="text-xl font-black text-slate-400 uppercase tracking-widest">
              {currentQuestionIndex + 1}/{quizQueue.length}
            </span>
          </div>

          <div
            className={`flex-1 flex flex-col items-center ${
              quizDifficulty === "difficile" || quizType === "vocab-write"
                ? "justify-start pt-16"
                : "justify-center"
            } p-10 overflow-y-auto w-full max-w-2xl`}
          >
            <div className="bg-white p-10 w-full max-w-md rounded-[3.5rem] shadow-xl border border-pink-50 flex flex-col items-center mb-10 mx-auto relative animate-in slide-in-from-bottom-10">
              <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] mb-4 text-center">
                Modalità Quiz
              </div>
              <div
                className={`${
                  quizDifficulty === "difficile" ? "text-4xl" : "text-7xl"
                } font-black text-slate-700 text-center leading-tight`}
              >
                {quizType === "vocab-write"
                  ? quizQueue[currentQuestionIndex].meaning
                  : quizDirection === "ja-to-romaji"
                  ? isKanaQuiz
                    ? quizQueue[currentQuestionIndex].character
                    : quizQueue[currentQuestionIndex].word
                  : quizQueue[currentQuestionIndex].romaji.split("/")[0]}
              </div>
              <button
                onClick={() =>
                  speakText(
                    isKanaQuiz
                      ? quizQueue[currentQuestionIndex].character
                      : quizQueue[currentQuestionIndex].word
                  )
                }
                className="text-slate-100 hover:text-pink-400 transition-all p-6 active:scale-90"
              >
                <Volume2 size={40} />
              </button>
            </div>

            {quizDifficulty === "difficile" ? (
              <form
                onSubmit={handleManualSubmit}
                className="w-full max-w-md animate-in zoom-in-95"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  disabled={isAnswered}
                  autoFocus
                  placeholder="Risposta..."
                  className="w-full p-6 rounded-[2.5rem] border-4 text-center font-black text-3xl shadow-lg focus:outline-none transition-all border-slate-100 focus:border-pink-300"
                />
                <button
                  type="submit"
                  disabled={isAnswered || !manualInput.trim()}
                  className="w-full bg-slate-800 text-white font-black py-8 rounded-[3rem] mt-10 uppercase shadow-2xl tracking-widest active:scale-95 text-xl"
                >
                  Conferma (Invio)
                </button>
              </form>
            ) : (
              <div className="w-full max-w-2xl grid grid-cols-2 gap-6 mx-auto">
                {options.map((opt, i) => {
                  let label =
                    quizDirection === "ja-to-romaji"
                      ? quizType === "kana"
                        ? opt.romaji
                        : opt.meaning
                      : quizType === "kana"
                      ? opt.character
                      : opt.word.split("/")[0];
                  let bc =
                    "w-full p-8 rounded-[3rem] border-4 text-center font-black text-2xl shadow-xl transition-all h-40 flex items-center justify-center ";
                  if (!isAnswered)
                    bc +=
                      "bg-white border-white/10 text-slate-600 hover:scale-105 active:bg-slate-50 shadow-indigo-50";
                  else
                    bc +=
                      opt.id === quizQueue[currentQuestionIndex].id
                        ? "bg-emerald-400 border-emerald-500 text-white scale-110"
                        : selectedOption?.id === opt.id
                        ? "bg-rose-400 border-rose-500 text-white shadow-rose-200"
                        : "bg-white opacity-10 border-slate-100";
                  return (
                    <button
                      key={i}
                      onClick={() => handleAnswer(opt)}
                      disabled={isAnswered}
                      className={bc}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CHANGELOG MODAL (RIDimensionata) */}
      {changelogModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[500] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white p-10 rounded-[3rem] shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-10 px-4 text-slate-800 font-black tracking-widest uppercase">
              <h3 className="text-xl">Cronologia</h3>
              <button
                onClick={() => setChangelogModalOpen(false)}
                className="bg-slate-100 p-3 rounded-full text-slate-400 hover:text-rose-500 transition-all shadow-sm"
              >
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 pr-2 space-y-6">
              {CHANGELOG.map((log, i) => (
                <div key={i} className="border-l-4 border-indigo-400 pl-8 py-2">
                  <div className="flex justify-between items-baseline mb-4">
                    <span className="font-black text-indigo-600 text-sm uppercase">
                      {log.version}
                    </span>
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                      {log.date}
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {log.changes.map((change, j) => (
                      <li
                        key={j}
                        className="text-[11px] font-medium text-slate-500 flex gap-3 italic leading-relaxed text-left"
                      >
                        <div className="w-1.5 h-1.5 bg-indigo-100 rounded-full mt-1.5 shrink-0"></div>{" "}
                        {change}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <button
              onClick={() => setChangelogModalOpen(false)}
              className="mt-8 bg-slate-800 text-white font-black py-4 rounded-3xl w-full uppercase tracking-widest shadow-xl transition-all active:scale-95"
            >
              Chiudi
            </button>
          </div>
        </div>
      )}

      {/* DIFFICULTY MODAL (RIDimensionata) */}
      {difficultyModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white p-12 rounded-[4rem] shadow-2xl w-full max-w-xl text-center animate-in zoom-in-95 mx-auto">
            <h3 className="text-4xl font-black text-slate-800 mb-2 uppercase">
              Setup Quiz
            </h3>
            <p className="text-slate-400 font-bold uppercase tracking-widest mb-10 text-xs">
              Configura la sessione
            </p>
            <div className="mb-10">
              <p className="text-left text-[9px] font-black text-slate-300 uppercase mb-4 ml-6 tracking-[0.4em]">
                Indovina
              </p>
              <div className="flex bg-slate-50 p-1.5 rounded-[2rem] gap-2 shadow-inner border">
                <button
                  onClick={() => setQuizDirection("ja-to-romaji")}
                  className={`flex-1 py-4 text-xs font-black rounded-2xl uppercase transition-all ${
                    quizDirection === "ja-to-romaji"
                      ? "bg-white text-indigo-500 shadow-xl"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Significato
                </button>
                <button
                  onClick={() => setQuizDirection("romaji-to-ja")}
                  className={`flex-1 py-4 text-xs font-black rounded-2xl uppercase transition-all ${
                    quizDirection === "romaji-to-ja"
                      ? "bg-white text-indigo-500 shadow-xl"
                      : "text-slate-400"
                  }`}
                >
                  Giapponese
                </button>
              </div>
            </div>
            <div className="space-y-4">
              <button
                onClick={() => startQuizFinal("facile")}
                className="w-full p-5 rounded-[2rem] border-2 border-emerald-100 bg-emerald-50 text-emerald-600 font-black uppercase tracking-widest text-base hover:bg-emerald-100 shadow-sm transition-all"
              >
                🟢 Facile
              </button>
              <button
                onClick={() => startQuizFinal("medio")}
                className="w-full p-5 rounded-[2rem] border-2 border-amber-100 bg-amber-50 text-amber-600 font-black uppercase tracking-widest text-base hover:bg-amber-100 shadow-sm transition-all"
              >
                🟡 Medio
              </button>
              <button
                onClick={() => startQuizFinal("difficile")}
                className="w-full p-5 rounded-[2rem] border-2 border-rose-100 bg-rose-50 text-rose-600 font-black uppercase tracking-widest text-base hover:bg-rose-100 shadow-sm transition-all"
              >
                🔴 Difficile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KANA MODAL (RIDimensionata) */}
      {selectedKanaModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white p-10 rounded-[4rem] shadow-2xl w-full max-w-lg relative flex flex-col items-center animate-in zoom-in-95 mx-auto border-8 border-white">
            <button
              onClick={() => setSelectedKanaModal(null)}
              className="absolute top-10 right-10 bg-slate-50 p-4 rounded-full text-slate-300 hover:text-rose-500 transition-all shadow-sm"
            >
              <X size={28} />
            </button>
            <h2 className="text-4xl font-black text-pink-400 mb-8 bg-pink-50 px-12 py-3 rounded-full uppercase tracking-widest shadow-sm">
              {selectedKanaModal.romaji}
            </h2>
            <div className="border-4 border-pink-50 rounded-[3rem] w-56 h-56 flex items-center justify-center p-10 mb-8 shadow-inner bg-white">
              <StrokeOrderSVG character={selectedKanaModal.character} />
            </div>
            <textarea
              className="w-full bg-slate-50 border-4 border-slate-50 rounded-[2.5rem] p-8 text-xl mb-8 outline-none resize-none focus:border-pink-200 shadow-inner"
              rows="2"
              placeholder="Nota..."
              value={selectedKanaModal.personalNote}
              onChange={(e) =>
                updateKanaNoteLocal(selectedKanaModal.id, e.target.value)
              }
            />
            <button
              onClick={() => speakText(selectedKanaModal.character)}
              className="w-full bg-pink-400 hover:bg-pink-500 text-white font-black py-6 rounded-[2.5rem] flex items-center justify-center gap-6 uppercase shadow-xl transition-all active:scale-95 text-2xl tracking-widest"
            >
              <Volume2 size={32} /> Pronuncia
            </button>
          </div>
        </div>
      )}

      {/* VOCAB MODAL (RIDimensionata) */}
      {selectedVocabModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white p-10 rounded-[4rem] shadow-2xl w-full max-w-xl relative flex flex-col items-center animate-in zoom-in-95 overflow-y-auto mx-auto border-8 border-white">
            <button
              onClick={() => setSelectedVocabModal(null)}
              className="absolute top-10 right-10 bg-slate-50 p-4 rounded-full text-slate-300 hover:text-rose-500 transition-all shadow-sm"
            >
              <X size={24} />
            </button>
            <h2 className="text-6xl font-black text-slate-700 mt-6 leading-tight">
              {selectedVocabModal.word}
            </h2>
            <div className="text-lg font-bold text-purple-400 bg-purple-50 px-8 py-3 rounded-2xl my-8 uppercase tracking-[0.4em] shadow-sm">
              {selectedVocabModal.romaji}
            </div>
            <p className="text-2xl font-bold text-slate-400 mb-10 italic text-center px-10 opacity-80 uppercase tracking-widest pb-6 w-full border-b">
              "{selectedVocabModal.meaning}"
            </p>
            <textarea
              className="w-full bg-slate-50 border-4 border-slate-50 rounded-[2.5rem] p-10 text-xl mb-10 outline-none resize-none focus:border-purple-200 shadow-inner"
              rows="3"
              placeholder="Appunti..."
              value={selectedVocabModal.personalNote}
              onChange={(e) =>
                updateVocabNoteLocal(selectedVocabModal.id, e.target.value)
              }
            />
            <button
              onClick={() => speakText(selectedVocabModal.word)}
              className="w-full bg-purple-500 hover:bg-purple-600 text-white font-black py-8 rounded-[3rem] flex items-center justify-center gap-8 uppercase shadow-xl transition-all active:scale-95 text-2xl tracking-widest"
            >
              <Volume2 size={40} /> Pronuncia
            </button>
          </div>
        </div>
      )}

      {/* MAIN CONTENT Area */}
      <main className="w-full flex-1 pt-12 overflow-y-auto bg-slate-50 pb-32 flex flex-col items-center">
        <div className="max-w-5xl mx-auto w-full px-12 flex flex-col items-center space-y-10">
          {currentView === "stats" && renderStats()}
          {currentView === "kana" && renderKana()}
          {currentView === "vocab" && renderVocab()}
          {currentView === "review" && renderReview()}
        </div>
      </main>

      {/* FOOTER NAV (Sottile Desktop) */}
      <nav className="fixed bottom-0 w-full bg-white/95 backdrop-blur-xl border-t border-slate-200 pb-safe z-50 rounded-t-[3rem] shadow-[0_-15px_50px_rgba(0,0,0,0.06)] h-20 flex items-center">
        <div className="w-full max-w-4xl mx-auto flex justify-around px-12">
          <NavItem
            icon={<BarChart2 size={24} />}
            label="Home"
            active={currentView === "stats"}
            onClick={() => setCurrentView("stats")}
            color="indigo"
          />
          <NavItem
            icon={<span className="text-2xl font-black pb-1">あ</span>}
            label="Hiragana"
            active={currentView === "kana"}
            onClick={() => setCurrentView("kana")}
            color="pink"
          />
          <NavItem
            icon={<BookOpen size={24} />}
            label="Vocabolario"
            active={currentView === "vocab"}
            onClick={() => setCurrentView("vocab")}
            color="purple"
          />
          <NavItem
            icon={<Brain size={24} />}
            label="Ripasso"
            active={currentView === "review"}
            onClick={() => setCurrentView("review")}
            color="orange"
          />
        </div>
      </nav>

      {/* ALERT BOX */}
      {customAlert && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[600] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl w-full max-w-xl text-center animate-in zoom-in-95 mx-auto">
            <Info className="text-indigo-500 mx-auto mb-8" size={60} />
            <p className="text-slate-700 font-black mb-12 text-2xl leading-relaxed px-10 uppercase tracking-widest">
              {customAlert}
            </p>
            <button
              onClick={() => setCustomAlert(null)}
              className="bg-indigo-500 hover:bg-indigo-600 text-white font-black py-10 px-16 rounded-[4rem] w-full uppercase tracking-widest shadow-2xl transition-all text-xl"
            >
              RICEVUTO
            </button>
          </div>
        </div>
      )}

      {/* CONFIRM BOX */}
      {confirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[400] flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl w-full max-w-sm text-center animate-in zoom-in-95 mx-auto">
            <AlertTriangle className="text-rose-500 mx-auto mb-6" size={60} />
            <h3 className="font-black text-slate-700 text-3xl mb-4">
              {confirmModal.title}
            </h3>
            <p className="text-slate-500 text-lg mb-10 leading-relaxed px-4">
              {confirmModal.text}
            </p>
            <div className="flex gap-6">
              <button
                onClick={confirmModal.onConfirm}
                className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-black py-5 rounded-[2.5rem] shadow-xl uppercase tracking-widest transition-all text-sm"
              >
                RESET
              </button>
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 bg-slate-100 text-slate-500 font-black py-5 rounded-[2.5rem] uppercase tracking-widest transition-all hover:bg-slate-200 text-sm"
              >
                ANNULLA
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NavItem({ icon, label, active, onClick, color }) {
  const colorMap = {
    pink: active
      ? "text-pink-500 bg-pink-50 shadow-inner scale-110 border border-pink-100"
      : "text-slate-300 hover:bg-slate-50",
    purple: active
      ? "text-purple-500 bg-purple-50 shadow-inner scale-110 border border-purple-100"
      : "text-slate-300 hover:bg-slate-50",
    orange: active
      ? "text-amber-500 bg-amber-50 shadow-inner scale-110 border border-amber-100"
      : "text-slate-300 hover:bg-slate-50",
    indigo: active
      ? "text-indigo-500 bg-indigo-50 shadow-inner scale-110 border border-indigo-100"
      : "text-slate-300 hover:bg-slate-50",
  };
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-[100px] h-16 rounded-[1.5rem] transition-all duration-300 ${colorMap[color]} mx-auto text-center active:scale-105 group`}
    >
      <div className="mb-0 flex items-center justify-center h-6 mx-auto text-center group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <span className="text-[10px] font-black uppercase tracking-[0.1em] text-center w-full">
        {label}
      </span>
    </button>
  );
}
