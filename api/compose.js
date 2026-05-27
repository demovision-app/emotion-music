export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { emotion } = req.body;
  if (!emotion) return res.status(400).json({ error: "Emotion manquante" });

  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const rnd  = (min, max) => +(min + Math.random() * (max - min)).toFixed(3);
  const seed = Math.floor(Math.random() * 99999);

  // GAMMES MAJEURES — émotions positives
  const MAJOR_SCALES = {
    joie: {
      keys: [
        { root:"C", notes:["C4","D4","E4","F4","G4","A4","B4","C5","D5","E5"] },
        { root:"G", notes:["G3","A3","B3","C4","D4","E4","F#4","G4","A4","B4"] },
        { root:"D", notes:["D4","E4","F#4","G4","A4","B4","C#5","D5","E5","F#5"] },
        { root:"F", notes:["F3","G3","A3","Bb3","C4","D4","E4","F4","G4","A4"] },
      ],
      bpm: () => +rnd(116, 144).toFixed(0),
      reverbWet: () => rnd(0.28, 0.44),
      verseLen: [6, 10], // [min, max] notes par verse
      durations: ["8n","8n","4n","8n","8n","4n.","8n","4n","8n","16n"],
      mood: ["joyeux et bondissant","léger et lumineux","festif et entraînant","vif et radieux"],
    },
    serenite: {
      keys: [
        { root:"G", notes:["G3","A3","B3","C4","D4","E4","F#4","G4","A4","B4"] },
        { root:"A", notes:["A3","B3","C#4","D4","E4","F#4","G#4","A4","B4","C#5"] },
        { root:"Eb", notes:["Eb4","F4","G4","Ab4","Bb4","C5","D5","Eb5","F5","G5"] },
        { root:"C", notes:["C4","D4","E4","F4","G4","A4","B4","C5","D5","E5"] },
      ],
      bpm: () => +rnd(66, 88).toFixed(0),
      reverbWet: () => rnd(0.54, 0.70),
      verseLen: [5, 9],
      durations: ["2n","4n.","4n","2n","4n.","4n","2n.","4n","8n","2n"],
      mood: ["paisible et fluide","contemplatif et doux","aérien et reposant","calme et pur"],
    },
    amour: {
      keys: [
        { root:"F", notes:["F3","G3","A3","Bb3","C4","D4","E4","F4","G4","A4"] },
        { root:"Bb", notes:["Bb3","C4","D4","Eb4","F4","G4","A4","Bb4","C5","D5"] },
        { root:"E", notes:["E3","F#3","G#3","A3","B3","C#4","D#4","E4","F#4","G#4"] },
        { root:"Ab", notes:["Ab3","Bb3","C4","Db4","Eb4","F4","G4","Ab4","Bb4","C5"] },
      ],
      bpm: () => +rnd(62, 84).toFixed(0),
      reverbWet: () => rnd(0.62, 0.76),
      verseLen: [7, 12],
      durations: ["4n.","4n","2n","4n","4n.","8n","2n","4n","4n.","2n."],
      mood: ["tendre et enveloppant","romantique et doux","intime et chaleureux","passionné et rêveur"],
    },
  };

  // GAMMES MINEURES — émotions négatives
  const MINOR_SCALES = {
    tristesse: {
      keys: [
        { root:"Dm", notes:["D4","E4","F4","G4","A4","Bb4","C5","D5","E5","F5"] },
        { root:"Am", notes:["A3","B3","C4","D4","E4","F4","G4","A4","B4","C5"] },
        { root:"Em", notes:["E3","F#3","G3","A3","B3","C4","D4","E4","F#4","G4"] },
        { root:"Bm", notes:["B3","C#4","D4","E4","F#4","G4","A4","B4","C#5","D5"] },
      ],
      bpm: () => +rnd(44, 66).toFixed(0),
      reverbWet: () => rnd(0.76, 0.90),
      verseLen: [8, 14],
      durations: ["2n","4n.","4n","2n.","4n","8n","4n.","2n","4n","1n"],
      mood: ["mélancolique et lent","douloureux et intime","sombre et profond","brisé et fragile"],
    },
    colere: {
      keys: [
        { root:"Am", notes:["A3","B3","C4","D4","E4","F4","G4","A4","B4","C5"] },
        { root:"Dm", notes:["D3","E3","F3","G3","A3","Bb3","C4","D4","E4","F4"] },
        { root:"Gm", notes:["G3","A3","Bb3","C4","D4","Eb4","F4","G4","A4","Bb4"] },
        { root:"Cm", notes:["C3","D3","Eb3","F3","G3","Ab3","Bb3","C4","D4","Eb4"] },
      ],
      bpm: () => +rnd(108, 140).toFixed(0),
      reverbWet: () => rnd(0.24, 0.40),
      verseLen: [6, 10],
      durations: ["8n","8n","8n","4n","8n","8n","4n","16n","8n","4n"],
      mood: ["violent et haché","tendu et explosif","rageur et saccadé","brutal et urgent"],
    },
    peur: {
      keys: [
        { root:"Bm", notes:["B3","C#4","D4","E4","F#4","G4","A4","B4","C#5","D5"] },
        { root:"F#m", notes:["F#3","G#3","A3","B3","C#4","D4","E4","F#4","G#4","A4"] },
        { root:"Cm", notes:["C4","D4","Eb4","F4","G4","Ab4","Bb4","C5","D5","Eb5"] },
        { root:"Gm", notes:["G3","A3","Bb3","C4","D4","Eb4","F4","G4","A4","Bb4"] },
      ],
      bpm: () => +rnd(46, 68).toFixed(0),
      reverbWet: () => rnd(0.80, 0.93),
      verseLen: [7, 11],
      durations: ["4n.","8n","2n","4n","8n","4n.","2n","4n","8n","2n."],
      mood: ["angoissant et suspendu","tremblant et instable","glacial et oppressant","sombre et menaçant"],
    },
    nostalgie: {
      keys: [
        { root:"Am", notes:["A3","B3","C4","D4","E4","F4","G4","A4","B4","C5"] },
        { root:"Em", notes:["E3","F#3","G3","A3","B3","C4","D4","E4","F#4","G4"] },
        { root:"Dm", notes:["D3","E3","F3","G3","A3","Bb3","C4","D4","E4","F4"] },
        { root:"Bm", notes:["B3","C#4","D4","E4","F#4","G4","A4","B4","C#5","D5"] },
      ],
      bpm: () => +rnd(60, 82).toFixed(0),
      reverbWet: () => rnd(0.64, 0.78),
      verseLen: [8, 13],
      durations: ["4n.","4n","2n","8n","4n","4n.","2n","4n","2n.","4n"],
      mood: ["nostalgique et lointain","doux-amer et rêveur","évocateur et flottant","mélancolique et tendre"],
    },
    neutre: {
      keys: [
        { root:"Am", notes:["A3","B3","C4","D4","E4","F4","G4","A4","B4","C5"] },
        { root:"C",  notes:["C4","D4","E4","F4","G4","A4","B4","C5","D5","E5"] },
      ],
      bpm: () => +rnd(76, 100).toFixed(0),
      reverbWet: () => rnd(0.48, 0.64),
      verseLen: [6, 10],
      durations: ["4n","8n","4n.","4n","8n","2n","4n","8n"],
      mood: ["équilibré et fluide","contemplatif et posé"],
    },
  };

  const detectCategory = (text) => {
    const t = text.toLowerCase();
    if (/triste|pleur|deuil|perd|larme|mélanc|chagrin|douleur/.test(t)) return "tristesse";
    if (/joie|heureux|bonheur|rire|fête|content|euphor|exalt/.test(t)) return "joie";
    if (/colère|rage|furieux|énerv|fruste|revolt|indigna/.test(t)) return "colere";
    if (/peur|anxieux|angoisse|stress|effroi|crainte|terreur/.test(t)) return "peur";
    if (/sérén|calme|paisib|tranquil|zen|apais|repos/.test(t)) return "serenite";
    if (/amour|aime|tendress|passion|romantique|coeur/.test(t)) return "amour";
    if (/nostalg|souvenir|passé|enfance|autrefois|lointain/.test(t)) return "nostalgie";
    return "neutre";
  };

  const ALL_SCALES = { ...MAJOR_SCALES, ...MINOR_SCALES };
  const POSITIVE = ["joie","serenite","amour"];

  const cat     = detectCategory(emotion);
  const palette = ALL_SCALES[cat] || MINOR_SCALES.neutre;
  const key     = pick(palette.keys);
  const mood    = pick(palette.mood);
  const bpm     = palette.bpm();
  const reverbWet = palette.reverbWet();
  const isPositive = POSITIVE.includes(cat);
  const [minLen, maxLen] = palette.verseLen;

  const PROMPT = `Tu es un compositeur. Génère 2 verses mélodiques qui capturent une émotion.
RÉPONDS UNIQUEMENT AVEC DU JSON VALIDE. Pas de markdown. Seed: ${seed}.

{
  "category": "${cat}",
  "mode": "${isPositive ? "majeur" : "mineur"}",
  "key": "${key.root}",
  "title": "titre poétique en français (2-4 mots)",
  "description": "phrase courte et poétique (10-20 mots)",
  "bpm": ${bpm},
  "reverbWet": ${reverbWet},
  "verse1": [
    {"note":"D4","dur":"4n"},
    {"note":"F4","dur":"4n."},
    {"note":"A4","dur":"2n"}
  ],
  "verse2": [
    {"note":"G4","dur":"8n"},
    {"note":"E4","dur":"4n"},
    {"note":"C4","dur":"2n."}
  ]
}

RÈGLES STRICTES :
- Gamme ${isPositive ? "MAJEURE" : "MINEURE"} — utilise UNIQUEMENT ces notes : ${JSON.stringify(key.notes)}
- Durées autorisées : ${JSON.stringify(palette.durations)}
- verse1 : ${minLen} à ${maxLen} notes — ${mood} — introduit le thème
- verse2 : ${minLen} à ${maxLen} notes — répond ou développe le thème de verse1
- Les 2 verses doivent être différents mais cohérents entre eux
- Alterne les durées, varie les hauteurs, crée des phrases expressives
- Pas de gamme mécanique montante ou descendante
- Seed ${seed} — cette composition doit être UNIQUE`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 1200,
        temperature: 1.2,
        messages: [
          { role: "system", content: PROMPT },
          { role: "user", content: `Émotion : "${emotion}" — seed ${seed}` },
        ],
      }),
    });

    const text = await response.text();
    if (!response.ok) return res.status(500).json({ error: `Groq ${response.status}: ${text.slice(0,200)}` });

    let data;
    try { data = JSON.parse(text); }
    catch(e) { return res.status(500).json({ error: `Réponse invalide: ${text.slice(0,200)}` }); }

    if (data.error) return res.status(500).json({ error: data.error.message });
    if (!data.choices?.[0]?.message?.content) return res.status(500).json({ error: "Réponse vide" });

    const raw = data.choices[0].message.content.replace(/```json\n?|```/g, "").trim();
    let composition;
    try { composition = JSON.parse(raw); }
    catch(e) { return res.status(500).json({ error: `JSON invalide: ${raw.slice(0,200)}` }); }

    return res.status(200).json(composition);
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
