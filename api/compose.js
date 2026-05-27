export default async function handler(req, res) {
  // Autoriser les requêtes depuis n'importe quel domaine (à restreindre en prod)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { emotion } = req.body;
  if (!emotion) return res.status(400).json({ error: "Emotion manquante" });

  const PROMPT = `Tu es un compositeur acoustique. L'utilisateur décrit une émotion. Génère une composition en JSON pur.
RÉPONDS UNIQUEMENT AVEC DU JSON VALIDE. Pas de markdown ni backticks.

{
  "category": "tristesse|joie|colère|peur|sérénité|amour|nostalgie|neutre",
  "title": "titre poétique en français (3-5 mots)",
  "description": "description poétique en français (1-2 phrases, 20-40 mots)",
  "bpm": 70,
  "chords": [
    {"bar":0,"notes":["D3","F3","A3"],"bars":2},
    {"bar":2,"notes":["C3","E3","G3"],"bars":2},
    {"bar":4,"notes":["Bb2","D3","F3"],"bars":2},
    {"bar":6,"notes":["A2","C#3","E3"],"bars":2}
  ],
  "melody": [
    {"bar":0,"beat":0,"note":"D4","dur":"4n"},
    {"bar":0,"beat":1,"note":"F4","dur":"4n"},
    {"bar":0,"beat":2,"note":"A4","dur":"2n"}
  ],
  "melodyOsc":"fatsine","melodyAttack":0.08,"melodyDecay":0.3,"melodySustain":0.6,"melodyRelease":2.0,
  "melodyDetune":8,"melodyCount":3,
  "padOsc":"fattriangle","padAttack":1.8,"padRelease":5.0,"padDetune":12,"padCount":4,
  "vibratoFreq":5.2,"vibratoDepth":0.06,
  "chorusFreq":1.8,"chorusDepth":0.4,"chorusDelayTime":3.5,
  "reverbDecay":4,"reverbWet":0.7
}

TIMBRE (sons organiques uniquement) :
- melodyOsc: "fatsine" (voix/chaleur) | "fattriangle" (flute/douceur) | "fatquad" (cordes frottées)
- padOsc: "fattriangle" (cordes) | "fatsine" (orgue doux) | "fatquad" (violoncelle)
- melodyCount/padCount: 2-4 oscillateurs superposés
- vibratoDepth: 0.04-0.12, chorusDepth: 0.3-0.6

MUSIQUE :
- 8 mesures 4/4, 4 accords de 2 mesures chacun
- Melody: 24-32 notes, bar 0-7, beat 0-3, dur: "4n","8n","2n","4n."
- tristesse/peur: bpm 45-70, mineur, reverbWet 0.75-0.85
- nostalgie/amour: bpm 65-90, melodyOsc "fatquad"
- serenite: bpm 70-95, majeur, melodyOsc "fattriangle"
- joie: bpm 110-145, majeur
- colere: bpm 100-140, mineur`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2500,
        system: PROMPT,
        messages: [{ role: "user", content: `Compose pour : "${emotion}"` }],
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const raw = data.content.map(b => b.text || "").join("").replace(/```json\n?|```/g, "").trim();
    const composition = JSON.parse(raw);
    return res.status(200).json(composition);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
