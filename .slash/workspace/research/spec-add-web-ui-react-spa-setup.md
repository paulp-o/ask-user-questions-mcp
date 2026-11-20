# Research: React 19 SPA Setup with Vite, shadcn/ui, Tailwind v4, Jotai v2, React Router v7

**Date**: 2026-03-28

## Summary

This document provides concrete TypeScript code examples for setting up a React 19 SPA with Vite, shadcn/ui, Tailwind CSS v4, Jotai v2, React Router v7, and npm workspaces in a monorepo structure. All examples reflect the exact APIs as of early 2026.

---

## 1. Vite + React 19 Setup

### Installation

```bash
npm create vite@latest packages/web-ui -- --template react-ts
cd packages/web-ui
npm install react@19 react-dom@19 @types/react@19 @types/react-dom@19
npm install -D @vitejs/plugin-react
```

### vite.config.ts Configuration

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [
    react({
      // Enable React 19 features
      babel: {
        parserOpts: {
          plugins: ["react-compiler"],
        },
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "../shared/src"),
    },
  },
  build: {
    outDir: "dist",
    // Output directory for build artifacts
    rollupOptions: {
      output: {
        // Chunk splitting for better caching
        manualChunks: {
          "vendor-react": ["react", "react-dom"],
          "vendor-router": ["react-router-dom"],
          "vendor-jotai": ["jotai"],
        },
      },
    },
  },
  // Required for Tailwind CSS v4
  css: {
    postcss: "./postcss.config.js",
  },
});
```

### TypeScript Configuration (tsconfig.json)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["./src/*"],
      "@shared/*": ["../shared/src/*"]
    },
    "baseUrl": "."
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

---

## 2. shadcn/ui Initialization in Monorepo

### Running Init in Monorepo

From your monorepo root, run the CLI targeting the web-ui package:

```bash
cd packages/web-ui
npx shadcn@latest init
```

Or use the `--monorepo` flag to auto-scaffold a monorepo structure:

```bash
npx shadcn@latest init --monorepo
```

### components.json Configuration

For Tailwind CSS v4, leave the `tailwind` config empty.

**packages/web-ui/components.json** (app package):

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "radix-nova",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "../../packages/ui/src/styles/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/components",
    "hooks": "@/hooks",
    "lib": "@/lib",
    "utils": "@workspace/ui/lib/utils",
    "ui": "@workspace/ui/components"
  }
}
```

**packages/ui/components.json** (UI package):

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "radix-nova",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/styles/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@workspace/ui/components",
    "utils": "@workspace/ui/lib/utils",
    "hooks": "@workspace/ui/hooks",
    "lib": "@workspace/ui/lib",
    "ui": "@workspace/ui/components"
  }
}
```

### Files Created by shadcn

After running `shadcn init`, the following files are created:

```
packages/web-ui/
├── src/
│   ├── lib/
│   │   └── utils.ts          # cn() utility function
│   └── App.tsx               # Entry point
├── index.html
├── package.json
└── vite.config.ts

packages/ui/                   # (if using separate UI package)
├── src/
│   ├── components/
│   │   └── ui/               # shadcn components go here
│   ├── hooks/
│   │   └── use-theme.ts
│   ├── lib/
│   │   └── utils.ts
│   └── styles/
│       └── globals.css
├── components.json
└── package.json
```

### Importing shadcn Components

```typescript
// In packages/web-ui
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { useTheme } from "@workspace/ui/hooks/use-theme";
```

---

## 3. Tailwind CSS v4 Integration

### Installation

```bash
npm install tailwindcss @tailwindcss/vite
```

### Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

### CSS Setup with @import

**IMPORTANT**: Tailwind v4 uses `@import "tailwindcss"` NOT the v3 `@tailwind` directives.

```css
/* packages/ui/src/styles/globals.css */
@import "tailwindcss";

/* Custom theme variables */
@theme {
  --color-primary: oklch(0.6 0.2 250);
  --color-primary-foreground: oklch(0.98 0 0);
  --color-secondary: oklch(0.97 0 0);
  --color-secondary-foreground: oklch(0.1 0 0);
  --color-muted: oklch(0.97 0 0);
  --color-muted-foreground: oklch(0.56 0 0);
  --color-accent: oklch(0.97 0 0);
  --color-accent-foreground: oklch(0.1 0 0);
  --color-destructive: oklch(0.58 0.22 25);
  --color-destructive-foreground: oklch(0.98 0 0);
  --color-border: oklch(0.92 0 0);
  --color-input: oklch(0.92 0 0);
  --color-ring: oklch(0.7 0 0);
  --radius: 0.625rem;

  --font-sans: ui-sans-serif, system-ui, sans-serif;
}

/* Dark mode variables */
.dark {
  --color-primary: oklch(0.6 0.2 250);
  --color-primary-foreground: oklch(0.98 0 0);
  --color-secondary: oklch(0.3 0 0);
  --color-secondary-foreground: oklch(0.98 0 0);
  --color-muted: oklch(0.26 0 0);
  --color-muted-foreground: oklch(0.64 0 0);
  --color-accent: oklch(0.26 0 0);
  --color-accent-foreground: oklch(0.98 0 0);
  --color-destructive: oklch(0.4 0.22 25);
  --color-destructive-foreground: oklch(0.98 0 0);
  --color-border: oklch(0.26 0 0);
  --color-input: oklch(0.26 0 0);
  --color-ring: oklch(0.7 0 0);
}

/* Base styles */
@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

### Importing CSS in React

```typescript
// packages/web-ui/src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import '@workspace/ui/styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
```

---

## 4. Jotai v2 - Atom Patterns

### Basic Atoms

```typescript
// packages/shared/src/atoms/index.ts
import { atom } from "jotai";

// Primitive atoms
export const countAtom = atom(0);
export const nameAtom = atom("Alice");
export const userAtom = atom<{ id: number; name: string }>({
  id: 1,
  name: "Bob",
});

// Read-only derived atom
export const doubleCountAtom = atom((get) => get(countAtom) * 2);

// Write-only atom
export const resetCountAtom = atom(
  null, // read is not required
  (get, set) => {
    set(countAtom, 0);
  },
);

// Read-write derived atom
export const incrementCountAtom = atom(
  (get) => get(countAtom),
  (get, set, amount: number) => {
    set(countAtom, get(countAtom) + amount);
  },
);

// Async atom (read)
export const userDataAtom = atom(async (get) => {
  const userId = get(countAtom);
  const response = await fetch(
    `https://jsonplaceholder.typicode.com/users/${userId}?_delay=1000`,
    { signal: get.userSignal },
  );
  return response.json();
});
```

### Using Atoms with React Hooks

```typescript
// packages/web-ui/src/components/Counter.tsx
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import {
  countAtom,
  doubleCountAtom,
  incrementCountAtom,
  resetCountAtom,
} from '@shared/atoms'

// Full read-write access
export function Counter() {
  const [count, setCount] = useAtom(countAtom)
  const doubled = useAtomValue(doubleCountAtom)
  const increment = useSetAtom(incrementCountAtom)
  const reset = useSetAtom(resetCountAtom)

  return (
    <div>
      <p>Count: {count}</p>
      <p>Doubled: {doubled}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
      <button onClick={() => increment(5)}>Add 5</button>
      <button onClick={reset}>Reset</button>
    </div>
  )
}

// Read-only component (optimization)
export function CountDisplay() {
  const count = useAtomValue(countAtom)
  return <p>Current count: {count}</p>
}

// Write-only component (optimization)
export function CountController() {
  const setCount = useSetAtom(countAtom)

  return (
    <div>
      <button onClick={() => setCount(0)}>Reset</button>
      <button onClick={() => setCount((c) => c + 1)}>Add 1</button>
    </div>
  )
}
```

### Atom with Options (signal for async)

```typescript
import { atom } from "jotai";

// Async atom with abort signal support
export const fetchUserAtom = atom(
  async (get, { signal }: { signal?: AbortSignal }) => {
    const userId = get(countAtom);
    const response = await fetch(
      `https://jsonplaceholder.typicode.com/users/${userId}`,
      { signal },
    );
    return response.json();
  },
);
```

### Jotai Provider

```typescript
// packages/web-ui/src/App.tsx
import { Provider } from 'jotai'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'

export function App() {
  return (
    <Provider>
      <RouterProvider router={router} />
    </Provider>
  )
}
```

---

## 5. React Router v7 - createHashRouter

### Router Setup

```typescript
// packages/web-ui/src/router.ts
import { createHashRouter, RouterProvider } from 'react-router-dom'
import type { RouteObject } from 'react-router-dom'

// Import pages
import { HomePage } from './pages/HomePage'
import { AboutPage } from './pages/AboutPage'
import { UserPage } from './pages/UserPage'
import { NotFoundPage } from './pages/NotFoundPage'

const routes: RouteObject[] = [
  {
    path: '/',
    name: 'home',
    Component: HomePage,
  },
  {
    path: '/about',
    name: 'about',
    Component: AboutPage,
  },
  {
    path: '/users',
    name: 'users',
    children: [
      {
        index: true,
        Component: () => <div>Select a user</div>,
      },
      {
        path: ':userId',
        Component: UserPage,
        // Route-level loader for data fetching
        loader: async ({ params }) => {
          const response = await fetch(
            `https://jsonplaceholder.typicode.com/users/${params.userId}`
          )
          return { user: response.json() }
        },
      },
    ],
  },
  {
    path: '*',
    Component: NotFoundPage,
  },
]

// Create hash router for SPA (no server required)
export const router = createHashRouter(routes, {
  // Optional: basename for deployment to subdirectory
  basename: '/',
  // Optional: future flags for v7 features
  future: {
    v7_fetcherPersist: true,
    v7_normalizeFormMethod: true,
    v7_prependBasename: true,
  },
})
```

### Using with React

```typescript
// packages/web-ui/src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'jotai'
import { router } from './router'
import '@workspace/ui/styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider>
      <RouterProvider router={router} />
    </Provider>
  </React.StrictMode>
)
```

### Navigation with Link

```typescript
import { Link, NavLink } from 'react-router-dom'

export function Navigation() {
  return (
    <nav>
      <Link to="/">Home</Link>
      <Link to="/about">About</Link>
      <Link to="/users/1">User 1</Link>

      {/* NavLink for active state styling */}
      <NavLink
        to="/about"
        className={({ isActive }) => isActive ? 'active' : ''}
      >
        About
      </NavLink>
    </nav>
  )
}
```

### Using useParams and useLoaderData

```typescript
// packages/web-ui/src/pages/UserPage.tsx
import { useParams, useLoaderData } from 'react-router-dom'

export function UserPage() {
  const { userId } = useParams()
  const { user } = useLoaderData() as { user: { name: string } }

  return (
    <div>
      <h1>User: {userId}</h1>
      <p>Name: {user?.name}</p>
    </div>
  )
}
```

---

## 6. Monorepo Workspace Package Setup

### Root package.json

```json
{
  "name": "my-monorepo",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "dev": "npm run dev --workspace=packages/web-ui",
    "build": "npm run build --workspaces --if-present",
    "test": "npm run test --workspaces --if-present"
  }
}
```

### packages/shared/package.json

```json
{
  "name": "@my-org/shared",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./atoms": "./src/atoms/index.ts",
    "./types": "./src/types/index.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "build": "tsc"
  },
  "peerDependencies": {
    "jotai": ">=2.0.0",
    "react": ">=18.0.0"
  }
}
```

### packages/web-ui/package.json

```json
{
  "name": "@my-org/web-ui",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.0.0",
    "jotai": "^2.0.0",
    "@my-org/shared": "workspace:*"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "typescript": "^5.0.0",
    "vite": "^6.0.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/vite": "^4.0.0"
  }
}
```

### Using Workspace Protocol

The `workspace:*` protocol links to local packages:

```bash
# Install shared package from workspace
npm install @my-org/shared@workspace:*
# or shorthand
npm install @my-org/shared@*
```

This resolves to the local `packages/shared` directory during development.

### Importing from Shared Package

```typescript
// packages/web-ui/src/pages/HomePage.tsx
import { countAtom, userAtom } from '@my-org/shared/atoms'
import type { User } from '@my-org/shared/types'
import { useAtom, useAtomValue } from 'jotai'

export function HomePage() {
  const [count, setCount] = useAtom(countAtom)
  const user = useAtomValue(userAtom) as User

  return (
    <div>
      <h1>Hello, {user.name}</h1>
      <p>Count: {count}</p>
    </div>
  )
}
```

### Complete Monorepo Structure

```
my-monorepo/
├── package.json                    # Root with workspaces
├── pnpm-workspace.yaml             # (or use npm)
├── packages/
│   ├── shared/                     # Shared utilities & atoms
│   │   ├── src/
│   │   │   ├── atoms/
│   │   │   │   └── index.ts
│   │   │   ├── types/
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── ui/                         # shadcn components
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   └── ui/
│   │   │   │       └── button.tsx
│   │   │   ├── hooks/
│   │   │   ├── lib/
│   │   │   │   └── utils.ts
│   │   │   └── styles/
│   │   │       └── globals.css
│   │   ├── components.json
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web-ui/                     # Main SPA app
│       ├── src/
│       │   ├── pages/
│       │   │   ├── HomePage.tsx
│       │   │   ├── AboutPage.tsx
│       │   │   └── UserPage.tsx
│       │   ├── components/
│       │   ├── router.ts
│       │   ├── main.tsx
│       │   ├── App.tsx
│       │   └── index.html
│       ├── vite.config.ts
│       ├── tsconfig.json
│       └── package.json
└── turbo.json                      # (optional) Turborepo config
```

---

## Key Takeaways

1. **Tailwind v4** uses `@import "tailwindcss"` syntax (not `@tailwind` directives) and requires `@tailwindcss/vite` plugin
2. **shadcn/ui** in monorepos requires `components.json` in each workspace with proper path aliases
3. **Jotai v2** provides `useAtom`, `useAtomValue`, and `useSetAtom` for different access patterns
4. **React Router v7** `createHashRouter` enables hash-based SPA routing without server configuration
5. **npm workspaces** with `workspace:*` protocol enables seamless local package linking
