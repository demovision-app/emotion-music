import { useState, useRef, useEffect, useCallback } from "react";
import * as Tone from "tone";

const FREE_LIMIT  = 3;
const STORAGE_KEY = "emotion-music-count";
const STRIPE_LINK = "https://buy.stripe.com/00w14g0BP99lcwydDQ2Ji0m";
const ADMIN_CODE  = "demotion360";

const PAL = {
  tristesse: { bg:"#07101d", mid:"#0d2137", accent:"#4a90d9", glow:"74,144,217",  text:"#93c5fd", sub:"rgba(74,144,217,0.08)" },
  joie:      { bg:"#110d00", mid:"#241a00", accent:"#f59e0b", glow:"245,158,11",  text:"#fde68a", sub:"rgba(245,158,11,0.08)" },
  colere:    { bg:"#130202", mid:"#2a0606", accent:"#ef4444", glow:"239,68,68",   text:"#fca5a5", sub:"rgba(239,68,68,0.08)" },
  peur:      { bg:"#080511", mid:"#150f28", accent:"#8b5cf6", glow:"139,92,246",  text:"#c4b5fd", sub:"rgba(139,92,246,0.08)" },
  serenite:  { bg:"#010e07", mid:"#021a0d", accent:"#10b981", glow:"16,185,129",  text:"#6ee7b7", sub:"rgba(16,185,129,0.08)" },
  amour:     { bg:"#11020b", mid:"#260618", accent:"#ec4899", glow:"236,72,153",  text:"#f9a8d4", sub:"rgba(236,72,153,0.08)" },
  nostalgie: { bg:"#0f0700", mid:"#211200", accent:"#d97706", glow:"217,119,6",   text:"#fcd34d", sub:"rgba(217,119,6,0.08)" },
  neutre:    { bg:"#0b0b14", mid:"#141424", accent:"#818cf8", glow:"129,140,248", text:"#c7d2fe", sub:"rgba(129,140,248,0.08)" },
};

const DUR_LABELS = { "16n":"𝅘𝅥𝅯","8n":"♪","4n":"♩","4n.":"♩.","2n":"𝅗𝅥","2n.":"𝅗𝅥.","1n":"𝅝" };

function getCount() { try { return parseInt(localStorage.getItem(STORAGE_KEY)||"0",10); } catch { return 0; } }
function saveCount(n) { try { localStorage.setItem(STORAGE_KEY,String(n)); } catch {} }

function VerseDisplay({ label, notes, pal: p, playing, currentIdx, verseOffset }) {
  return (
    <div style={{ width:"100%", maxWidth:520 }}>
      <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"8px" }}>
        <span style={{ fontFamily:"monospace", fontSize:"0.6rem", letterSpacing:"0.18em",
          textTransform:"uppercase", color:`rgba(${p.glow},0.45)` }}>{label}</span>
        <div style={{ flex:1, height:"0.5px", background:`rgba(${p.glow},0.15)` }} />
      </div>
      <div style={{ display:"flex", gap:"7px", flexWrap:"wrap" }}>
        {notes.map((n, i) => {
          const globalIdx = verseOffset + i;
          const active = playing && globalIdx === currentIdx;
          return (
            <div key={i} style={{
              display:"flex", flexDirection:"column", alignItems:"center", gap:"3px",
              padding:"8px 12px",
              background: active ? `rgba(${p.glow},0.22)` : `rgba(${p.glow},0.05)`,
              border: `1px solid rgba(${p.glow},${active ? 0.65 : 0.18})`,
              borderRadius:"5px",
              transform: active ? "scale(1.1) translateY(-2px)" : "scale(1)",
              boxShadow: active ? `0 0 16px rgba(${p.glow},0.4)` : "none",
              transition:"all 0.12s ease",
              minWidth:"46px",
            }}>
              <span style={{ fontSize:"0.95rem", fontWeight:500, letterSpacing:"0.02em",
                color: active ? p.accent : p.text, fontFamily:"Georgia,serif" }}>
                {n.note}
              </span>
              <span style={{ fontSize:"0.68rem", color:`rgba(${p.glow},0.5)`, fontFamily:"monospace" }}>
                {DUR_LABELS[n.dur] || n.dur}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Paywall({ pal: p }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"1.4rem", maxWidth:400, textAlign:"center" }}>
      <div style={{ fontSize:"2.8rem" }}>🎵</div>
      <h2 style={{ fontSize:"1.5rem", fontWeight:300, letterSpacing:"0.04em", margin:0, color:p.text }}>
        Tu as vidé ton quota gratuit
      </h2>
      <p style={{ fontSize:"1rem", fontStyle:"italic", opacity:0.75, lineHeight:1.9, margin:0, color:p.text }}>
        Tu as eu droit à {FREE_LIMIT} émotions.<br />
        Il t'en reste encore combien à exprimer ?
      </p>
      <div style={{ background:`rgba(${p.glow},0.06)`, border:`1px solid rgba(${p.glow},0.2)`,
        borderRadius:4, padding:"1.1rem 1.4rem", width:"100%" }}>
        <p style={{ margin:0, fontSize:"0.9rem", color:p.text, opacity:0.8, lineHeight:1.8, fontStyle:"italic" }}>
          Pour 4,99 €/mois, compose autant que tu veux —<br />
          joie, tristesse, rage, amour, et tout ce qu'il y a entre les deux.
        </p>
        <div style={{ borderTop:`1px solid rgba(${p.glow},0.2)`, marginTop:"0.9rem", paddingTop:"0.9rem",
          display:"flex", justifyContent:"center", alignItems:"baseline", gap:"0.4rem" }}>
          <span style={{ color:p.accent, fontSize:"1.5rem", fontWeight:300 }}>4,99 €</span>
          <span style={{ color:p.text, opacity:0.5, fontSize:"0.8rem" }}>/mois</span>
        </div>
      </div>
      <button style={{ background:p.accent, color:p.bg, border:"none", borderRadius:3,
        fontFamily:"Georgia,serif", fontSize:"1rem", letterSpacing:"0.1em",
        padding:"0.75rem 2.5rem", cursor:"pointer", fontWeight:600 }}
        onClick={() => window.open(STRIPE_LINK,"_blank")}>
        Continuer à composer
      </button>
      <p style={{ fontSize:"0.7rem", opacity:0.3, fontFamily:"monospace", letterSpacing:"0.1em",
        textTransform:"uppercase", margin:0, color:p.text }}>
        Sans engagement · Résiliable à tout moment
      </p>
    </div>
  );
}

export default function App() {
  const [input, setInput]           = useState("");
  const [phase, setPhase]           = useState("input");
  const [music, setMusic]           = useState(null);
  const [pal, setPal]               = useState(PAL.neutre);
  const [isPlaying, setIsPlaying]   = useState(false);
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [error, setError]           = useState(null);
  const [dots, setDots]             = useState("");
  const [useCount, setUseCount]     = useState(() => getCount());
  const [admin, setAdmin]           = useState(false);
  const [lastInput, setLastInput]   = useState("");

  const synthsRef  = useRef(null);
  const playingRef = useRef(false);

  useEffect(() => {
    if (phase !== "loading") return;
    const t = setInterval(() => setDots(d => d.length >= 3 ? "" : d + "."), 380);
    return () => clearInterval(t);
  }, [phase]);

  const stopAll = useCallback(() => {
    playingRef.current = false;
    setIsPlaying(false);
    setCurrentIdx(-1);
    Tone.Transport.stop();
    Tone.Transport.cancel();
    if (synthsRef.current) {
      synthsRef.current.forEach(n => { try { n.dispose(); } catch(e) {} });
      synthsRef.current = null;
    }
  }, []);

  useEffect(() => () => stopAll(), [stopAll]);

  const generate = async (overrideInput) => {
    const val = overrideInput || input;
    if (!val.trim()) return;
    if (val.trim() === ADMIN_CODE) {
      setAdmin(true); setInput("");
      setError("✓ Mode admin activé."); return;
    }
    if (useCount >= FREE_LIMIT && !admin) { setPhase("paywall"); return; }
    setLastInput(val);
    setPhase("loading"); setError(null);
    try {
      const res = await fetch("/api/compose", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ emotion: val }),
      });
      const parsed = await res.json();
      if (parsed.error) throw new Error(parsed.error);
      if (!admin) { const n = useCount+1; setUseCount(n); saveCount(n); }
      setPal(PAL[parsed.category] || PAL.neutre);
      setMusic(parsed);
      setPhase("ready");
    } catch(e) {
      setError(e.message || "Erreur inconnue");
      setPhase("input");
    }
  };

  const play = async () => {
    if (!music?.verse1?.length) return;
    stopAll();
    await Tone.start();

    const bpm = music.bpm || 80;
    Tone.Transport.bpm.value = bpm;

    const reverb = new Tone.Reverb({ decay:4.5, wet: music.reverbWet || 0.65 });
    await reverb.ready;
    reverb.toDestination();

    const chorus = new Tone.Chorus({ frequency:1.4, delayTime:4.5, depth:0.4, wet:0.4 }).connect(reverb);
    chorus.start();
    const vibrato = new Tone.Vibrato({ frequency:5.2, depth:0.07, wet:0.8 }).connect(chorus);
    const eq = new Tone.EQ3({ low:2, mid:-1, high:-7 }).connect(vibrato);

    const mel = new Tone.FMSynth({
      harmonicity:3, modulationIndex:10,
      oscillator:{ type:"sine" },
      envelope:{ attack:0.08, decay:0.25, sustain:0.55, release:2.5 },
      modulation:{ type:"sine" },
      modulationEnvelope:{ attack:0.2, decay:0.4, sustain:0.5, release:1.5 },
      volume:-5,
    }).connect(eq);

    synthsRef.current = [mel, eq, vibrato, chorus, reverb];

    const allNotes = [
      ...( music.verse1 || []),
      ...( music.verse2 || []),
    ];

    // Silence entre les deux verses (1 mesure)
    const silenceDur = Tone.Time("1m").toSeconds();
    let time = 0;
    let globalIdx = 0;

    // Verse 1
    (music.verse1 || []).forEach((n) => {
      const dur = n.dur || "4n";
      const idx = globalIdx;
      Tone.Transport.schedule(t => {
        if (!playingRef.current) return;
        try { mel.triggerAttackRelease(n.note, dur, t); } catch(e) {}
        setCurrentIdx(idx);
      }, time);
      time += Tone.Time(dur).toSeconds();
      globalIdx++;
    });

    // Silence entre les verses
    time += silenceDur;
    Tone.Transport.schedule(() => { if (playingRef.current) setCurrentIdx(-1); }, time - silenceDur + 0.1);

    // Verse 2
    (music.verse2 || []).forEach((n) => {
      const dur = n.dur || "4n";
      const idx = globalIdx;
      Tone.Transport.schedule(t => {
        if (!playingRef.current) return;
        try { mel.triggerAttackRelease(n.note, dur, t); } catch(e) {}
        setCurrentIdx(idx);
      }, time);
      time += Tone.Time(dur).toSeconds();
      globalIdx++;
    });

    Tone.Transport.schedule(() => {
      if (playingRef.current) { stopAll(); setPhase("ready"); }
    }, time + 0.8);

    playingRef.current = true;
    setIsPlaying(true);
    setPhase("playing");
    Tone.Transport.start();
  };

  const stop  = () => { stopAll(); setPhase("ready"); };
  const reset = () => { stopAll(); setPhase("input"); setMusic(null); setInput(""); setPal(PAL.neutre); };
  const again = () => { stopAll(); generate(lastInput); };

  const p = pal;
  const remaining = Math.max(0, FREE_LIMIT - useCount);
  const v1len = music?.verse1?.length || 0;

  const S = {
    root: { minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      background:`radial-gradient(ellipse 90% 70% at 50% 50%, ${p.mid} 0%, ${p.bg} 70%)`,
      transition:"background 1.6s ease", padding:"2rem",
      fontFamily:"Georgia,'Times New Roman',serif", color:p.text },
    title:    { fontSize:"clamp(1.4rem,4vw,2rem)", fontWeight:300, letterSpacing:"0.03em", textAlign:"center", lineHeight:1.4 },
    textarea: { width:"100%", maxWidth:460, background:p.sub, border:`1px solid rgba(${p.glow},0.35)`,
      borderRadius:3, color:p.text, fontFamily:"Georgia,serif", fontSize:"1rem",
      padding:"0.85rem 1.1rem", resize:"none", outline:"none", lineHeight:1.7 },
    btn: { background:"transparent", border:`1px solid rgba(${p.glow},0.5)`, color:p.accent,
      fontFamily:"Georgia,serif", fontSize:"0.82rem", letterSpacing:"0.14em",
      padding:"0.5rem 1.6rem", cursor:"pointer", textTransform:"uppercase" },
    tag: { fontFamily:"monospace", fontSize:"0.6rem", letterSpacing:"0.18em", color:`rgba(${p.glow},0.5)`, textTransform:"uppercase" },
  };

  return (
    <div style={S.root}>
      {phase === "paywall" && <Paywall pal={p} />}

      {phase === "input" && (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"1.5rem", width:"100%", maxWidth:460 }}>
          <h1 style={{ ...S.title, marginBottom:"0.2rem" }}>
            Quelle émotion veux-tu<br />
            <span style={{ color:p.accent, fontStyle:"italic" }}>transmettre ?</span>
          </h1>
          <textarea rows={3} style={S.textarea}
            placeholder="Une joie soudaine, une nostalgie qui pèse..."
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key==="Enter" && e.ctrlKey && generate()} />
          {error && <p style={{ color: error.startsWith("✓") ? p.accent : "#f87171", fontSize:"0.85rem", fontStyle:"italic", margin:0 }}>{error}</p>}
          <button style={S.btn} onClick={() => generate()} disabled={!input.trim()}>Générer les verses</button>
          <div style={{ display:"flex", gap:"1.5rem", alignItems:"center" }}>
            <span style={S.tag}>Ctrl+Enter</span>
            {!admin && remaining > 0 && (
              <span style={{ ...S.tag, color: remaining===1 ? "#f87171" : `rgba(${p.glow},0.5)` }}>
                {remaining} gratuite{remaining>1?"s":""} restante{remaining>1?"s":""}
              </span>
            )}
            {admin && <span style={{ ...S.tag, color:p.accent }}>mode admin</span>}
          </div>
        </div>
      )}

      {phase === "loading" && (
        <div style={{ textAlign:"center" }}>
          <p style={{ fontSize:"1.2rem", fontWeight:300, fontStyle:"italic", letterSpacing:"0.06em" }}>
            les verses prennent forme{dots}
          </p>
        </div>
      )}

      {(phase === "ready" || phase === "playing") && music && (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"1rem", width:"100%", maxWidth:540 }}>
          <div style={{ display:"flex", gap:"0.8rem", alignItems:"center" }}>
            <span style={S.tag}>{music.category}</span>
            <span style={S.tag}>·</span>
            <span style={S.tag}>{music.mode || ""}</span>
            <span style={S.tag}>·</span>
            <span style={S.tag}>{music.key || ""}</span>
            <span style={S.tag}>·</span>
            <span style={S.tag}>{music.bpm} bpm</span>
          </div>

          <h2 style={{ ...S.title, fontSize:"clamp(1.5rem,5vw,2.2rem)", color:p.accent, margin:"0" }}>
            {music.title}
          </h2>
          <p style={{ fontSize:"0.92rem", fontStyle:"italic", fontWeight:300, textAlign:"center",
            color:p.text, opacity:0.7, lineHeight:1.75, maxWidth:420, margin:"0" }}>
            {music.description}
          </p>

          <VerseDisplay label="Verse I" notes={music.verse1 || []} pal={p}
            playing={isPlaying} currentIdx={currentIdx} verseOffset={0} />

          <VerseDisplay label="Verse II" notes={music.verse2 || []} pal={p}
            playing={isPlaying} currentIdx={currentIdx} verseOffset={v1len} />

          <div style={{ display:"flex", gap:"0.7rem", flexWrap:"wrap", justifyContent:"center", marginTop:"0.4rem" }}>
            {!isPlaying
              ? <button style={S.btn} onClick={play}>▷ Écouter</button>
              : <button style={S.btn} onClick={stop}>□ Stop</button>}
            <button style={{ ...S.btn, opacity:0.6 }} onClick={again}>↺ Autre version</button>
            <button style={{ ...S.btn, opacity:0.4 }} onClick={reset}>↩ Autre émotion</button>
          </div>

          <p style={{ ...S.tag, opacity:0.3 }}>↺ génère de nouveaux verses pour la même émotion</p>
        </div>
      )}
    </div>
  );
}
