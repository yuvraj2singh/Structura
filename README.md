# Structura

> **AI-powered collaborative whiteboard + DSA visualizer** built with Next.js, Socket.IO, MongoDB, and Gemini AI.

🌐 **Live Demo:** [https://structura-7zu5.onrender.com](https://structura-7zu5.onrender.com)

---

## ✨ Features

| Feature | Status |
|---|---|
| 🎨 Infinite canvas (pan/zoom, shapes, freehand) | ✅ |
| 🧮 DSA Lab (arrays, linked lists, trees, graphs, heaps) | ✅ |
| 🤖 AI Canvas Generator (Gemini — describe anything) | ✅ |
| 👥 Real-time collaboration (Socket.IO cursors + sync) | ✅ |
| 📜 Version History (auto-save + named snapshots) | ✅ |
| 📤 Export (PNG, SVG, JSON) | ✅ |
| 🔗 Board sharing (public link, invite by email) | ✅ |
| 💬 Canvas Comments (anchored threads) | ✅ |
| ⌨️ Command Palette (⌘K) | ✅ |
| 🌓 Dark / Light mode | ✅ |

---

## 🚀 Quick Start

### 1. Clone & install

```bash
git clone https://github.com/yourusername/structura.git
cd structura
npm install
```

### 2. Set up environment

```bash
cp .env.example .env.local
# Fill in the values — see .env.example for instructions
```

Minimum required variables:
- `MONGODB_URI` — MongoDB Atlas connection string
- `JWT_SECRET` — any 64-char random string (`openssl rand -base64 64`)
- `NEXT_PUBLIC_APP_URL` — `http://localhost:3000` in dev

### 3. Run development server

```bash
# Without real-time collaboration:
npm run dev

# WITH real-time collaboration (Socket.IO):
npm run dev:collab
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Enable AI generation

Get a **free** Gemini API key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey), then:

```env
GEMINI_API_KEY=AIza...your-key
GEMINI_MODEL=gemini-1.5-flash
```

---

## 📁 Project Structure

```
structura/
├── app/                        # Next.js App Router
│   ├── api/                    # API routes
│   │   ├── auth/               # Login, register, Google OAuth
│   │   ├── boards/             # CRUD, versions, comments
│   │   └── ai/generate/        # Gemini AI generation
│   ├── board/[id]/page.js      # Canvas board page
│   ├── dashboard/              # User dashboard
│   └── layout.js               # Root layout
│
├── components/
│   ├── canvas/                 # Canvas, Toolbar, Properties, ContextMenu
│   ├── board/                  # BoardNav, VersionHistory, Share, Comments
│   ├── collab/                 # RemoteCursors, CollaboratorAvatars
│   ├── dsa/                    # DSAPanel
│   └── ui/                     # CommandPalette, Toaster, ShortcutsModal
│
├── store/                      # Zustand stores (canvas, auth, collab, theme)
├── hooks/                      # useSocket (Socket.IO client)
├── lib/                        # Utils, DB, auth, AI prompt/parser, export
├── models/                     # Mongoose models (User, Board, BoardVersion, Comment)
└── server.js                   # Custom Node server (Next.js + Socket.IO)
```

---

## 🌐 Production Deployment

### Option A — Vercel (recommended, no Socket.IO)

```bash
npm run build
# Deploy to Vercel — real-time collab disabled (use Pusher/Ably instead)
vercel deploy
```

### Option B — VPS / Railway with Socket.IO

```bash
npm run build
NODE_ENV=production node server.js
```

> Use **PM2** to keep it alive: `pm2 start server.js --name structura`

### Option C — Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm ci && npm run build
EXPOSE 3000
CMD ["node", "server.js"]
```

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|---|---|
| `V` | Select tool |
| `H` | Hand / Pan |
| `P` | Pen / Freehand |
| `R` / `C` / `L` / `A` | Rectangle / Circle / Line / Arrow |
| `T` | Text |
| `E` | Eraser |
| `⌘K` | Command Palette |
| `?` | Keyboard shortcuts help |
| `⌘Z` / `⌘⇧Z` | Undo / Redo |
| `⌘D` | Duplicate selection |
| `Delete` | Delete selected |
| `Escape` | Close panel / Deselect |
| Right-click | Context menu |

---

## 🧪 Tech Stack

- **Framework**: Next.js 16 (App Router, JS only)
- **Database**: MongoDB + Mongoose
- **Auth**: JWT + Google OAuth
- **Real-time**: Socket.IO
- **AI**: Google Gemini (`@google/generative-ai`)
- **State**: Zustand
- **Styling**: Vanilla CSS (design token system)
- **Icons**: Lucide React

---

## 📄 License

MIT © Yuvraj Singh
