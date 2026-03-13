import { useState, useEffect, useRef, useCallback } from "react";

// ─── Audio Engine ─────────────────────────────────────────────────────────────
const createAudioContext = () => {
  try { return new (window.AudioContext || window.webkitAudioContext)(); }
  catch { return null; }
};
const playTone = (ctx, freq, duration, type = "sine", volume = 0.3, delay = 0) => {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
  gain.gain.setValueAtTime(0, ctx.currentTime + delay);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + delay + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
  osc.start(ctx.currentTime + delay);
  osc.stop(ctx.currentTime + delay + duration + 0.05);
};
const sounds = {
  correct: (ctx) => { playTone(ctx,523,.12,"sine",.3,0); playTone(ctx,659,.12,"sine",.3,.1); playTone(ctx,784,.2,"sine",.3,.2); },
  wrong:   (ctx) => { playTone(ctx,300,.15,"sawtooth",.15,0); playTone(ctx,220,.2,"sawtooth",.1,.12); },
  tick:    (ctx) => { playTone(ctx,880,.06,"sine",.1,0); },
  combo:   (ctx) => { [523,659,784,1047].forEach((f,i) => playTone(ctx,f,.1,"sine",.25,i*.07)); },
  finish:  (ctx) => { [523,659,784,659,784,1047].forEach((f,i) => playTone(ctx,f,.15,"sine",.28,i*.1)); },
  bgNote:  (ctx) => { const n=[196,220,247,262][Math.floor(Math.random()*4)]; playTone(ctx,n,.8,"sine",.04,0); },
};

// ─── Questions ────────────────────────────────────────────────────────────────
const ALL_QUESTIONS = [
  { question:"Em que ano a Syngenta foi fundada?", options:["1998","2000","2005","1995"], correct:1, explanation:"A Syngenta foi criada em 2000 a partir da fusão das divisões agrícolas da Novartis e da AstraZeneca." },
  { question:"Qual é a sede global da Syngenta?", options:["Londres, Reino Unido","Basileia, Suíça","São Paulo, Brasil","Berlim, Alemanha"], correct:1, explanation:"A sede global da Syngenta fica em Basileia (Basel), na Suíça." },
  { question:"O que é o programa \"Good Growth Plan\" da Syngenta?", options:["Um plano de expansão de fábricas","Um compromisso de sustentabilidade com metas mensuráveis","Um programa de financiamento para produtores","Uma linha de fertilizantes orgânicos"], correct:1, explanation:"O Good Growth Plan é o compromisso global da Syngenta com agricultura sustentável, com metas ambiciosas e mensuráveis." },
  { question:"Qual destas é uma marca de fungicida da Syngenta amplamente usada no Brasil?", options:["Roundup","Elatus","Certero","Intrepid"], correct:1, explanation:"Elatus é uma das principais marcas de fungicida da Syngenta no Brasil, com tecnologia SOLATENOL®." },
  { question:"A tecnologia SOLATENOL® da Syngenta é um ingrediente ativo de qual categoria?", options:["Herbicida","Inseticida","Fungicida","Nematicida"], correct:2, explanation:"SOLATENOL® (benzovindiflupir) é um ingrediente ativo fungicida de última geração da classe dos SDHI." },
  { question:"Qual grupo adquiriu a Syngenta em 2017?", options:["BASF","Bayer","ChemChina (atual Syngenta Group)","Corteva"], correct:2, explanation:"Em 2017, a ChemChina adquiriu a Syngenta por US$ 43 bilhões, formando o Syngenta Group." },
  { question:"O que é o Cropwise da Syngenta?", options:["Uma linha de sementes transgênicas","Uma plataforma digital de agricultura de precisão","Um programa de treinamento para agrônomos","Um tipo de fertilizante foliar"], correct:1, explanation:"Cropwise é a plataforma digital da Syngenta que integra dados de campo, satélite e clima para decisões agrícolas." },
  { question:"Qual destas culturas NÃO é foco principal da Syngenta no Brasil?", options:["Soja","Cana-de-açúcar","Café","Milho"], correct:2, explanation:"Soja, milho e cana-de-açúcar são os principais focos no Brasil. Café não é um mercado prioritário." },
  { question:"Qual é o nome do nematicida biológico da Syngenta para o mercado brasileiro?", options:["Fortenza","Clariva","Cruiser","Avicta"], correct:1, explanation:"Clariva é o nematicida biológico da Syngenta baseado em Pasteuria nishizawae, usado principalmente em soja." },
  { question:"Em quantos países aproximadamente a Syngenta opera no mundo?", options:["Mais de 50","Mais de 90","Mais de 150","Menos de 40"], correct:1, explanation:"A Syngenta opera em mais de 90 países, sendo uma das maiores empresas de proteção de cultivos e sementes." },
  { question:"O que é o Plenus da Syngenta?", options:["Um herbicida para pastagens","Um programa de benefícios e relacionamento com o produtor","Uma variedade de milho híbrido","Um software de gestão de fazenda"], correct:1, explanation:"Plenus é o programa de relacionamento da Syngenta que oferece benefícios exclusivos aos produtores rurais." },
  { question:"Qual tecnologia de tratamento de sementes da Syngenta é líder de mercado no Brasil?", options:["Poncho","Cruiser","Gaucho","Maxim"], correct:1, explanation:"Cruiser é a marca líder da Syngenta em tratamento de sementes, protegendo contra pragas iniciais." },
  { question:"A Syngenta é um dos líderes mundiais em qual segmento?", options:["Máquinas agrícolas","Proteção de cultivos e sementes","Fertilizantes minerais","Logística de grãos"], correct:1, explanation:"A Syngenta é uma das maiores empresas globais em proteção de cultivos (defensivos agrícolas) e sementes." },
  { question:"O que é o Victrato da Syngenta?", options:["Um fungicida para ferrugem","Um nematicida químico","Um herbicida dessecante","Um inseticida para percevejos"], correct:1, explanation:"Victrato é o nematicida químico da Syngenta com ciclobutrifluram, para controle de nematoides em diversas culturas." },
  { question:"Qual a principal praga combatida pelo Engeo Pleno S da Syngenta?", options:["Nematoides","Lagartas e percevejos","Plantas daninhas","Fungos de solo"], correct:1, explanation:"Engeo Pleno S é um inseticida de amplo espectro usado no controle de lagartas e percevejos em soja e outras culturas." },
];

const TOTAL_QUESTIONS = 10;
const TIME_PER_QUESTION = 15;
const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
const pickQuestions = () => {
  const pool = shuffle(ALL_QUESTIONS).slice(0, TOTAL_QUESTIONS);
  return pool.map((q) => {
    const tagged = q.options.map((o, i) => ({ text: o, orig: i }));
    const shuf = shuffle(tagged);
    return { ...q, options: shuf.map(o => o.text), correct: shuf.findIndex(o => o.orig === q.correct) };
  });
};
const getMultiplier = (s) => s >= 5 ? 3 : s >= 3 ? 2 : s >= 2 ? 1.5 : 1;
const getResultMsg = (n) => {
  if (n === 10) return { title:"Você sabe mais que o próprio CEO!", sub:"Perfeito absoluto. Honestamente, o que você está fazendo aqui? Vai lá dirigir a empresa.", emoji:"🌟", color:"#FFD700" };
  if (n >= 8)  return { title:"O RH quer te contratar agora!", sub:"Conhecimento de dar inveja em gerente sênior. Impressionante de verdade.", emoji:"🏆", color:"#00A651" };
  if (n >= 6)  return { title:"Não é ruim… mas dá pra melhorar.", sub:"Você claramente leu pelo menos a primeira página do catálogo. Continue assim.", emoji:"😎", color:"#60A5FA" };
  if (n >= 4)  return { title:"Você passou… por pouco.", sub:"Deu pra sentir que você chutou algumas. A soja te viu e ficou preocupada.", emoji:"🌱", color:"#FFA500" };
  if (n >= 1)  return { title:"Nem o estagiário errou tanto!", sub:"Com 1 semana de empresa o estagiário já sabe mais. Mas tudo bem, a jornada começa agora!", emoji:"😅", color:"#E53E3E" };
  return { title:"Você zerou… do lado errado.", sub:"Zero acertos. ZERO. Nem o nome da empresa você sabia? Vamos começar do básico.", emoji:"🥴", color:"#A78BFA" };
};
const MOTIV = ["Excelente!","Mandou bem!","Perfeito!","Arrasou!","Show!","Incrível!","Isso aí!"];

// ─── Mascot SVG ───────────────────────────────────────────────────────────────
// mood: idle | happy | wrong | thinking | celebrate
const Mascot = ({ mood = "idle", size = 120 }) => {
  const eyeY = mood === "wrong" ? 68 : 65;
  const mouthPath = mood === "happy" || mood === "celebrate"
    ? "M 38 85 Q 50 98 62 85"
    : mood === "wrong"
    ? "M 38 92 Q 50 83 62 92"
    : "M 40 87 Q 50 91 60 87";

  const leftPupilX = mood === "thinking" ? 43 : 44;
  const rightPupilX = mood === "thinking" ? 59 : 58;

  const armLAngle = mood === "celebrate" ? -40 : mood === "happy" ? -20 : 10;
  const armRAngle = mood === "celebrate" ? 40 : mood === "happy" ? 20 : -10;
  const bodyBounce = mood === "celebrate" || mood === "happy" ? -4 : 0;
  const eyebrowMood = mood === "wrong" ? 1 : mood === "thinking" ? -3 : 0;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 130"
      style={{
        filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.4))",
        overflow: "visible",
      }}
    >
      {/* Shadow */}
      <ellipse cx="50" cy="128" rx="22" ry="5" fill="rgba(0,0,0,0.25)" />

      {/* Legs */}
      <rect x="37" y={106 + bodyBounce} width="10" height="18" rx="5" fill="#006838" />
      <rect x="53" y={106 + bodyBounce} width="10" height="18" rx="5" fill="#006838" />
      {/* Feet */}
      <ellipse cx="42" cy={124 + bodyBounce} rx="7" ry="4" fill="#004d28" />
      <ellipse cx="58" cy={124 + bodyBounce} rx="7" ry="4" fill="#004d28" />

      {/* Body */}
      <rect x="28" y={72 + bodyBounce} width="44" height="38" rx="14" fill="#00A651" />

      {/* Belt */}
      <rect x="28" y={95 + bodyBounce} width="44" height="6" rx="3" fill="#006838" />
      <rect x="46" y={93 + bodyBounce} width="8" height="10" rx="3" fill="#FFD700" />

      {/* Left Arm */}
      <g transform={`rotate(${armLAngle}, 28, ${82 + bodyBounce})`}>
        <rect x="14" y={78 + bodyBounce} width="16" height="9" rx="4.5" fill="#00A651" />
        <circle cx="14" cy={82 + bodyBounce} r="6" fill="#a8d5a2" />
      </g>

      {/* Right Arm */}
      <g transform={`rotate(${armRAngle}, 72, ${82 + bodyBounce})`}>
        <rect x="70" y={78 + bodyBounce} width="16" height="9" rx="4.5" fill="#00A651" />
        <circle cx="86" cy={82 + bodyBounce} r="6" fill="#a8d5a2" />
      </g>

      {/* Neck */}
      <rect x="42" y={62 + bodyBounce} width="16" height="12" rx="6" fill="#a8d5a2" />

      {/* Head */}
      <circle cx="50" cy={50 + bodyBounce} r="28" fill="#c8e6c0" />

      {/* Hat / leaf crown */}
      <ellipse cx="50" cy={23 + bodyBounce} rx="24" ry="6" fill="#006838" />
      <ellipse cx="50" cy={22 + bodyBounce} rx="18" ry="5" fill="#00A651" />
      {/* Leaf on hat */}
      <path d={`M50,${14 + bodyBounce} C44,${6 + bodyBounce} 56,${4 + bodyBounce} 50,${14 + bodyBounce}`} fill="#00C86A" />
      <path d={`M50,${14 + bodyBounce} C44,${6 + bodyBounce} 56,${4 + bodyBounce} 50,${14 + bodyBounce}`} fill="none" stroke="#006838" strokeWidth="0.5" />

      {/* Cheeks */}
      <ellipse cx="32" cy={57 + bodyBounce} rx="5" ry="3.5" fill="rgba(255,150,150,0.4)" />
      <ellipse cx="68" cy={57 + bodyBounce} rx="5" ry="3.5" fill="rgba(255,150,150,0.4)" />

      {/* Eyebrows */}
      <path d={`M38,${53 + bodyBounce + eyebrowMood} Q44,${50 + bodyBounce + eyebrowMood} 48,${53 + bodyBounce + eyebrowMood}`} stroke="#4a7c3f" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d={`M52,${53 + bodyBounce + eyebrowMood} Q56,${50 + bodyBounce + eyebrowMood} 62,${53 + bodyBounce + eyebrowMood}`} stroke="#4a7c3f" strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* Eyes */}
      <circle cx="44" cy={eyeY + bodyBounce} r="6" fill="white" />
      <circle cx="56" cy={eyeY + bodyBounce} r="6" fill="white" />
      <circle cx={leftPupilX} cy={eyeY + 1 + bodyBounce} r="3.5" fill="#2d4a26" />
      <circle cx={rightPupilX} cy={eyeY + 1 + bodyBounce} r="3.5" fill="#2d4a26" />
      {/* Pupils shine */}
      <circle cx={leftPupilX + 1} cy={eyeY - 1 + bodyBounce} r="1.2" fill="white" />
      <circle cx={rightPupilX + 1} cy={eyeY - 1 + bodyBounce} r="1.2" fill="white" />

      {/* Mouth */}
      <path d={mouthPath.replace(/(\d+)/g, (m, n, o) => {
        // offset y values by bodyBounce
        if (o > 0 && mouthPath[o-1] === ' ') return String(parseInt(n) + bodyBounce);
        return n;
      })} stroke="#4a7c3f" strokeWidth="2.5" fill="none" strokeLinecap="round" />

      {/* Thinking bubble */}
      {mood === "thinking" && (
        <>
          <circle cx="72" cy={44 + bodyBounce} r="3" fill="rgba(255,255,255,0.7)" />
          <circle cx="79" cy={36 + bodyBounce} r="5" fill="rgba(255,255,255,0.7)" />
          <circle cx="88" cy={26 + bodyBounce} r="8" fill="rgba(255,255,255,0.85)" />
          <text x="88" y={30 + bodyBounce} textAnchor="middle" fontSize="9" fill="#333">?</text>
        </>
      )}

      {/* Stars for celebrate */}
      {(mood === "celebrate" || mood === "happy") && (
        <>
          <text x="10" y={38 + bodyBounce} fontSize="14" style={{ animation: "starFloat 0.6s ease infinite alternate" }}>⭐</text>
          <text x="78" y={32 + bodyBounce} fontSize="12" style={{ animation: "starFloat 0.6s ease 0.2s infinite alternate" }}>✨</text>
          <text x="5"  y={60 + bodyBounce} fontSize="10">🌟</text>
        </>
      )}
    </svg>
  );
};

// ─── Confetti ─────────────────────────────────────────────────────────────────
const Confetti = () => {
  const colors = ["#00A651","#FFD700","#FFFFFF","#006838","#00C86A","#FFA500","#FF6B6B"];
  const pieces = Array.from({ length: 70 }, (_, i) => ({
    id: i,
    color: colors[i % colors.length],
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 1.5}s`,
    duration: `${1.8 + Math.random() * 2}s`,
    size: `${6 + Math.random() * 9}px`,
  }));
  return (
    <div style={{ position:"fixed", inset:0, pointerEvents:"none", overflow:"hidden", zIndex:50 }}>
      {pieces.map(p => (
        <div key={p.id} style={{
          position:"absolute", left:p.left, top:"-12px",
          width:p.size, height:p.size,
          backgroundColor:p.color,
          borderRadius: Math.random() > 0.5 ? "50%" : "2px",
          animation:`confettiFall ${p.duration} ${p.delay} ease-in forwards`,
        }} />
      ))}
    </div>
  );
};


// ─── Score Pop ────────────────────────────────────────────────────────────────
const ScorePop = ({ value, x, y }) => (
  <div style={{
    position:"fixed", left:x, top:y, pointerEvents:"none", zIndex:100,
    color:"#FFD700", fontWeight:"900", fontSize:"24px",
    textShadow:"0 2px 8px rgba(0,0,0,0.7)",
    animation:"scorePop 1s ease-out forwards",
    whiteSpace:"nowrap",
  }}>
    +{value}
  </div>
);

// ─── Speech Bubble ────────────────────────────────────────────────────────────
const SpeechBubble = ({ text, color = "#00A651", visible }) => (
  <div style={{
    position:"absolute", top:"-10px", left:"50%",
    transform:"translateX(-50%) translateY(-100%)",
    background: color === "#E53E3E" ? "linear-gradient(135deg,#E53E3E,#c53030)" : "linear-gradient(135deg,#00A651,#006838)",
    color:"#fff", fontWeight:"800", fontSize:"15px",
    padding:"10px 18px", borderRadius:"20px",
    whiteSpace:"nowrap", zIndex:10,
    boxShadow:`0 4px 16px ${color}66`,
    opacity: visible ? 1 : 0,
    transform: visible
      ? "translateX(-50%) translateY(-100%) scale(1)"
      : "translateX(-50%) translateY(-100%) scale(0.5)",
    transition:"all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
    pointerEvents:"none",
  }}>
    {text}
    {/* Tail */}
    <div style={{
      position:"absolute", bottom:"-8px", left:"50%",
      transform:"translateX(-50%)",
      width:0, height:0,
      borderLeft:"8px solid transparent",
      borderRight:"8px solid transparent",
      borderTop:`8px solid ${color === "#E53E3E" ? "#c53030" : "#006838"}`,
    }} />
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SyngentaTriviaGame() {
  const [gameState,       setGameState]       = useState("start");
  const [currentQ,        setCurrentQ]        = useState(0);
  const [score,           setScore]           = useState(0);
  const [displayScore,    setDisplayScore]    = useState(0);
  const [streak,          setStreak]          = useState(0);
  const [bestStreak,      setBestStreak]      = useState(0);
  const [answers,         setAnswers]         = useState([]);
  const [timeLeft,        setTimeLeft]        = useState(TIME_PER_QUESTION);
  const [questions,       setQuestions]       = useState([]);
  const [selectedAnswer,  setSelectedAnswer]  = useState(null);
  const [isCorrect,       setIsCorrect]       = useState(null);
  const [motivational,    setMotivational]    = useState("");
  const [showConfetti,    setShowConfetti]    = useState(false);
  const [scorePops,       setScorePops]       = useState([]);
  const [muted,           setMuted]           = useState(false);
  const [mascotMood,      setMascotMood]      = useState("idle");
  const [bubbleText,      setBubbleText]      = useState("");
  const [bubbleVisible,   setBubbleVisible]   = useState(false);
  const [bubbleColor,     setBubbleColor]     = useState("#00A651");
  const [optionsIn,       setOptionsIn]       = useState(true);
  const [questionIn,      setQuestionIn]      = useState(true);
  const [mascotBounce,    setMascotBounce]    = useState(false);

  const audioCtxRef  = useRef(null);
  const timerRef     = useRef(null);
  const bgLoopRef    = useRef(null);
  const sparkleIdRef = useRef(0);
  const startTimeRef = useRef(null);

  const getCtx = useCallback(() => {
    if (!audioCtxRef.current) audioCtxRef.current = createAudioContext();
    if (audioCtxRef.current?.state === "suspended") audioCtxRef.current.resume();
    return audioCtxRef.current;
  }, []);

  const play = useCallback((name) => {
    if (muted) return;
    const ctx = getCtx();
    if (ctx && sounds[name]) sounds[name](ctx);
  }, [muted, getCtx]);

  // Score count-up
  useEffect(() => {
    if (score === displayScore) return;
    const diff = score - displayScore;
    const step = Math.ceil(Math.abs(diff) / 12);
    const t = setTimeout(() => setDisplayScore(p => Math.min(p + step, score)), 30);
    return () => clearTimeout(t);
  }, [score, displayScore]);

  // BG music
  useEffect(() => {
    if (muted || gameState !== "playing") { clearInterval(bgLoopRef.current); return; }
    bgLoopRef.current = setInterval(() => {
      if (audioCtxRef.current) sounds.bgNote(audioCtxRef.current);
    }, 2600);
    return () => clearInterval(bgLoopRef.current);
  }, [muted, gameState]);

  // Mascot idle animation
  useEffect(() => {
    if (gameState !== "playing") return;
    const t = setInterval(() => {
      if (mascotMood === "idle") {
        setMascotBounce(b => !b);
      }
    }, 2000);
    return () => clearInterval(t);
  }, [gameState, mascotMood]);

  const showBubble = useCallback((text, color = "#00A651", duration = 1800) => {
    setBubbleText(text);
    setBubbleColor(color);
    setBubbleVisible(true);
    setTimeout(() => setBubbleVisible(false), duration);
  }, []);

  // Timer
  useEffect(() => {
    if (gameState !== "playing") return;
    startTimeRef.current = Date.now();
    setMascotMood("thinking");
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); handleTimeout(); return 0; }
        if (prev <= 6) play("tick");
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [gameState, currentQ]); // eslint-disable-line

  const handleTimeout = useCallback(() => {
    const q = questions[currentQ];
    if (!q) return;
    play("wrong");
    setMascotMood("wrong");
    showBubble("Tempo esgotado!", "#E53E3E", 2000);
    setSelectedAnswer(-1);
    setIsCorrect(false);
    setStreak(0);
    setAnswers(prev => [...prev, { questionIndex: currentQ, selectedAnswer: -1, correct: false, timeSpent: TIME_PER_QUESTION }]);
    setGameState("feedback");
  }, [questions, currentQ, play, showBubble]);

  const handleAnswer = useCallback((index, event) => {
    if (gameState !== "playing") return;
    clearInterval(timerRef.current);
    const q = questions[currentQ];
    const timeSpent = Math.min(TIME_PER_QUESTION, (Date.now() - (startTimeRef.current || Date.now())) / 1000);
    const correct = index === q.correct;
    const mult = getMultiplier(streak);

    setSelectedAnswer(index);
    setIsCorrect(correct);

    if (correct) {
      const speedBonus = Math.round(Math.max(0, (TIME_PER_QUESTION - timeSpent) / TIME_PER_QUESTION) * 50);
      const pts = Math.round((100 + speedBonus) * mult);
      const newStreak = streak + 1;
      setScore(p => p + pts);
      setStreak(newStreak);
      setBestStreak(p => Math.max(p, newStreak));
      const motiv = MOTIV[Math.floor(Math.random() * MOTIV.length)];
      setMotivational(motiv);

      if (newStreak >= 2) { play("combo"); setMascotMood("celebrate"); }
      else { play("correct"); setMascotMood("happy"); }

      showBubble(newStreak >= 3 ? `🔥 COMBO x${mult.toFixed(mult % 1 ? 1 : 0)}!` : motiv, "#00A651");

      if (event) {
        const rect = event.currentTarget.getBoundingClientRect();
        const id = sparkleIdRef.current++;
        setScorePops(p => [...p, { id, value: pts, x: rect.left + rect.width / 2, y: rect.top - 10 }]);
        setTimeout(() => setScorePops(p => p.filter(s => s.id !== id)), 1200);
      }
    } else {
      setStreak(0);
      play("wrong");
      setMascotMood("wrong");
      showBubble("Quase lá! 💪", "#E53E3E");
    }

    setAnswers(prev => [...prev, { questionIndex: currentQ, selectedAnswer: index, correct, timeSpent }]);
    setGameState("feedback");
  }, [gameState, questions, currentQ, streak, play, showBubble]);

  const nextQuestion = useCallback(() => {
    const next = currentQ + 1;
    if (next >= TOTAL_QUESTIONS) {
      play("finish");
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
      setMascotMood("celebrate");
      setGameState("result");
      return;
    }
    setQuestionIn(false);
    setOptionsIn(false);
    setTimeout(() => {
      setCurrentQ(next);
      setSelectedAnswer(null);
      setIsCorrect(null);
      setMotivational("");
      setTimeLeft(TIME_PER_QUESTION);
      setMascotMood("idle");
      setGameState("playing");
      setTimeout(() => { setQuestionIn(true); setOptionsIn(true); }, 50);
    }, 280);
  }, [currentQ, play]);

  const startGame = useCallback(() => {
    getCtx();
    setQuestions(pickQuestions());
    setCurrentQ(0); setScore(0); setDisplayScore(0); setStreak(0); setBestStreak(0);
    setAnswers([]); setTimeLeft(TIME_PER_QUESTION);
    setSelectedAnswer(null); setIsCorrect(null); setMotivational("");
    setQuestionIn(true); setOptionsIn(true);
    setMascotMood("idle"); setBubbleVisible(false);
    setGameState("playing");
  }, [getCtx]);

  const q = questions[currentQ];
  const correctCount = answers.filter(a => a.correct).length;
  const accuracy = answers.length > 0 ? Math.round((correctCount / answers.length) * 100) : 0;
  const avgTime = answers.length > 0 ? (answers.reduce((s, a) => s + a.timeSpent, 0) / answers.length).toFixed(1) : 0;
  const timerPct = (timeLeft / TIME_PER_QUESTION) * 100;
  const timerColor = timeLeft > 8 ? "#00A651" : timeLeft > 4 ? "#FFD700" : "#E53E3E";
  const result = getResultMsg(correctCount);

  const btnStyle = (index) => {
    if (gameState !== "feedback") return {};
    if (index === q?.correct) return {
      background: "linear-gradient(135deg,#00A651,#006838)",
      borderColor: "#00A651", color: "#fff",
      transform: "scale(1.02)",
      boxShadow: "0 0 24px rgba(0,166,81,0.6)",
    };
    if (index === selectedAnswer && !isCorrect) return {
      background: "linear-gradient(135deg,#E53E3E,#c53030)",
      borderColor: "#E53E3E", color: "#fff",
      animation: "shake 0.4s ease",
    };
    return { opacity: 0.35 };
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg,#001a0d 0%,#002d14 40%,#001008 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Segoe UI',system-ui,-apple-system,sans-serif",
      padding: "20px", position: "relative", overflow: "hidden",
    }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}
        @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeDown{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(-20px)}}
        @keyframes staggerIn{from{opacity:0;transform:translateX(-18px)}to{opacity:1;transform:translateX(0)}}
        @keyframes glowPulse{0%,100%{box-shadow:0 0 12px rgba(0,166,81,0.4)}50%{box-shadow:0 0 30px rgba(0,166,81,0.8)}}
        @keyframes mascotBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes mascotWrong{0%,100%{transform:rotate(0)}25%{transform:rotate(-8deg)}75%{transform:rotate(8deg)}}
        @keyframes mascotCelebrate{0%,100%{transform:translateY(0) scale(1)}30%{transform:translateY(-16px) scale(1.1)}60%{transform:translateY(-8px) scale(1.05)}}
        @keyframes confettiFall{0%{transform:translateY(0) rotate(0);opacity:1}100%{transform:translateY(110vh) rotate(540deg);opacity:0}}
        @keyframes floatUp{0%{transform:translateY(0) rotate(0);opacity:var(--op)}50%{transform:translateY(-40vh) rotate(15deg)}100%{transform:translateY(-100vh) rotate(-10deg);opacity:0}}
        @keyframes scorePop{0%{transform:translateY(0) scale(0.6);opacity:1}60%{transform:translateY(-50px) scale(1.2);opacity:1}100%{transform:translateY(-90px) scale(0.8);opacity:0}}
        @keyframes starFloat{from{transform:scale(1) rotate(-10deg)}to{transform:scale(1.3) rotate(10deg)}}
        @keyframes cardIn{from{opacity:0;transform:translateY(28px) scale(0.92)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes logoIn{from{opacity:0;transform:scale(0.7)}to{opacity:1;transform:scale(1)}}
        @keyframes timerPulse{0%,100%{opacity:1}50%{opacity:0.5}}
      `}</style>

      {showConfetti && <Confetti />}
      {scorePops.map(s => <ScorePop key={s.id} value={s.value} x={s.x} y={s.y} />)}

      <div style={{ width:"100%", maxWidth:"460px", position:"relative", zIndex:1 }}>

        {/* Mute */}
        {gameState !== "start" && (
          <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:"10px" }}>
            <button onClick={() => setMuted(m => !m)} style={{
              background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)",
              borderRadius:"50%", width:"38px", height:"38px",
              cursor:"pointer", color:"#fff", fontSize:"17px",
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>
              {muted ? "🔇" : "🔊"}
            </button>
          </div>
        )}

        {/* ══ START ══ */}
        {gameState === "start" && (
          <div style={{ textAlign:"center", animation:"fadeUp 0.7s ease" }}>
            {/* Logo */}
            <div style={{ animation:"logoIn 0.6s ease", marginBottom:"20px" }}>
              <div style={{
                display:"inline-flex", alignItems:"center", justifyContent:"center",
                background:"linear-gradient(135deg,#00A651,#006838)",
                borderRadius:"18px", padding:"14px 26px",
                boxShadow:"0 8px 32px rgba(0,166,81,0.45)", marginBottom:"6px",
              }}>
                <span style={{ color:"#fff", fontSize:"26px", fontWeight:"900", letterSpacing:"2px" }}>SYNGENTA</span>
              </div>
              <div style={{ color:"rgba(255,255,255,0.4)", fontSize:"11px", letterSpacing:"3px", textTransform:"uppercase" }}>
                Bringing plant potential to life
              </div>
            </div>

            {/* Mascot on start */}
            <div style={{ display:"flex", justifyContent:"center", marginBottom:"16px", animation:"mascotBounce 2.5s ease-in-out infinite" }}>
              <Mascot mood="happy" size={130} />
            </div>

            <h1 style={{ color:"#fff", fontSize:"26px", fontWeight:"900", lineHeight:1.2, marginBottom:"6px" }}>
              Quanto você sabe sobre a{" "}
              <span style={{ color:"#00A651" }}>Syngenta?</span>
            </h1>
            <p style={{ color:"rgba(255,255,255,0.6)", marginBottom:"28px", fontSize:"14px", lineHeight:1.6 }}>
              10 perguntas · 15 segundos cada<br/>Acerte em série e multiplique seus pontos!
            </p>

            {/* Info cards */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"10px", marginBottom:"28px" }}>
              {[{icon:"❓",label:"10",sub:"Perguntas"},{icon:"⏱️",label:"15s",sub:"Por questão"},{icon:"🔥",label:"x3",sub:"Combo máx."}].map(c => (
                <div key={c.label} style={{
                  background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.1)",
                  borderRadius:"14px", padding:"14px 8px", backdropFilter:"blur(10px)",
                }}>
                  <div style={{ fontSize:"22px", marginBottom:"4px" }}>{c.icon}</div>
                  <div style={{ color:"#00A651", fontWeight:"900", fontSize:"20px" }}>{c.label}</div>
                  <div style={{ color:"rgba(255,255,255,0.5)", fontSize:"11px" }}>{c.sub}</div>
                </div>
              ))}
            </div>

            <button onClick={startGame} style={{
              width:"100%", padding:"18px",
              background:"linear-gradient(135deg,#00A651,#006838)",
              border:"none", borderRadius:"16px", color:"#fff",
              fontSize:"18px", fontWeight:"800", cursor:"pointer",
              letterSpacing:"1px", animation:"glowPulse 2s ease-in-out infinite",
              boxShadow:"0 8px 24px rgba(0,166,81,0.4)",
            }}
              onMouseDown={e => e.currentTarget.style.transform="scale(0.97)"}
              onMouseUp={e => e.currentTarget.style.transform="scale(1)"}
            >
              🌱 COMEÇAR QUIZ
            </button>
          </div>
        )}

        {/* ══ PLAYING / FEEDBACK ══ */}
        {(gameState === "playing" || gameState === "feedback") && q && (
          <div>
            {/* Header */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"10px" }}>
              <div style={{ color:"rgba(255,255,255,0.7)", fontSize:"14px", fontWeight:"700" }}>
                {currentQ + 1}<span style={{ color:"rgba(255,255,255,0.3)" }}>/{TOTAL_QUESTIONS}</span>
              </div>
              <div style={{
                background:"rgba(255,215,0,0.15)", border:"1px solid rgba(255,215,0,0.3)",
                borderRadius:"20px", padding:"4px 14px",
                color:"#FFD700", fontWeight:"900", fontSize:"16px",
              }}>
                ⭐ {displayScore.toLocaleString("pt-BR")}
              </div>
              <div style={{
                background: streak >= 2 ? "linear-gradient(135deg,#FF6B35,#E53E3E)" : "rgba(255,255,255,0.08)",
                border:`1px solid ${streak >= 2 ? "#FF6B35" : "rgba(255,255,255,0.12)"}`,
                borderRadius:"20px", padding:"4px 12px",
                color:"#fff", fontWeight:"800", fontSize:"13px",
                boxShadow: streak >= 2 ? "0 0 14px rgba(255,107,53,0.5)" : "none",
                transition:"all 0.3s",
              }}>
                🔥 {streak > 0 ? `x${getMultiplier(streak).toFixed(getMultiplier(streak) % 1 ? 1 : 0)}` : "streak"}
              </div>
            </div>

            {/* Progress bars */}
            <div style={{ height:"4px", background:"rgba(255,255,255,0.08)", borderRadius:"2px", marginBottom:"8px", overflow:"hidden" }}>
              <div style={{
                height:"100%", borderRadius:"2px",
                width:`${((currentQ + (gameState==="feedback"?1:0)) / TOTAL_QUESTIONS)*100}%`,
                background:"linear-gradient(90deg,#00A651,#00C86A)", transition:"width 0.4s ease",
              }} />
            </div>
            <div style={{ height:"7px", background:"rgba(255,255,255,0.08)", borderRadius:"3.5px", marginBottom:"18px", overflow:"hidden" }}>
              <div style={{
                height:"100%", borderRadius:"3.5px",
                width:`${timerPct}%`,
                background:`linear-gradient(90deg,${timerColor},${timerColor}bb)`,
                boxShadow:`0 0 8px ${timerColor}88`,
                transition:"width 1s linear, background 0.3s ease",
              }} />
            </div>

            {/* Layout: mascot + question */}
            <div style={{ display:"flex", gap:"16px", alignItems:"flex-start", marginBottom:"16px" }}>
              {/* Mascot column */}
              <div style={{ position:"relative", flexShrink:0, width:"110px", textAlign:"center" }}>
                <SpeechBubble text={bubbleText} color={bubbleColor} visible={bubbleVisible} />
                <div style={{
                  animation:
                    mascotMood === "celebrate" ? "mascotCelebrate 0.6s ease" :
                    mascotMood === "happy"     ? "mascotBounce 0.5s ease" :
                    mascotMood === "wrong"     ? "mascotWrong 0.5s ease" :
                    mascotBounce               ? "mascotBounce 1.2s ease-in-out" :
                    "none",
                }}>
                  <Mascot mood={mascotMood} size={110} />
                </div>
                <div style={{
                  color: timerColor, fontWeight:"900", fontSize:"22px",
                  transition:"color 0.3s",
                  animation: timeLeft <= 5 ? "timerPulse 0.8s ease infinite" : "none",
                }}>
                  {timeLeft}s
                </div>
              </div>

              {/* Question */}
              <div style={{
                flex:1,
                background:"rgba(255,255,255,0.06)",
                border:"1px solid rgba(255,255,255,0.1)",
                borderRadius:"18px", padding:"18px 16px",
                backdropFilter:"blur(10px)",
                minHeight:"100px", display:"flex", alignItems:"center",
                animation: questionIn ? "fadeUp 0.35s ease" : "fadeDown 0.28s ease",
              }}>
                <p style={{ color:"#fff", fontSize:"16px", fontWeight:"700", lineHeight:1.5 }}>
                  {q.question}
                </p>
              </div>
            </div>

            {/* Options */}
            <div style={{ display:"flex", flexDirection:"column", gap:"9px" }}>
              {q.options.map((opt, i) => (
                <button key={i}
                  onClick={e => handleAnswer(i, e)}
                  disabled={gameState === "feedback"}
                  style={{
                    padding:"13px 16px",
                    background:"rgba(255,255,255,0.07)",
                    border:"1.5px solid rgba(255,255,255,0.14)",
                    borderRadius:"13px", color:"#fff",
                    fontSize:"15px", fontWeight:"600", textAlign:"left",
                    cursor: gameState === "playing" ? "pointer" : "default",
                    backdropFilter:"blur(8px)",
                    transition:"all 0.22s ease",
                    animation: optionsIn ? `staggerIn 0.35s ease ${i*0.07}s both` : "none",
                    display:"flex", alignItems:"center", gap:"12px",
                    ...btnStyle(i),
                  }}
                  onMouseEnter={e => { if (gameState==="playing") { e.currentTarget.style.background="rgba(0,166,81,0.2)"; e.currentTarget.style.borderColor="#00A651"; e.currentTarget.style.transform="translateX(5px)"; }}}
                  onMouseLeave={e => { if (gameState==="playing") { e.currentTarget.style.background="rgba(255,255,255,0.07)"; e.currentTarget.style.borderColor="rgba(255,255,255,0.14)"; e.currentTarget.style.transform="translateX(0)"; }}}
                >
                  <span style={{
                    minWidth:"28px", height:"28px", borderRadius:"50%",
                    background:"rgba(255,255,255,0.1)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:"13px", fontWeight:"800", flexShrink:0,
                  }}>
                    {["A","B","C","D"][i]}
                  </span>
                  {opt}
                </button>
              ))}
            </div>

            {/* Feedback panel */}
            {gameState === "feedback" && (
              <div style={{
                marginTop:"14px", padding:"16px", borderRadius:"16px",
                background: isCorrect
                  ? "linear-gradient(135deg,rgba(0,166,81,0.22),rgba(0,166,81,0.08))"
                  : "linear-gradient(135deg,rgba(229,62,62,0.22),rgba(229,62,62,0.08))",
                border:`1.5px solid ${isCorrect ? "rgba(0,166,81,0.45)" : "rgba(229,62,62,0.45)"}`,
                animation:"fadeUp 0.3s ease",
              }}>
                {isCorrect ? (
                  <>
                    <p style={{ color:"#00A651", fontWeight:"800", fontSize:"17px", marginBottom:"5px" }}>✅ {motivational}</p>
                    <p style={{ color:"rgba(255,255,255,0.65)", fontSize:"13px" }}>Resposta certa! Continue assim.</p>
                  </>
                ) : (
                  <>
                    <p style={{ color:"#E53E3E", fontWeight:"800", fontSize:"16px", marginBottom:"5px" }}>
                      ❌ {selectedAnswer === -1 ? "Tempo esgotado!" : "Não foi dessa vez"}
                    </p>
                    <p style={{ color:"rgba(255,255,255,0.8)", fontSize:"13px", lineHeight:1.5 }}>
                      💡 {q.explanation}
                    </p>
                  </>
                )}
                <button onClick={nextQuestion} style={{
                  marginTop:"12px", width:"100%", padding:"14px",
                  background:"linear-gradient(135deg,#00A651,#006838)",
                  border:"none", borderRadius:"12px", color:"#fff",
                  fontSize:"16px", fontWeight:"800", cursor:"pointer",
                  animation:"pulse 1.5s ease-in-out infinite",
                }}>
                  {currentQ + 1 >= TOTAL_QUESTIONS ? "Ver Resultado →" : "Continuar →"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ══ RESULT ══ */}
        {gameState === "result" && (
          <div style={{ textAlign:"center", animation:"fadeUp 0.6s ease", padding:"8px 0 20px" }}>

            {/* Mascot celebrating */}
            <div style={{
              display:"flex", justifyContent:"center", marginBottom:"12px",
              animation:"mascotCelebrate 0.8s ease",
            }}>
              <Mascot mood="celebrate" size={140} />
            </div>

            <div style={{ fontSize:"44px", marginBottom:"6px" }}>{result.emoji}</div>
            <h2 style={{ color:"#fff", fontSize:"24px", fontWeight:"900", marginBottom:"4px", lineHeight:1.2 }}>
              {result.title}
            </h2>
            <p style={{ color:"rgba(255,255,255,0.6)", fontSize:"14px", marginBottom:"24px" }}>
              {result.sub}
            </p>

            {/* Metric cards */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"10px", marginBottom:"16px" }}>
              {[
                { icon:"⭐", label:"PONTUAÇÃO", value:displayScore.toLocaleString("pt-BR"), color:"#FFD700", bg:"rgba(255,215,0,0.1)", border:"rgba(255,215,0,0.3)", delay:"0s" },
                { icon:"🎯", label:"PRECISÃO",  value:`${accuracy}%`,                         color:"#00A651", bg:"rgba(0,166,81,0.1)", border:"rgba(0,166,81,0.3)", delay:"0.1s" },
                { icon:"⚡", label:"TEMPO MÉD.", value:`${avgTime}s`,                         color:"#60A5FA", bg:"rgba(96,165,250,0.1)", border:"rgba(96,165,250,0.3)", delay:"0.2s" },
              ].map(c => (
                <div key={c.label} style={{
                  background:c.bg, border:`1.5px solid ${c.border}`,
                  borderRadius:"16px", padding:"16px 6px",
                  animation:`cardIn 0.5s ease ${c.delay} both`,
                }}>
                  <div style={{ fontSize:"22px", marginBottom:"5px" }}>{c.icon}</div>
                  <div style={{ color:c.color, fontWeight:"900", fontSize:"18px", marginBottom:"3px" }}>{c.value}</div>
                  <div style={{ color:"rgba(255,255,255,0.45)", fontSize:"9px", fontWeight:"700", letterSpacing:"0.5px" }}>{c.label}</div>
                </div>
              ))}
            </div>

            {/* Best streak */}
            <div style={{
              background:"rgba(255,107,53,0.1)", border:"1.5px solid rgba(255,107,53,0.3)",
              borderRadius:"14px", padding:"12px 16px", marginBottom:"20px",
              display:"flex", alignItems:"center", justifyContent:"space-between",
            }}>
              <span style={{ fontSize:"22px" }}>🔥</span>
              <div style={{ textAlign:"left" }}>
                <span style={{ color:"#FF6B35", fontWeight:"900", fontSize:"20px" }}>{bestStreak}</span>
                <span style={{ color:"rgba(255,255,255,0.55)", fontSize:"12px", marginLeft:"6px" }}>melhor sequência</span>
              </div>
              <div style={{ color:"rgba(255,255,255,0.45)", fontSize:"13px" }}>{correctCount}/{TOTAL_QUESTIONS} acertos</div>
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
              <button onClick={startGame} style={{
                width:"100%", padding:"16px",
                background:"linear-gradient(135deg,#00A651,#006838)",
                border:"none", borderRadius:"14px", color:"#fff",
                fontSize:"17px", fontWeight:"800", cursor:"pointer",
                animation:"glowPulse 2s ease-in-out infinite",
                boxShadow:"0 6px 20px rgba(0,166,81,0.35)",
              }}
                onMouseDown={e => e.currentTarget.style.transform="scale(0.97)"}
                onMouseUp={e => e.currentTarget.style.transform="scale(1)"}
              >
                🔄 Jogar Novamente
              </button>

              <button onClick={() => {
                const msg = `🌱 Eu joguei o Quiz Syngenta!\n\n⭐ Pontuação: ${score.toLocaleString("pt-BR")}\n🎯 Precisão: ${accuracy}%\n✅ Acertos: ${correctCount}/${TOTAL_QUESTIONS}\n🔥 Melhor sequência: ${bestStreak}\n\nQuanto você sabe sobre a Syngenta?`;
                navigator.clipboard?.writeText(msg).then(() => alert("Resultado copiado! Cole onde quiser 📋"));
              }} style={{
                width:"100%", padding:"13px",
                background:"transparent", border:"1.5px solid rgba(255,255,255,0.2)",
                borderRadius:"14px", color:"rgba(255,255,255,0.75)",
                fontSize:"15px", fontWeight:"700", cursor:"pointer",
                transition:"all 0.2s",
              }}
                onMouseEnter={e => { e.currentTarget.style.background="rgba(255,255,255,0.08)"; e.currentTarget.style.borderColor="rgba(255,255,255,0.35)"; }}
                onMouseLeave={e => { e.currentTarget.style.background="transparent"; e.currentTarget.style.borderColor="rgba(255,255,255,0.2)"; }}
              >
                📤 Compartilhar Resultado
              </button>
            </div>

            <div style={{
              marginTop:"20px", paddingTop:"14px",
              borderTop:"1px solid rgba(255,255,255,0.07)",
              color:"rgba(255,255,255,0.25)", fontSize:"10px", letterSpacing:"1.5px",
            }}>
              SYNGENTA · BRINGING PLANT POTENTIAL TO LIFE
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
