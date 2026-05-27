export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { emotion } = req.body;
  if (!emotion) return res.status(400).json({ error: "Emotion manquante" });

  const PALETTES = {
    tristesse: {
      bpm:[48,58,65], reverbWet:[0.78,0.82,0.86],
      melodyOsc:"fatsine", padOsc:"fattriangle",
      melodyAttack:0.6, padAttack:2.2, vibratoDepth:0.10,
      chordSets:[
        [["D3","F3","A3"],["C3","Eb3","G3"],["Bb2","D3","F3"],["A2","C3","E3"]],
        [["A2","C3","E3"],["G2","Bb2","D3"],["F2","Ab2","C3"],["E2","G2","B2"]],
        [["E3","G3","B3"],["D3","F3","A3"],["C3","Eb3","G3"],["B2","D3","F3"]]
      ],
      notes:["D4","F4","A4","C5","Eb4","G4","Bb4","D5","E4","G4"]
    },
    joie: {
      bpm:[118,128,138], reverbWet:[0.35,0.42,0.48],
      melodyOsc:"fattriangle", padOsc:"fatsine",
      melodyAttack:0.04, padAttack:1.0, vibratoDepth:0.04,
      chordSets:[
        [["C3","E3","G3"],["F3","A3","C4"],["G3","B3","D4"],["A3","C4","E4"]],
        [["G3","B3","D4"],["C3","E3","G3"],["D3","F#3","A3"],["E3","G#3","B3"]],
        [["F3","A3","C4"],["Bb3","D4","F4"],["C3","E3","G3"],["G3","B3","D4"]]
      ],
      notes:["C4","E4","G4","B4","D5","F#4","A4","C5","E5","G4"]
    },
    colere: {
      bpm:[108,122,135], reverbWet:[0.30,0.38,0.45],
      melodyOsc:"fatquad", padOsc:"fatquad",
      melodyAttack:0.03, padAttack:0.8, vibratoDepth:0.12,
      chordSets:[
        [["A2","C3","E3"],["D3","F3","A3"],["G2","Bb2","D3"],["E3","G3","B3"]],
        [["D3","F3","A3"],["G3","Bb3","D4"],["A2","C3","E3"],["E3","G3","B3"]],
        [["E3","G3","B3"],["A2","C3","E3"],["D3","F3","A3"],["G2","Bb2","D3"]]
      ],
      notes:["A3","C4","E4","G4","D4","F4","Bb3","E4","B3","A4"]
    },
    peur: {
      bpm:[50,60,68], reverbWet:[0.80,0.84,0.88],
      melodyOsc:"fatsine", padOsc:"fattriangle",
      melodyAttack:0.8, padAttack:2.5, vibratoDepth:0.09,
      chordSets:[
        [["B2","D3","F3"],["E3","G3","Bb3"],["A2","C3","Eb3"],["F#3","A3","C4"]],
        [["C3","Eb3","Gb3"],["F2","Ab2","C3"],["Bb2","Db3","F3"],["G2","Bb2","Db3"]],
        [["D3","F3","Ab3"],["G2","Bb2","Db3"],["C3","Eb3","G3"],["A2","C3","Eb3"]]
      ],
      notes:["B3","D4","F4","Ab4","E4","G4","Bb4","C#4","Eb4","B4"]
    },
    serenite: {
      bpm:[72,80,88], reverbWet:[0.52,0.58,0.64],
      melodyOsc:"fattriangle", padOsc:"fatsine",
      melodyAttack:0.2, padAttack:2.0, vibratoDepth:0.05,
      chordSets:[
        [["G3","B3","D4"],["C3","E3","G3"],["A3","C#4","E4"],["D3","F#3","A3"]],
        [["C3","E3","G3"],["F3","A3","C4"],["G3","B3","D4"],["E3","G#3","B3"]],
        [["A3","C#4","E4"],["D3","F#3","A3"],["G3","B3","D4"],["C3","E3","G3"]]
      ],
      notes:["G4","B4","D5","F#4","A4","E4","C#4","G4","B3","D4"]
    },
    amour: {
      bpm:[68,76,84], reverbWet:[0.62,0.68,0.72],
      melodyOsc:"fatquad", padOsc:"fatsine",
      melodyAttack:0.15, padAttack:1.8, vibratoDepth:0.07,
      chordSets:[
        [["F3","A3","C4"],["Bb3","D4","F4"],["C3","E3","G3"],["G3","B3","D4"]],
        [["C3","E3","G3"],["Am3","C4","E4"],["F3","A3","C4"],["G3","B3","D4"]],
        [["Eb3","G3","Bb3"],["Ab3","C4","Eb4"],["Bb3","D4","F4"],["F3","A3","C4"]]
      ],
      notes:["F4","A4","C5","E4","G4","Bb4","D4","F5","C4","E4"]
    },
    nostalgie: {
      bpm:[66,74,82], reverbWet:[0.62,0.67,0.72],
      melodyOsc:"fatquad", padOsc:"fattriangle",
      melodyAttack:0.25, padAttack:2.0, vibratoDepth:0.08,
      chordSets:[
        [["A2","C3","E3"],["D3","F3","A3"],["G2","Bb2","D3"],["E3","G3","B3"]],
        [["C3","E3","G3"],["Am2","C3","E3"],["F2","A2","C3"],["G2","B2","D3"]],
        [["D3","F#3","A3"],["G3","B3","D4"],["E3","G3","B3"],["A2","C3","E3"]]
      ],
      notes:["A3","C4","E4","G4","D4","F4","B3","A4","F#4","C4"]
    },
    neutre: {
      bpm:[80,90,100], reverbWet:[0.50,0.55,0.60],
      melodyOsc:"fatsine", padOsc:"fattriangle",
      melodyAttack:0.12, padAttack:1.5, vibratoDepth:0.06,
      chordSets:[
        [["C3","E3","G3"],["G3","B3","D4"],["A3","C4","E4"],["F3","A3","C4"]],
        [["D3","F#3","A3"],["G3","B3","D4"],["A3","C#4","E4"],["E3","G#3","B3"]],
        [["F3","A3","C4"],["C3","E3","G3"],["Bb3","D4","F4"],["G3","B3","D4"]]
      ],
      notes:["C4","E4","G4","B4","D4","F4","A4","C5","G4","E4"]
    }
  };

  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  // Détecter la catégorie depuis l'émotion pour injecter la bonne palette
  const detectCategory = (text) => {
    const t = text.toLowerCase();
    if (/triste|pleur|deuil|perd|perdu|larme|mélanc/.test(t)) return "tristesse";
    if (/joie|heureux|heureuse|bonheur|rire|fête|content/.test(t)) return "joie";
    if (/colère|rage|furieux|furie|énerv|fruste/.test(t)) return "colere";
    if (/peur|anxieux|angoisse|stress|effroi|crainte/.test(t)) return "peur";
    if (/sérén|calme|paisib|tranquil|zen|doux/.test(t)) return "serenite";
    if (/amour|aime|tendress|passion|désir|romantique/.test(t)) return "amour";
    if (/nostalg|souvenir|passé|jadis|enfance|autrefois/.test(t)) return "nostalgie";
    return "neutre";
  };

  const cat = detectCategory(emotion);
  const palette = PALETTES[cat] || PALETTES.neutre;
  const chords = pick(palette.chordSets);
  const bpm = pick(palette.bpm);
  const reverbWet = pick(palette.reverbWet);

  const paletteHint = `
PALETTE IMPOSÉE pour cette émotion (catégorie: ${cat}) :
- BPM : ${bpm}
- Accords (dans l'ordre bar 0,2,4,6) : ${JSON.stringify(chords)}
- Notes de mélodie autorisées : ${JSON.stringify(palette.notes)}
- melodyOsc : "${palette.melodyOsc}"
- padOsc : "${palette.padOsc}"
- melodyAttack : ${palette.melodyAttack}
- padAttack : ${palette.padAttack}
- vibratoDepth : ${palette.vibratoDepth}
- reverbWet : ${reverbWet}
`;

  const PROMPT = `Tu es un compositeur acoustique. Génère une composition JSON pour l'émotion décrite.
RÉPONDS UNIQUEMENT AVEC DU JSON VALIDE. Pas de markdown ni backticks.

STRUCTURE :
{
  "category": "${cat}",
  "title": "titre poétique en français (3-5 mots)",
  "description": "description poétique en français (1-2 phrases, 20-40 mots)",
  "bpm": ${bpm},
  "chords": [
    {"bar":0,"notes":${JSON.stringify(chords[0])},"bars":2},
    {"bar":2,"notes":${JSON.stringify(chords[1])},"bars":2},
    {"bar":4,"notes":${JSON.stringify(chords[2])},"bars":2},
    {"bar":6,"notes":${JSON.stringify(chords[3])},"bars":2}
  ],
  "melody": [GÉNÈRE 24-32 NOTES ICI],
  "melodyOsc":"${palette.melodyOsc}","melodyAttack":${palette.melodyAttack},"melodyDecay":0.3,"melodySustain":0.6,"melodyRelease":2.2,
  "melodyDetune":8,"melodyCount":3,
  "padOsc":"${palette.padOsc}","padAttack":${palette.padAttack},"padRelease":5.0,"padDetune":12,"padCount":4,
  "vibratoFreq":5.2,"vibratoDepth":${palette.vibratoDepth},
  "chorusFreq":1.8,"chorusDepth":0.4,"chorusDelayTime":3.5,
  "reverbDecay":4,"reverbWet":${reverbWet}
}

RÈGLES MÉLODIE :
- Utilise UNIQUEMENT ces notes : ${JSON.stringify(palette.notes)}
- 24-32 notes, bar 0-7, beat 0-3, dur: "4n","8n","2n","4n."
- Phrases expressives avec respirations (silences entre les phrases)
- Pas de gammes mécaniques — varie les durées et les sauts de notes`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 2500,
        temperature: 1.1,
        messages: [
          { role: "system", content: PROMPT },
          { role: "user", content: `Compose pour cette émotion : "${emotion}"` }
        ],
      }),
    });

    const text = await response.text();
    if (!response.ok) {
      return res.status(500).json({ error: `Groq error ${response.status}: ${text.slice(0, 200)}` });
    }

    let data;
    try { data = JSON.parse(text); }
    catch (e) { return res.status(500).json({ error: `Réponse Groq invalide: ${text.slice(0, 200)}` }); }

    if (data.error) return res.status(500).json({ error: data.error.message });
    if (!data.choices?.[0]?.message?.content) {
      return res.status(500).json({ error: "Réponse vide de Groq" });
    }

    const raw = data.choices[0].message.content.replace(/```json\n?|```/g, "").trim();

    let composition;
    try { composition = JSON.parse(raw); }
    catch (e) { return res.status(500).json({ error: `JSON invalide: ${raw.slice(0, 200)}` }); }

    return res.status(200).json(composition);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
