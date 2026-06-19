# 📌 Private Pin

🔗 **Live site:** [https://gakipaiperopero.github.io/private-pin/](https://gakipaiperopero.github.io/private-pin/)

A Pinterest-like dashboard for organizing images and videos into boards, with full offline support via IndexedDB. All data stays in your browser — nothing is uploaded to any server.

## ✨ Features

- 📋 **Board organization** — Create boards, add pins, browse by board
- 🔍 **Pin preview** — Click any pin to view it full-size with metadata
- 📤 **Upload images & videos** — Drag-and-drop or click to select. Supports `image/*` and `video/*`
- 🌐 **Import from URL** — Paste any image URL to auto-load it (600ms debounce, no manual load button)
- 📦 **Batch upload** — Select or drop multiple files at once. Shared metadata (tags, author, board) applies to all. Each pin gets an auto-incremented title (e.g. `Vacation 1`, `Vacation 2`)
- 🎬 **Video support** — Upload video files or import from URL. Videos render with a play overlay on cards and native controls in preview
- 🏷️ **File-type tags** — Each pin automatically gets an `image` or `video` tag based on its type
- 🏷️ **Tags** — Add comma-separated tags to pins. Click a tag on any card to filter the board by that tag (multi-tag AND logic)
- 🌐 **CORS proxy fallback** — When loading images from URL, automatically retries via CORS proxies if direct fetch fails
- 🔎 **Global search** — Search across all boards from the nav bar. Results show which board each pin belongs to; click the board name to navigate
- ❤️ **Like pins** — Heart button on each card. Liked pins float to the top of the board
- ⬇️ **Download pins** — Save button downloads the image/video file directly
- ✏️ **Edit pins** — Pencil button in the preview overlay opens the form pre-filled with existing data
- 🗑️ **Delete pins** — Trash button in preview removes the pin after confirmation
- 🔀 **Drag-and-drop reorder** — Drag pins within a board to rearrange them (order is persisted)
- 🌙 **Dark / light theme** — Toggle with the moon/sun button in the nav. Preference is saved to localStorage
- 💾 **Export / Import** — User menu (person icon) in the nav. Export downloads a `.zip` with a `metadata.json` file and all media as binary blobs. Import restores from a `.zip` backup
- 🧹 **Clear all data** — "Delete All" button in the board list header clears everything

## 💽 Data storage

All data is stored locally in your browser using IndexedDB (`PrivatePin` database). Images and videos are stored as native Blobs (not base64), making them efficient and scalable. Nothing is ever sent to a remote server.

Export creates a ZIP archive containing:
- `metadata.json` — boards and pin metadata (titles, tags, order, liked state)
- `media/*` — each uploaded file stored as a raw binary blob

## 📋 Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- npm (ships with Node.js)

## 🚀 Install & run locally

```bash
# Clone the repository
git clone https://github.com/gakipaiperopero/private-pin.git
cd private-pin

# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will be available at `http://localhost:5173` (or whatever port Vite assigns).

## 🏗️ Build for production

```bash
npm run build
```

Output goes to `dist/`. Serve with any static file server or use `npm run preview` to test locally.

## 🧩 Chrome Extension & Firefox Add-on

The `chrome-extension/` folder contains a Chrome extension that lets you pin media from any webpage.

**Features:**
- 🖼️ Hover over any `<img>` or `<video>` to show a pin button at the top-right corner
- 📌 Click the pin button to open Private Pin with the media URL pre-filled
- 🖱️ Right-click any image or video and select "PIN" from the context menu
- 🏷️ **Auto-extracts tags, author & page title** from supported sites:
  - **Pixiv** — tags and artist name
  - **Danbooru** — all tags and artist
  - **Safebooru** — all tags and artist
  - **Gelbooru** — all tags and artist
- ⚙️ Extension popup (click the toolbar icon) lets you configure the Private Pin instance URL
- 💾 Export/Import buttons open the app with auto-triggered export or import

**To install from source (Chrome):**
1. Go to `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `chrome-extension/` folder

**To install from source (Firefox):**
1. Go to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select `firefox-extension/manifest.json`

> For **permanent** installation on Firefox, the add-on must be signed by Mozilla. You can either:
> - Submit the `firefox-extension/` folder to [Mozilla Add-on Developer Hub](https://addons.mozilla.org/en-US/developers/) for signing
> - Or set `xpinstall.signatures.required` to `false` in `about:config` (Nightly/Dev edition only)

**To install from a release:**
1. Download `private-pin-chrome-extension.zip` from the [Releases page](https://github.com/gakipaiperopero/private-pin/releases)
2. Unzip the file
3. Follow the Chrome or Firefox steps above with the unzipped folder

**Popup settings:**
- 🔗 **Instance URL** — change where the extension sends pins (default: the GitHub Pages instance)
- 🌐 **Open Private Pin** — open the configured instance
- 📤 **Export Data** — open the instance and trigger a backup download
- 📥 **Import Data** — open the instance and show the restore file picker

## 🚢 Deploy to GitHub Pages

The repo includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically builds and deploys to GitHub Pages on every push to `main`.

**One-time setup:**

1. Go to your repo Settings > Pages
2. Under "Source", select **GitHub Actions**
3. Push to `main` — the workflow will run and deploy

The site will be available at `https://gakipaiperopero.github.io/private-pin/`.

## 🛠️ Tech stack

- [Vue 3](https://vuejs.org/) (Composition API, `<script setup>`)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/) (with `@tailwindcss/vite` plugin)
- [JSZip](https://stuk.github.io/jszip/) (export/import)
- IndexedDB (persistence via raw API)

## 📄 License

[MIT](LICENSE)
