# ⚡ ZapHive — Free Browser Game Portal

A lightweight, mobile-friendly browser game portal built with pure HTML, CSS, and JavaScript. No frameworks. No heavy libraries. Works on low-end devices.

---

## 📁 Project Structure

```
ZapHive/
├── index.html       — Public homepage (game grid, categories, search)
├── game.html        — Individual game player page
├── developer.html   — Hidden developer dashboard
├── style.css        — All styles (one file, CSS variables)
├── main.js          — Homepage logic (load games, filter, search)
├── dev.js           — Developer dashboard logic
├── games.json       — Game database (edit or auto-managed via dev panel)
└── assets/          — Optional: local images, icons
```

---

## 🚀 Running the Project

**Option 1 — Local (VS Code + Live Server)**
Open folder in VS Code → right-click `index.html` → "Open with Live Server"

**Option 2 — Replit**
Upload all files → click Run. Use the built-in web server.

**Option 3 — GitHub Pages**
Push to a repo → Settings → Pages → Source: `main` branch, root.

**Option 4 — OneCompiler / StackBlitz**
Upload all files, run from `index.html`.

> ⚠️ Must be served via HTTP/HTTPS (not opened as `file://`) because `games.json` is fetched with `fetch()`.

---

## 🎮 How It Works

### Homepage
- Loads all games from `games.json`
- Only shows games with `"status": "Published"`
- Groups games by category automatically
- Search filters across title, category, and description

### Game Page
- URL: `game.html?id=GAME_ID`
- Embeds the game in an iframe
- Increments play count, saved in localStorage

### Developer Panel
- URL: `developer.html`
- Access code: **CLUMZY1357**
- Upload, edit, and delete games
- All changes persist in `localStorage` (simulates a backend)
- Stats update live

---

## 🎨 Theme Colors

| Variable           | Value       | Use              |
|--------------------|-------------|------------------|
| `--bg-primary`     | `#050d1a`   | Page background  |
| `--accent-blue`    | `#1a8cff`   | Buttons, borders |
| `--accent-cyan`    | `#00cfff`   | Headings, accents|
| `--accent-yellow`  | `#ffd600`   | Logo, highlights |
| `--text-white`     | `#e8f0ff`   | Body text        |

---

## ➕ Adding Games Manually

Edit `games.json` and add a new entry to the `"games"` array:

```json
{
  "id": "g999",
  "title": "My Game",
  "logo": "https://...",
  "description": "Short description.",
  "category": "Arcade",
  "status": "Published",
  "embedCode": "https://game-url.com/",
  "playCount": 0,
  "dateAdded": "2025-02-01"
}
```

Valid categories: `Action`, `Driving`, `Multiplayer`, `Puzzle`, `Arcade`, `IO Games`, `New Games`

Valid status values: `Published`, `In Development`

---

## 📱 Performance Notes

- No frameworks, no jQuery, no React
- Images use `loading="lazy"`
- Minimal animations (CSS only)
- Single CSS file with variables
- DOM updates are batched
- Works on Android 5+, iOS 11+, older laptops

---

## 🔐 Security Notes

- Developer panel uses session-only auth (`sessionStorage`)
- All game data stored in `localStorage` on client
- Input sanitized with HTML escaping before DOM insertion
- No server required

---

*Built for ZapHive — Fast, free, browser games.*
