import { useState, useRef, useEffect, useCallback } from "react";
import * as Tone from "tone";

const FREE_LIMIT = 3;
const STORAGE_KEY = "emotion-music-count";

// ↓ Remplace par ton lien Stripe
const STRIPE_LINK = "https://buy.stripe.com/00w14g0BP99lcwydDQ2Ji0m";

// Code secret admin — change "MONCODE" par ce que tu veux
const ADMIN_CODE = "demotion360";



const PAL = {
  tristesse: { bg:"#07101d", mid:"#0d2137", accent:"#4a90d9", glow:"74,144,217", text:"#93c5fd", sub:"rgba(74,144,217,0.08)" },
  joie:      { bg:"#110d00", mid:"#241a00", accent:"#f59e0b", glow:"245,158,11", text:"#fde68a", sub:"rgba(245,158,11,0.08)" },
  "colère":  { bg:"#130202", mid:"#2a0606", accent:"#ef4444", glow:"239,68,68",  text:"#fca5a5", sub:"rgba(239,68,68,0.08)" },
  colere:    { bg:"#130202", mid:"#2a0606", accent:"#ef4444", glow:"239,68,68",  text:"#fca5a5", sub:"rgba(239,68,68,0.08)" },
  peur:      { bg:"#080511", mid:"#150f28", accent:"#8b5cf6", glow:"139,92,246", text:"#c4b5fd", sub:"rgba(139,92,246,0.08)" },
  "sérénité":{ bg:"#010e07", mid:"#021a0d", accent:"#10b981", glow:"16,185,129", text:"#6ee7b7", sub:"rgba(16,185,129,0.08)" },
  serenite:  { bg:"#010e07", mid:"#021a0d", accent:"#10b981", glow:"16,185,129", text:"#6ee7b7", sub:"rgba(16,185,129,0.08)" },
  amour:     { bg:"#11020b", mid:"#260618", accent:"#ec4899", glow:"236,72,153", text:"#f9a8d4", sub:"rgba(236,72,153,0.08)" },
  nostalgie: { bg:"#0f0700", mid:"#211200", accent:"#d97706", glow:"217,119,6",  text:"#fcd34d", sub:"rgba(217,119,6,0.08)" },
  neutre:    { bg:"#0b0b14", mid:"#141424", accent:"#818cf8", glow:"129,140,248",text:"#c7d2fe", sub:"rgba(129,140,248,0.08)" },
};

function getCount() {
  try { return parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10); } catch { return 0; }
}
function saveCount(n) {
  try { localStorage.setItem(STORAGE_KEY, String(n)); } catch {}
}

function Paywall({ pal: p }) {
  const btn = {
    background: p.accent, color: p.bg, border:"none", borderRadius:3,
    fontFamily:"Georgia,serif", fontSize:"1rem", letterSpacing:"0.1em",
    padding:"0.75rem 2.5rem", cursor:"pointer", fontWeight:600,
  };
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"1.4rem", maxWidth:420, textAlign:"center" }}>
      <div style={{ fontSize:"2.8rem", lineHeight:1 }}>🎵</div>
      <h2 style={{ fontSize:"1.6rem", fontWeight:300, letterSpacing:"0.04em", margin:0, color:p.text }}>
        Tu as vidé ton quota gratuit
      </h2>
      <p style={{ fontSize:"1.05rem", fontStyle:"italic", opacity:0.75, lineHeight:1.9, margin:0, color:p.text }}>
        Tu as eu droit à {FREE_LIMIT} émotions.<br />
        Il t'en reste encore combien à exprimer ?
      </p>
      <div style={{ background:`rgba(${p.glow},0.06)`, border:`1px solid rgba(${p.glow},0.2)`,
        borderRadius:4, padding:"1.2rem 1.5rem", width:"100%" }}>
        <p style={{ margin:0, fontSize:"0.95rem", color:p.text, opacity:0.8, lineHeight:1.8, fontStyle:"italic" }}>
          Pour 4,99 €/mois, compose autant que tu veux —<br />
          joie, tristesse, rage, amour, et tout ce qu'il y a entre les deux.
        </p>
        <div style={{ borderTop:`1px solid rgba(${p.glow},0.2)`, marginTop:"0.9rem", paddingTop:"0.9rem",
          display:"flex", justifyContent:"center", alignItems:"baseline", gap:"0.4rem" }}>
          <span style={{ color:p.accent, fontSize:"1.6rem", fontWeight:300 }}>4,99 €</span>
          <span style={{ color:p.text, opacity:0.5, fontSize:"0.8rem" }}>/mois</span>
        </div>
      </div>
      <button style={btn} onClick={() => window.open(STRIPE_LINK, "_blank")}>
        Continuer à composer
      </button>
      <p style={{ fontSize:"0.7rem", opacity:0.3, fontFamily:"monospace", letterSpacing:"0.1em", textTransform:"uppercase", margin:0, color:p.text }}>
        Sans engagement · Résiliable à tout moment
      </p>
    </div>
  );
}

export default function App() {
  const [input, setInput]         = useState("");
  const [phase, setPhase]         = useState("input");
  const [music, setMusic]         = useState(null);
  const [pal, setPal]             = useState(PAL.neutre);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [error, setError]         = useState(null);
  const [dots, setDots]           = useState("");
  const [useCount, setUseCount]   = useState(() => getCount());
  const [admin, setAdmin]         = useState(false);

  const canvasRef   = useRef(null);
  const analyzerRef = useRef(null);
  const synthsRef   = useRef(null);
  const animRef     = useRef(null);
  const timerRef    = useRef(null);
  const endRef      = useRef(null);
  const playingRef  = useRef(false);

  useEffect(() => {
    if (phase !== "loading") return;
    const t = setInterval(() => setDots(d => d.length >= 3 ? "" : d + "."), 380);
    return () => clearInterval(t);
  }, [phase]);

  const stopAll = useCallback(() => {
    playingRef.current = false;
    setIsPlaying(false);
    setProgress(0);
    cancelAnimationFrame(animRef.current);
    clearInterval(timerRef.current);
    clearTimeout(endRef.current);
    Tone.Transport.stop();
    Tone.Transport.cancel();
    if (synthsRef.current) {
      synthsRef.current.forEach(n => { try { n.dispose(); } catch(e) {} });
      synthsRef.current = null;
    }
    analyzerRef.current = null;
  }, []);

  useEffect(() => () => stopAll(), [stopAll]);

  const generate = async () => {
    if (!input.trim()) return;

    // Activation mode admin
    if (input.trim() === ADMIN_CODE) {
      setAdmin(true);
      setInput("");
      setError("✓ Mode admin activé — compositions illimitées.");
      return;
    }

    if (useCount >= FREE_LIMIT && !admin) { setPhase("paywall"); return; }
    setPhase("loading");
    setError(null);
    try {
      const res = await fetch("/api/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emotion: input }),
      });
      const parsed = await res.json();
      if (parsed.error) throw new Error(parsed.error);
      const newCount = useCount + 1;
      setUseCount(newCount);
      saveCount(newCount);
      setPal(PAL[parsed.category] || PAL.neutre);
      setMusic(parsed);
      setPhase("ready");
    } catch (e) {
      setError(e.message || "Erreur inconnue");
      setPhase("input");
    }
  };

  const play = async () => {
    if (!music) return;
    stopAll();
    await Tone.start();
    const bpm     = music.bpm || 80;
    const spb     = 60 / bpm;
    const spBar   = spb * 4;
    const totalDur = 8 * spBar;

    const reverb = new Tone.Reverb({ decay: music.reverbDecay || 4, wet: music.reverbWet || 0.65 });
    await reverb.ready;
    reverb.toDestination();

    const analyzer = new Tone.Analyser("waveform", 256);
    reverb.connect(analyzer);
    analyzerRef.current = analyzer;

    const chorus = new Tone.Chorus({ frequency: music.chorusFreq || 1.8, delayTime: music.chorusDelayTime || 3.5, depth: music.chorusDepth || 0.4, wet: 0.5 }).connect(reverb);
    chorus.start();

    const vibrato = new Tone.Vibrato({ frequency: music.vibratoFreq || 5.2, depth: music.vibratoDepth || 0.06, wet: 0.8 }).connect(chorus);

    const pad = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: music.padOsc || "fattriangle", count: music.padCount || 4, spread: music.padDetune || 12 },
      envelope: { attack: music.padAttack || 1.8, decay: 0.3, sustain: 0.85, release: music.padRelease || 5.0 },
      volume: -12,
    }).connect(chorus);

    const mel = new Tone.Synth({
      oscillator: { type: music.melodyOsc || "fatsine", count: music.melodyCount || 3, spread: music.melodyDetune || 8 },
      envelope: { attack: music.melodyAttack || 0.08, decay: music.melodyDecay || 0.3, sustain: music.melodySustain || 0.6, release: music.melodyRelease || 2.0 },
      volume: -4,
    }).connect(vibrato);

    synthsRef.current = [pad, mel, vibrato, chorus, reverb, analyzer];
    Tone.Transport.bpm.value = bpm;

    music.chords.forEach(({ bar, notes, bars = 2 }) => {
      Tone.Transport.schedule(t => { try { pad.triggerAttackRelease(notes, bars * spBar, t); } catch(e) {} }, bar * spBar);
    });
    music.melody.forEach(({ bar, beat, note, dur }) => {
      Tone.Transport.schedule(t => { try { mel.triggerAttackRelease(note, dur, t); } catch(e) {} }, bar * spBar + beat * spb);
    });

    playingRef.current = true;
    setIsPlaying(true);
    setPhase("playing");

    timerRef.current = setInterval(() => {
      if (!playingRef.current) return;
      setProgress(Math.min(Tone.Transport.seconds / totalDur, 1));
    }, 120);
    endRef.current = setTimeout(() => {
      if (playingRef.current) { stopAll(); setPhase("ready"); }
    }, (totalDur + 4) * 1000);

    const draw = () => {
      const canvas = canvasRef.current;
      const ana    = analyzerRef.current;
      if (!canvas || !ana) return;
      const ctx = canvas.getContext("2d");
      const W = canvas.width, H = canvas.height;
      const d = ana.getValue();
      const p = pal;
      ctx.clearRect(0, 0, W, H);
      ctx.beginPath();
      ctx.strokeStyle = `rgba(${p.glow},0.25)`;
      ctx.lineWidth = 8;
      d.forEach((v, i) => { const x=(i/d.length)*W, y=((v+1)/2)*H; i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); });
      ctx.stroke();
      ctx.beginPath();
      ctx.strokeStyle = p.accent;
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 14;
      ctx.shadowColor = `rgba(${p.glow},0.85)`;
      d.forEach((v, i) => { const x=(i/d.length)*W, y=((v+1)/2)*H; i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); });
      ctx.stroke();
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    Tone.Transport.start();
  };

  const stop  = () => { stopAll(); setPhase("ready"); };
  const reset = () => { stopAll(); setPhase("input"); setMusic(null); setInput(""); setPal(PAL.neutre); };

  const p         = pal;
  const remaining = Math.max(0, FREE_LIMIT - useCount);
  const S = {
    root:     { minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                background:`radial-gradient(ellipse 90% 70% at 50% 50%, ${p.mid} 0%, ${p.bg} 70%)`,
                transition:"background 1.6s ease", padding:"2rem",
                fontFamily:"Georgia,'Times New Roman',serif", color:p.text },
    title:    { fontSize:"clamp(1.5rem,4vw,2.2rem)", fontWeight:300, letterSpacing:"0.03em", textAlign:"center", lineHeight:1.3, marginBottom:"0.5rem" },
    textarea: { width:"100%", maxWidth:480, background:p.sub, border:`1px solid rgba(${p.glow},0.35)`,
                borderRadius:3, color:p.text, fontFamily:"Georgia,serif", fontSize:"1.05rem",
                padding:"0.85rem 1.1rem", resize:"none", outline:"none", lineHeight:1.7 },
    btn:      { background:"transparent", border:`1px solid rgba(${p.glow},0.5)`, color:p.accent,
                fontFamily:"Georgia,serif", fontSize:"0.9rem", letterSpacing:"0.14em",
                padding:"0.6rem 2rem", cursor:"pointer", textTransform:"uppercase" },
    tag:      { fontFamily:"monospace", fontSize:"0.65rem", letterSpacing:"0.18em", color:`rgba(${p.glow},0.6)`, textTransform:"uppercase" },
    waveBox:  { width:"100%", maxWidth:500, height:90, background:p.sub, border:`1px solid rgba(${p.glow},0.15)`, borderRadius:3, overflow:"hidden" },
    track:    { width:"100%", maxWidth:500, height:1, background:`rgba(${p.glow},0.2)`, margin:"1.2rem 0" },
    fill:     { height:"100%", background:p.accent, boxShadow:`0 0 6px rgba(${p.glow},0.8)`, transition:"width 0.12s linear" },
  };

  return (
    <div style={S.root}>
      {phase === "paywall" && <Paywall pal={p} />}

      {phase === "input" && (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"1.6rem", width:"100%", maxWidth:480 }}>
          <h1 style={S.title}>
            Quelle émotion veux-tu<br />
            <span style={{ color:p.accent, fontStyle:"italic" }}>transmettre ?</span>
          </h1>
          <textarea rows={4} style={S.textarea}
            placeholder="Une joie soudaine, une nostalgie qui pèse, une colère qui cherche sa sortie..."
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key==="Enter" && e.ctrlKey && generate()} />
          {error && <p style={{ color:"#f87171", fontSize:"0.88rem", fontStyle:"italic" }}>{error}</p>}
          <button style={S.btn} onClick={generate} disabled={!input.trim()}>Composer</button>
          <div style={{ display:"flex", gap:"1.5rem", alignItems:"center" }}>
            <span style={S.tag}>Ctrl+Enter</span>
            {remaining > 0 && (
              <span style={{ ...S.tag, color: remaining===1 ? "#f87171" : `rgba(${p.glow},0.5)` }}>
                {remaining} gratuite{remaining>1?"s":""} restante{remaining>1?"s":""}
              </span>
            )}
          </div>
        </div>
      )}

      {phase === "loading" && (
        <div style={{ textAlign:"center" }}>
          <p style={{ fontSize:"1.25rem", fontWeight:300, fontStyle:"italic", letterSpacing:"0.06em" }}>composition en cours{dots}</p>
          <p style={{ ...S.tag, marginTop:"0.8rem" }}>une partition prend forme</p>
        </div>
      )}

      {(phase === "ready" || phase === "playing") && music && (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"0.4rem", width:"100%", maxWidth:520 }}>
          <div style={{ display:"flex", gap:"1rem", marginBottom:"0.6rem" }}>
            <span style={S.tag}>{music.category}</span>
            <span style={S.tag}>·</span>
            <span style={S.tag}>{music.bpm} bpm</span>
            <span style={S.tag}>·</span>
            <span style={{ ...S.tag, opacity:0.4 }}>{useCount}/{FREE_LIMIT}</span>
          </div>
          <h2 style={{ ...S.title, fontSize:"clamp(1.7rem,5vw,2.6rem)", color:p.accent, marginBottom:"0.2rem" }}>
            {music.title}
          </h2>
          <p style={{ fontSize:"1rem", fontStyle:"italic", fontWeight:300, textAlign:"center", color:p.text, opacity:0.75, lineHeight:1.75, maxWidth:420, margin:"0 0 0.8rem" }}>
            {music.description}
          </p>
          <div style={S.waveBox}>
            <canvas ref={canvasRef} width={500} height={90} style={{ width:"100%", height:"100%" }} />
          </div>
          <div style={S.track}><div style={{ ...S.fill, width:`${progress*100}%` }} /></div>
          <div style={{ display:"flex", gap:"0.9rem" }}>
            {!isPlaying
              ? <button style={S.btn} onClick={play}>▷ Écouter</button>
              : <button style={S.btn} onClick={stop}>□ Stop</button>}
            <button style={{ ...S.btn, opacity:0.55 }} onClick={reset}>↩ Autre émotion</button>
          </div>
        </div>
      )}
    </div>
  );
}
