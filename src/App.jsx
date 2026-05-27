import { useState, useRef, useEffect, useCallback } from "react";
import * as Tone from "tone";

const FREE_LIMIT  = 3;
const STORAGE_KEY = "emotion-music-count";
const STRIPE_LINK = "https://buy.stripe.com/00w14g0BP99lcwydDQ2Ji0m";
const ADMIN_CODE  = "demotion360";

const PAL = {
  tristesse:       { bg:"#07101d", mid:"#0d2137", accent:"#4a90d9", glow:"74,144,217",  text:"#93c5fd", sub:"rgba(74,144,217,0.08)" },
  joie:            { bg:"#110d00", mid:"#241a00", accent:"#f59e0b", glow:"245,158,11",  text:"#fde68a", sub:"rgba(245,158,11,0.08)" },
  colere:          { bg:"#130202", mid:"#2a0606", accent:"#ef4444", glow:"239,68,68",   text:"#fca5a5", sub:"rgba(239,68,68,0.08)" },
  peur:            { bg:"#080511", mid:"#150f28", accent:"#8b5cf6", glow:"139,92,246",  text:"#c4b5fd", sub:"rgba(139,92,246,0.08)" },
  serenite:        { bg:"#010e07", mid:"#021a0d", accent:"#10b981", glow:"16,185,129",  text:"#6ee7b7", sub:"rgba(16,185,129,0.08)" },
  amour:           { bg:"#11020b", mid:"#260618", accent:"#ec4899", glow:"236,72,153",  text:"#f9a8d4", sub:"rgba(236,72,153,0.08)" },
  nostalgie:       { bg:"#0f0700", mid:"#211200", accent:"#d97706", glow:"217,119,6",   text:"#fcd34d", sub:"rgba(217,119,6,0.08)" },
  neutre:          { bg:"#0b0b14", mid:"#141424", accent:"#818cf8", glow:"129,140,248", text:"#c7d2fe", sub:"rgba(129,140,248,0.08)" },
};
const getPal = (cat) => {
  if (!cat) return PAL.neutre;
  const base = cat.split("+")[0];
  return PAL[base] || PAL.neutre;
};

const DUR_LABELS  = { "16n":"𝅘𝅥𝅯","8n":"♪","4n":"♩","4n.":"♩.","2n":"𝅗𝅥","2n.":"𝅗𝅥.","1n":"𝅝" };
const SPEEDS      = [{ label:"½×", mult:0.5 },{ label:"1×", mult:1 },{ label:"1½×", mult:1.5 },{ label:"2×", mult:2 }];

// ─── NOTE / MIDI UTILITIES ────────────────────────────────────────────────────
const NOTE_SEMITONES = { C:0,"C#":1,Db:1,D:2,"D#":3,Eb:3,E:4,F:5,"F#":6,Gb:6,G:7,"G#":8,Ab:8,A:9,"A#":10,Bb:10,B:11 };
const CHROMATIC = ["C","C#","D","Eb","E","F","F#","G","Ab","A","Bb","B"];

function parseNote(noteStr) {
  const m = noteStr.match(/^([A-G][b#]?)(\d)$/);
  if (!m) return null;
  return { name: m[1], octave: parseInt(m[2]), semitone: NOTE_SEMITONES[m[1]] };
}

function noteToMidi(noteStr) {
  const n = parseNote(noteStr);
  if (!n) return 60;
  return 12 + n.octave * 12 + n.semitone;
}

function midiToNote(midi) {
  const octave = Math.floor(midi / 12) - 1;
  const semi   = midi % 12;
  return CHROMATIC[semi] + octave;
}

function transposeNote(noteStr, semitones) {
  const midi = noteToMidi(noteStr);
  return midiToNote(Math.max(0, Math.min(127, midi + semitones)));
}

function transposeVerse(verse, semitones) {
  return verse.map(n => ({ ...n, note: transposeNote(n.note, semitones) }));
}

const DUR_TICKS = { "16n":120,"8n":240,"4n":480,"4n.":720,"2n":960,"2n.":1440,"1n":1920 };

function buildMidi(verse1, verse2, bpm) {
  const TPB = 480;
  const uspb = Math.round(60000000 / bpm);

  const writeVarLen = (n) => {
    const bytes = [];
    bytes.unshift(n & 0x7F);
    n >>= 7;
    while (n > 0) { bytes.unshift((n & 0x7F) | 0x80); n >>= 7; }
    return bytes;
  };

  const events = [];
  const addNote = (midi, ticks, durTicks) => {
    events.push({ time: ticks, type: 0x90, note: midi, vel: 80 });
    events.push({ time: ticks + durTicks, type: 0x80, note: midi, vel: 0 });
  };

  let t = 0;
  const silenceTicks = TPB * 4;
  [...verse1].forEach(n => {
    const dt = DUR_TICKS[n.dur] || 480;
    addNote(noteToMidi(n.note), t, dt);
    t += dt;
  });
  t += silenceTicks;
  [...verse2].forEach(n => {
    const dt = DUR_TICKS[n.dur] || 480;
    addNote(noteToMidi(n.note), t, dt);
    t += dt;
  });

  events.sort((a, b) => a.time - b.time || a.type - b.type);

  const trackBytes = [];
  // Tempo meta
  trackBytes.push(0x00, 0xFF, 0x51, 0x03,
    (uspb >> 16) & 0xFF, (uspb >> 8) & 0xFF, uspb & 0xFF);

  let prev = 0;
  for (const ev of events) {
    const delta = ev.time - prev;
    prev = ev.time;
    trackBytes.push(...writeVarLen(delta), ev.type, ev.note, ev.vel);
  }
  // End of track
  trackBytes.push(0x00, 0xFF, 0x2F, 0x00);

  const header = [
    0x4D,0x54,0x68,0x64, 0,0,0,6, 0,0, 0,1,
    (TPB>>8)&0xFF, TPB&0xFF,
  ];
  const trackLen = trackBytes.length;
  const trackHeader = [
    0x4D,0x54,0x72,0x6B,
    (trackLen>>24)&0xFF,(trackLen>>16)&0xFF,(trackLen>>8)&0xFF,trackLen&0xFF,
  ];
  return new Uint8Array([...header, ...trackHeader, ...trackBytes]);
}

function downloadMidi(verse1, verse2, bpm, title) {
  const bytes = buildMidi(verse1, verse2, bpm);
  const blob  = new Blob([bytes], { type:"audio/midi" });
  const url   = URL.createObjectURL(blob);
  const a     = document.createElement("a");
  a.href      = url;
  a.download  = `${(title||"motif").replace(/\s+/g,"-").toLowerCase()}.mid`;
  a.click();
  URL.revokeObjectURL(url);
}

function copyNotes(verse1, verse2) {
  const fmt = (v, label) =>
    `${label}:\n` + v.map(n => `  ${n.note.padEnd(4)} ${DUR_LABELS[n.dur]||n.dur}`).join("\n");
  const text = [fmt(verse1,"Verse I"), fmt(verse2,"Verse II")].join("\n\n");
  navigator.clipboard.writeText(text).catch(() => {});
}

// ─── SYNTH ────────────────────────────────────────────────────────────────────
async function buildSynth(reverbWet) {
  const reverb  = new Tone.Reverb({ decay:4.5, wet: reverbWet || 0.65 });
  await reverb.ready;
  reverb.toDestination();
  const chorus  = new Tone.Chorus({ frequency:1.4, delayTime:4.5, depth:0.4, wet:0.4 }).connect(reverb);
  chorus.start();
  const vibrato = new Tone.Vibrato({ frequency:5.2, depth:0.07, wet:0.8 }).connect(chorus);
  const eq      = new Tone.EQ3({ low:2, mid:-1, high:-7 }).connect(vibrato);
  const mel     = new Tone.FMSynth({
    harmonicity:3, modulationIndex:10,
    oscillator:{ type:"sine" },
    envelope:{ attack:0.08, decay:0.25, sustain:0.55, release:2.5 },
    modulation:{ type:"sine" },
    modulationEnvelope:{ attack:0.2, decay:0.4, sustain:0.5, release:1.5 },
    volume:-5,
  }).connect(eq);
  return { mel, nodes:[mel,eq,vibrato,chorus,reverb] };
}

// ─── SUB-COMPONENTS ──────────────────────────────────────────────────────────
function VerseDisplay({ label, notes, pal:p, playing, currentIdx, verseOffset, onPlayNote }) {
  return (
    <div style={{ width:"100%", maxWidth:540 }}>
      <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"8px" }}>
        <span style={{ fontFamily:"monospace", fontSize:"0.6rem", letterSpacing:"0.18em",
          textTransform:"uppercase", color:`rgba(${p.glow},0.45)` }}>{label}</span>
        <div style={{ flex:1, height:"0.5px", background:`rgba(${p.glow},0.15)` }} />
      </div>
      <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
        {notes.map((n, i) => {
          const gi = verseOffset + i;
          const active = playing && gi === currentIdx;
          return (
            <div key={i}
              onClick={() => onPlayNote(n)}
              title="Écouter cette note"
              style={{
                display:"flex", flexDirection:"column", alignItems:"center", gap:"3px",
                padding:"8px 11px",
                background: active ? `rgba(${p.glow},0.22)` : `rgba(${p.glow},0.05)`,
                border:`1px solid rgba(${p.glow},${active?0.65:0.18})`,
                borderRadius:"5px",
                transform: active ? "scale(1.1) translateY(-2px)" : "scale(1)",
                boxShadow: active ? `0 0 16px rgba(${p.glow},0.4)` : "none",
                transition:"all 0.12s ease",
                minWidth:"44px", cursor:"pointer",
              }}>
              <span style={{ fontSize:"0.92rem", fontWeight:500, letterSpacing:"0.02em",
                color: active ? p.accent : p.text, fontFamily:"Georgia,serif" }}>
                {n.note}
              </span>
              <span style={{ fontSize:"0.66rem", color:`rgba(${p.glow},0.5)`, fontFamily:"monospace" }}>
                {DUR_LABELS[n.dur]||n.dur}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Paywall({ pal:p }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"1.4rem", maxWidth:400, textAlign:"center" }}>
      <div style={{ fontSize:"2.8rem" }}>🎵</div>
      <h2 style={{ fontSize:"1.5rem", fontWeight:300, letterSpacing:"0.04em", margin:0, color:p.text }}>
        Tu as vidé ton quota gratuit
      </h2>
      <p style={{ fontSize:"1rem", fontStyle:"italic", opacity:0.75, lineHeight:1.9, margin:0, color:p.text }}>
        Tu as eu droit à {FREE_LIMIT} émotions.<br />Il t'en reste encore combien à exprimer ?
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

// ─── STORAGE ─────────────────────────────────────────────────────────────────
function getCount() { try { return parseInt(localStorage.getItem(STORAGE_KEY)||"0",10); } catch { return 0; } }
function saveCount(n) { try { localStorage.setItem(STORAGE_KEY,String(n)); } catch {} }

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
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
  const [transpose, setTranspose]   = useState(0);
  const [speedIdx, setSpeedIdx]     = useState(1);
  const [copied, setCopied]         = useState(false);

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
      synthsRef.current.forEach(n => { try { n.dispose(); } catch(e){} });
      synthsRef.current = null;
    }
  }, []);

  useEffect(() => () => stopAll(), [stopAll]);

  // Verses transposées courantes
  const v1 = music?.verse1 ? transposeVerse(music.verse1, transpose) : [];
  const v2 = music?.verse2 ? transposeVerse(music.verse2, transpose) : [];

  const generate = async (overrideInput) => {
    const val = overrideInput || input;
    if (!val.trim()) return;
    if (val.trim() === ADMIN_CODE) {
      setAdmin(true); setInput(""); setError("✓ Mode admin activé."); return;
    }
    if (useCount >= FREE_LIMIT && !admin) { setPhase("paywall"); return; }
    setLastInput(val); setPhase("loading"); setError(null); setTranspose(0);
    try {
      const res = await fetch("/api/compose", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ emotion: val }),
      });
      const parsed = await res.json();
      if (parsed.error) throw new Error(parsed.error);
      if (!admin) { const n = useCount+1; setUseCount(n); saveCount(n); }
      setPal(getPal(parsed.category));
      setMusic(parsed); setPhase("ready");
    } catch(e) { setError(e.message||"Erreur inconnue"); setPhase("input"); }
  };

  const playNotes = async (notes, reverbWet, bpm) => {
    stopAll();
    await Tone.start();
    const speed = SPEEDS[speedIdx].mult;
    Tone.Transport.bpm.value = bpm * speed;
    const { mel, nodes } = await buildSynth(reverbWet);
    synthsRef.current = nodes;
    let time = 0;
    notes.forEach((n, i) => {
      const dur = n.dur || "4n";
      Tone.Transport.schedule(t => {
        if (!playingRef.current) return;
        try { mel.triggerAttackRelease(n.note, dur, t); } catch(e){}
        setCurrentIdx(i);
      }, time);
      time += Tone.Time(dur).toSeconds();
    });
    Tone.Transport.schedule(() => {
      if (playingRef.current) { stopAll(); }
    }, time + 0.8);
    playingRef.current = true;
    setIsPlaying(true);
    Tone.Transport.start();
  };

  const play = async () => {
    if (!music) return;
    stopAll();
    await Tone.start();
    const speed = SPEEDS[speedIdx].mult;
    const bpm   = (music.bpm || 80) * speed;
    Tone.Transport.bpm.value = bpm;
    const { mel, nodes } = await buildSynth(music.reverbWet);
    synthsRef.current = nodes;
    const silenceDur = Tone.Time("1m").toSeconds();
    let time = 0; let gi = 0;

    v1.forEach(n => {
      const dur = n.dur || "4n";
      const idx = gi;
      Tone.Transport.schedule(t => {
        if (!playingRef.current) return;
        try { mel.triggerAttackRelease(n.note, dur, t); } catch(e){}
        setCurrentIdx(idx);
      }, time);
      time += Tone.Time(dur).toSeconds(); gi++;
    });
    time += silenceDur;
    Tone.Transport.schedule(() => { if (playingRef.current) setCurrentIdx(-1); }, time - silenceDur + 0.05);
    v2.forEach(n => {
      const dur = n.dur || "4n";
      const idx = gi;
      Tone.Transport.schedule(t => {
        if (!playingRef.current) return;
        try { mel.triggerAttackRelease(n.note, dur, t); } catch(e){}
        setCurrentIdx(idx);
      }, time);
      time += Tone.Time(dur).toSeconds(); gi++;
    });
    Tone.Transport.schedule(() => { if (playingRef.current) { stopAll(); setPhase("ready"); } }, time + 0.8);
    playingRef.current = true; setIsPlaying(true); setPhase("playing");
    Tone.Transport.start();
  };

  const playSingleNote = async (noteObj) => {
    stopAll();
    await Tone.start();
    const { mel, nodes } = await buildSynth(music?.reverbWet || 0.6);
    synthsRef.current = nodes;
    playingRef.current = true;
    Tone.Transport.bpm.value = music?.bpm || 80;
    Tone.Transport.schedule(t => {
      try { mel.triggerAttackRelease(noteObj.note, noteObj.dur || "4n", t); } catch(e){}
    }, 0);
    Tone.Transport.schedule(() => { stopAll(); }, Tone.Time(noteObj.dur||"4n").toSeconds() + 1.5);
    Tone.Transport.start();
  };

  const handleCopy = () => {
    copyNotes(v1, v2);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const stop  = () => { stopAll(); setPhase("ready"); };
  const reset = () => { stopAll(); setPhase("input"); setMusic(null); setInput(""); setPal(PAL.neutre); setTranspose(0); };
  const again = () => { stopAll(); generate(lastInput); };

  const p = pal;
  const remaining = Math.max(0, FREE_LIMIT - useCount);

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
      fontFamily:"Georgia,serif", fontSize:"0.82rem", letterSpacing:"0.12em",
      padding:"0.5rem 1.4rem", cursor:"pointer", textTransform:"uppercase", borderRadius:2 },
    tag: { fontFamily:"monospace", fontSize:"0.6rem", letterSpacing:"0.18em", color:`rgba(${p.glow},0.5)`, textTransform:"uppercase" },
    iconBtn: { background:`rgba(${p.glow},0.07)`, border:`1px solid rgba(${p.glow},0.2)`,
      color:p.text, fontFamily:"monospace", fontSize:"0.78rem", letterSpacing:"0.08em",
      padding:"0.4rem 0.9rem", cursor:"pointer", borderRadius:3, transition:"all 0.15s" },
    toolRow: { display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap", justifyContent:"center",
      padding:"0.8rem 1rem", background:`rgba(${p.glow},0.04)`,
      border:`1px solid rgba(${p.glow},0.12)`, borderRadius:6, width:"100%", maxWidth:540 },
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
            placeholder="Une joie soudaine, une nostalgie qui pèse... ou une phrase entière."
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
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"0.9rem", width:"100%", maxWidth:560 }}>

          {/* Header */}
          <div style={{ display:"flex", gap:"0.7rem", alignItems:"center", flexWrap:"wrap", justifyContent:"center" }}>
            <span style={S.tag}>{music.category}</span>
            <span style={S.tag}>·</span>
            <span style={S.tag}>{music.mode||""}</span>
            <span style={S.tag}>·</span>
            <span style={S.tag}>{music.key||""}{transpose !== 0 ? ` ${transpose>0?"+":""}${transpose}` : ""}</span>
            <span style={S.tag}>·</span>
            <span style={S.tag}>{music.bpm} bpm</span>
          </div>

          <h2 style={{ ...S.title, fontSize:"clamp(1.4rem,5vw,2.1rem)", color:p.accent, margin:"0" }}>
            {music.title}
          </h2>
          <p style={{ fontSize:"0.9rem", fontStyle:"italic", fontWeight:300, textAlign:"center",
            color:p.text, opacity:0.7, lineHeight:1.75, maxWidth:420, margin:"0" }}>
            {music.description}
          </p>

          {/* Verses */}
          <VerseDisplay label="Verse I"  notes={v1} pal={p} playing={isPlaying}
            currentIdx={currentIdx} verseOffset={0} onPlayNote={playSingleNote} />
          <VerseDisplay label="Verse II" notes={v2} pal={p} playing={isPlaying}
            currentIdx={currentIdx} verseOffset={v1.length} onPlayNote={playSingleNote} />

          {/* Toolbar */}
          <div style={S.toolRow}>

            {/* Vitesse */}
            <span style={{ ...S.tag, marginRight:2 }}>Vitesse</span>
            {SPEEDS.map((s, i) => (
              <button key={i} style={{ ...S.iconBtn,
                background: speedIdx===i ? `rgba(${p.glow},0.2)` : `rgba(${p.glow},0.07)`,
                border: `1px solid rgba(${p.glow},${speedIdx===i ? 0.5 : 0.2})`,
                color: speedIdx===i ? p.accent : p.text,
              }} onClick={() => setSpeedIdx(i)}>{s.label}</button>
            ))}

            <div style={{ width:"0.5px", height:20, background:`rgba(${p.glow},0.2)`, margin:"0 4px" }} />

            {/* Transpose */}
            <span style={{ ...S.tag, marginRight:2 }}>Transposer</span>
            <button style={S.iconBtn} onClick={() => setTranspose(t => t-1)}>−</button>
            <span style={{ ...S.tag, minWidth:28, textAlign:"center", color:p.accent }}>
              {transpose > 0 ? `+${transpose}` : transpose}
            </span>
            <button style={S.iconBtn} onClick={() => setTranspose(t => t+1)}>+</button>

            <div style={{ width:"0.5px", height:20, background:`rgba(${p.glow},0.2)`, margin:"0 4px" }} />

            {/* Export */}
            <button style={S.iconBtn} onClick={handleCopy}>
              {copied ? "✓ Copié" : "Copier"}
            </button>
            <button style={S.iconBtn}
              onClick={() => downloadMidi(v1, v2, music.bpm, music.title)}>
              MIDI ↓
            </button>
          </div>

          {/* Playback */}
          <div style={{ display:"flex", gap:"0.7rem", flexWrap:"wrap", justifyContent:"center" }}>
            {!isPlaying
              ? <button style={S.btn} onClick={play}>▷ Écouter</button>
              : <button style={S.btn} onClick={stop}>□ Stop</button>}
            <button style={{ ...S.btn, opacity:0.6 }} onClick={again}>↺ Autre version</button>
            <button style={{ ...S.btn, opacity:0.4 }} onClick={reset}>↩ Autre émotion</button>
          </div>

          <p style={{ ...S.tag, opacity:0.28 }}>Clique sur une note pour l'écouter seule</p>
        </div>
      )}
    </div>
  );
}
