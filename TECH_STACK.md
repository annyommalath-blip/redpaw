# RedPaw 🐕 — Tech Stack

## Frontend

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | React 18 | Component-based UI |
| **Language** | TypeScript 5 | Type safety |
| **Build Tool** | Vite 5 | Dev server & bundling |
| **Styling** | Tailwind CSS 3 | Utility-first CSS |
| **UI Components** | shadcn/ui + Radix UI | Accessible, composable primitives |
| **Routing** | React Router 6 | Client-side navigation |
| **State / Data** | TanStack React Query 5 | Server-state caching & sync |
| **Forms** | React Hook Form + Zod | Validation & form management |
| **Animation** | Framer Motion 12 | Page transitions & micro-interactions |
| **Maps** | Leaflet + React Leaflet | Interactive maps (lost dogs, location picker) |
| **Charts** | Recharts | Data visualization |
| **Markdown** | react-markdown | AI chat response rendering |
| **i18n** | i18next + react-i18next | Multi-language (EN, TH, LO, ZH) |
| **Theming** | next-themes | Light/dark mode |
| **Toasts** | Sonner | Notification toasts |
| **Icons** | Lucide React | SVG icon library |

## Backend (Lovable Cloud)

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Database** | PostgreSQL | Relational data storage |
| **Auth** | Built-in auth system | Email/password authentication |
| **APIs** | Auto-generated REST | CRUD via PostgREST |
| **Realtime** | WebSocket subscriptions | Live messages & notifications |
| **Edge Functions** | Deno (TypeScript) | Serverless backend logic |
| **Storage** | Object storage | Dog photos, avatars, chat images |
| **Security** | Row-Level Security (RLS) | Per-user data access control |

## AI Features

| Feature | Model | Purpose |
|---------|-------|---------|
| **AI Chat Assistant** | Google Gemini 2.5 Flash | Lost dog advice, search radius estimation, alert creation |
| **Image Analysis** | Multimodal (Gemini) | Analyze uploaded dog photos for breed/markings |
| **Search Radius Map** | Custom algorithm + Leaflet | Breed-aware escape radius visualization |

## Edge Functions

| Function | Purpose |
|----------|---------|
| `ai-assistant` | AI chatbot with tool-calling (search radius, alert creation, dog lookup) |
| `convert-heic` | HEIC → JPEG image conversion for iOS uploads |
| `translate-message` | Message translation between supported languages |

## Native App

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Bridge** | Capacitor 8 | Web → iOS/Android native wrapper |

## Dev Tooling

| Tool | Purpose |
|------|---------|
| **ESLint** | Code linting |
| **Vitest** | Unit testing |
| **PostCSS + Autoprefixer** | CSS processing |
| **lovable-tagger** | Component tagging |
