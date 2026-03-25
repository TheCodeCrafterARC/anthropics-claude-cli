# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Initial setup (install deps, generate Prisma client, run migrations)
npm run setup

# Development server (uses Turbopack)
npm run dev

# Build for production
npm run build

# Lint
npm lint

# Run all tests
npm test

# Run a single test file
npx vitest run src/components/editor/__tests__/file-tree.test.tsx

# Reset database
npm run db:reset
```

The dev server requires `NODE_OPTIONS='--require ./node-compat.cjs'` (already included in the npm scripts).

## Architecture

UIGen is an AI-powered React component generator. Users describe components in a chat interface, Claude generates them using tools, and the results appear in a live preview.

### Request Flow

1. User sends a message in `ChatInterface`
2. `ChatProvider` (`src/lib/contexts/chat-context.tsx`) calls `/api/chat` via Vercel AI SDK's `useChat` hook, passing the current virtual file system state (`fileSystem.serialize()`) as part of the request body
3. `POST /api/chat` (`src/app/api/chat/route.ts`) reconstructs the VFS server-side, calls Claude with `str_replace_editor` and `file_manager` tools, streams back the response, and saves to the database on finish
4. Tool calls come back over the stream; `ChatProvider` passes them to `handleToolCall` from `FileSystemContext`, which mutates the in-memory VFS
5. `PreviewFrame` (`src/components/preview/PreviewFrame.tsx`) watches `refreshTrigger` from `FileSystemContext`, re-renders whenever files change by compiling everything with Babel (`@babel/standalone`) and injecting it into a sandboxed `<iframe>` via `srcdoc`

### Virtual File System

`VirtualFileSystem` (`src/lib/file-system.ts`) is an in-memory tree of `FileNode` objects. It never writes to disk. The full file tree is serialized to JSON and sent with every chat request. `FileSystemContext` (`src/lib/contexts/file-system-context.tsx`) wraps the VFS with React state and exposes `handleToolCall` to bridge AI tool calls to file operations.

### Preview System

`createImportMap` + `createPreviewHTML` (`src/lib/transform/jsx-transformer.ts`) compile all `.jsx/.tsx` files using Babel, create blob URLs for each, and wire them together in an importmap. Third-party packages are resolved via `https://esm.sh/`. Tailwind CSS is injected via CDN in the preview iframe. Entry point priority: `/App.jsx` → `/App.tsx` → `/index.jsx` → `/index.tsx` → `/src/App.jsx`.

### AI Tools

Two tools are registered in the chat API route:
- **`str_replace_editor`** (`src/lib/tools/str-replace.ts`): `create`, `str_replace`, `insert`, `view` operations on the VFS
- **`file_manager`** (`src/lib/tools/file-manager.ts`): `rename`, `delete` operations

### Provider Abstraction

`getLanguageModel()` (`src/lib/provider.ts`) returns a real `claude-haiku-4-5` model when `ANTHROPIC_API_KEY` is set, or a `MockLanguageModel` that streams static demo components. This lets the app run without an API key.

### Auth

JWT-based auth using `jose`, stored as an httpOnly cookie (`auth-token`). `src/lib/auth.ts` is `server-only`. Anonymous users can work without logging in; work is tracked in `src/lib/anon-work-tracker.ts` (localStorage) and can be saved to an account after sign-up.

### Database

Prisma with SQLite (`prisma/dev.db`). Two models: `User` (email/password) and `Project` (stores messages and file system data as JSON strings). Prisma client is generated to `src/generated/prisma`.

### Key Paths

| Path | Purpose |
|------|---------|
| `src/app/api/chat/route.ts` | Chat API endpoint |
| `src/lib/file-system.ts` | VirtualFileSystem class |
| `src/lib/transform/jsx-transformer.ts` | Babel transform + preview HTML generation |
| `src/lib/contexts/file-system-context.tsx` | React context for VFS |
| `src/lib/contexts/chat-context.tsx` | React context wrapping Vercel AI SDK useChat |
| `src/lib/provider.ts` | LLM provider (real vs mock) |
| `src/lib/prompts/generation.tsx` | System prompt for component generation |
| `src/components/preview/PreviewFrame.tsx` | Live preview iframe |
| `src/app/main-content.tsx` | Root layout: chat panel + preview/code panel |

### Testing

Tests use Vitest + jsdom + React Testing Library. Config is in `vitest.config.mts`. Tests live alongside source in `__tests__/` subdirectories.
