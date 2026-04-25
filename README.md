# Passad AI (`ai_task_agent`)

**Passad AI** is a [Next.js](https://nextjs.org) app for running multi-step AI agents: a landing page in [`src/app/page.tsx`](src/app/page.tsx) (hero, feature sections, and **how it works**) plus an embedded **agent interface** for chat.

## What it does

- **Research, data, and database agents** in one UI — pick a mode, start a session, and chat with streaming tool use (Vercel **AI SDK** + **AI Elements**-style components).
- **Sign in with Google** via **Convex Auth**; chats are tied to the logged-in user and stored in **Convex**.

## Local development

```bash
npm install
npx convex dev
```

In a second terminal:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Configure Convex, OAuth, and any model/API env vars for your deployment as in your own setup (this repo may not include `.env` files).

## Project layout (short)

| Area | Role |
|------|------|
| `src/app/page.tsx` | Home layout: hero, `HomeAgentSection`, features, “how it works” |
| `src/components/Agent.tsx` | Tabbed agent UI (research / data / database) |
| `convex/` | Auth, chat persistence, HTTP routes for agents |

**Production build:** `npm run build` then `npm start`.
