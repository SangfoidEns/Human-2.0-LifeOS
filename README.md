# HUMA 2.0

Autonomous life companion · Spine L1–S1 · FC Metalist Stuttgart · Stuttgart logistics · JARVIS

**Operator call-sign:** Хума  
**Design:** YouTube Music Dark Surface  
**Stack:** Zero-build Vanilla ESM · IndexedDB · Web Audio · Web Speech · Canvas 2D · PWA

## Quick start

```bash
# any static server
npx serve .
# or
python3 -m http.server 8080
```

Open `http://localhost:8080`. Add to Home Screen for standalone PWA.

## GitHub Pages

1. Push to `main`
2. Settings → Pages → Source: Deploy from branch `main` / root
3. Site: `https://<user>.github.io/<repo>/`

## Architecture

```
index.html
manifest.json
sw.js
src/
  app.js                 # orchestrator
  styles/theme.css
  styles/layout.css
  core/store.js          # reactive + IndexedDB
  core/audio.js          # 432/528 Hz · binaural
  core/voice.js          # Web Speech JARVIS
  modules/
    spineCanvas.js       # L1–S1 visualizer
    footballTactics.js   # cyber-pitch
    paretoParser.js      # 90/10 distillator
    chronoMatrix.js       # Feiertag · Collision Guard
    dayScheduler.js
    conveyor.js          # pasta / laundry / 90/90 timers
```

## Hotkeys (desktop)

- Nav via bottom bar
- Voice: header toggle
- Emergency: 🚨 ПРОСТРІЛ

## Philosophy

Цілісність ОРА та ментальної енергії — понад усе.  
Zero-Standing при Strain ≥ L5.  
Дистиляція 10%. Жодного шуму.

MIT License
