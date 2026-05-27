# Emotion Music

Turn feelings into music. Describe an emotion — a unique piece is composed and synthesized in real time, directly in your browser.

Built with Claude AI + Tone.js.

---

## How it works

1. You describe an emotion in free text
2. Claude analyzes it and composes musical parameters (key, tempo, chords, melody, timbre)
3. Tone.js synthesizes the piece live in the browser with warm, organic sounds

3 free compositions, then a paywall.

## Stack

- [React](https://react.dev) + [Vite](https://vitejs.dev)
- [Tone.js](https://tonejs.github.io) — web audio synthesis
- [Claude API](https://anthropic.com) — composition engine
- [Vercel](https://vercel.com) — hosting + serverless API proxy

## Project structure

```
emotion-music/
├── api/
│   └── compose.js        # Vercel serverless function (keeps API key secret)
├── src/
│   └── App.jsx           # Main React app
├── index.html
├── vite.config.js
└── vercel.json
```

## Run locally

```bash
npm install
```

Create a `.env` file at the root:

```
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxx
```

```bash
npm run dev
```

## Deploy on Vercel

1. Push this repo to GitHub
2. Import the project on [vercel.com](https://vercel.com)
3. Add `ANTHROPIC_API_KEY` in Settings → Environment Variables
4. Deploy — done

## Embed in WordPress

```html
<iframe
  src="https://your-app.vercel.app"
  width="100%"
  height="650"
  style="border:none; border-radius:12px">
</iframe>
```

## License

MIT
