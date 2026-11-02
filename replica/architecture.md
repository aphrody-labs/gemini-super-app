# Replica Architecture: Google Gemini Web App Clone (`/app`)

## 1. Stack Selection
- **Runtime & HTTP Server**: Upstream Bun v1.4.5 (`Bun.serve()` fullstack router + WebSockets)
- **Database**: `bun:sqlite` in WAL mode (`conversations`, `messages`, `attachments`, `citations`)
- **AI Engine**: `@google/genai` SDK (`gemini-3.8-flash`, `gemini-4-argon`, `gemini-3.8-live`, `gemini-3.8-flash-tts`)
- **Styling**: Semantic CSS Custom Properties (`replica/design/tokens.css`) with Light/Dark theme parity and 100% WCAG 2.2 AA/AAA contrast compliance

---

## 2. Database Schema (SQLite WAL)

```sql
CREATE TABLE IF NOT EXISTS app_conversations (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  model_id TEXT NOT NULL DEFAULT 'gemini-3.8-flash',
  is_pinned INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS app_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  thought_process TEXT,
  citations_json TEXT NOT NULL DEFAULT '[]',
  attachments_json TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES app_conversations(id) ON DELETE CASCADE
);
```

---

## 3. API Routes (`apps/gemini_super_app/src/server.ts`)

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/app` | Serves the clean-room Gemini Web App UI (`S01`–`S05`) |
| `GET` | `/api/app/conversations` | Lists conversations ordered by `is_pinned DESC, updated_at DESC` |
| `POST` | `/api/app/conversations` | Creates a new conversation session |
| `GET` | `/api/app/conversations/:id` | Returns conversation metadata and full message thread |
| `POST` | `/api/app/conversations/:id/messages` | Appends user message, invokes Gemini model (`gemini-3.8-flash` / `gemini-4-argon`), persists and returns assistant turn |
| `PATCH` | `/api/app/conversations/:id` | Updates `title` or `is_pinned` status |
| `DELETE` | `/api/app/conversations/:id` | Deletes a conversation and its messages |

---

## 4. Build Order (Vertical Slice First)
1. **Shell & Tokens**: Wire `tokens.css` variables, responsive layout (`390px` mobile to `1440px` desktop), collapsible sidebar rail, and top bar with model switcher.
2. **Vertical Slice**: `S01` Zero State -> submit prompt in `S04` Omni Dock -> transition to `S02` Active Thread -> persist in SQLite via `/api/app/conversations/:id/messages` -> render markdown + thought accordion + citations.
3. **S03 Sidebar**: Group conversations (`Pinned`, `Today`, `Previous 7 days`), pin/unpin, delete, search filter, and new chat reset.
4. **S04 Multimodal Dock**: File attachment chips, auto-growing textarea, keyboard shortcuts (`Enter` to send, `Shift+Enter` newline).
5. **S05 Live Voice Overlay**: Full-duplex SVG Gemini Orb with 32-band radial FFT visualizer, live captions, mute/unmute, and connection to `:8765` Voice Hub.
