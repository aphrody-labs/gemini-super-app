# RÈGLES GLOBALES OBLIGATOIRES — BUN (v1.4.4+ / v1.4.5)

Sources officielles de référence :
- **Release Bun v1.4.4+** : https://bun.com/blog/bun-v1.4.4
- **Documentation officielle Bun** : https://github.com/oven-sh/bun/tree/main/docs
- **Guides officiels Bun** : https://bun.com/guides

---

## 1. Utiliser Bun par défaut à la place de Node.js, npm, pnpm, yarn, Vite et Prettier

- **Exécution JS/TS/JSX/TSX** : Utiliser `bun <file>` ou `bun run <file>` au lieu de `node <file>` ou `ts-node <file>`.
- **Placement des flags Bun** : Toujours placer les flags de Bun immédiatement après `bun` (ex. `bun --watch run index.ts`), jamais après le nom du script.
- **Formatage de code (`bun fmt` — nouveauté Bun v1.4.4)** : Utiliser le formateur natif ultra-rapide **`bun fmt`** (compatible Prettier / `oxfmt`) au lieu de `prettier` ou `oxfmt`.
- **Vérification de types (`bun check` — optimisé 7.8x dans Bun v1.4.4)** : Utiliser **`bun check`** au lieu de `tsc --noEmit`.
- **Tests (`bun test`)** : Utiliser **`bun test`** (et `bun test --watch`) au lieu de `jest` ou `vitest`.
- **Gestionnaire de paquets (`bun install`)** :
  - Utiliser `bun install` (ou `bun install --frozen-lockfile` en CI) au lieu de `npm install`, `yarn install` ou `pnpm install`.
  - Utiliser `bun pm fetch`, `bun publish --recursive`, et déclarer explicitement les scripts postinstall requis dans `trustedDependencies` (`package.json`).
  - Migration automatique supportée depuis les lockfiles Yarn Berry (`bun.lock`).
- **Exécution de scripts & binaires** :
  - Utiliser `bun run <script>` au lieu de `npm run` / `yarn run` / `pnpm run`.
  - Utiliser `bunx <package> <command>` au lieu de `npx <package> <command>`.
- **Bundler (`bun build`)** : Utiliser `bun build <file.html|file.ts|file.css>` (ou `Bun.build()`) au lieu de `webpack`, `esbuild` ou `vite`.
- **Variables d'environnement** : Bun charge automatiquement `.env` (`.env.local`, `.env.development`, `.env.production`). **Ne jamais installer ni utiliser `dotenv`**.

---

## 2. Utiliser les APIs Natives de Bun (Guides & Docs `oven-sh/bun`)

- **Serveur HTTP, Routes Fullstack & WebSockets (`Bun.serve`)** :
  - Utiliser `Bun.serve({ routes: { "/": homepage, "/api/...": { GET, POST } }, fetch(req, server) {}, websocket: {} })` avec support HTML imports, HMR (`development: { hmr: true, console: true }`), et contrôle de flux WebSocket (`ws.pause()`, `ws.resume()`).
  - Ne pas utiliser `express`, `fastify` ou `koa` sauf contrainte existante explicite.
  - Pour un client WebSocket compatible Node, le paquet/module `ws` dans Bun v1.4.4+ se comporte de manière 100 % identique à `ws` sur Node.js.
- **Bases de données (`Bun.SQL` & `bun:sqlite`)** :
  - Pour SQLite : utiliser `import { Database } from "bun:sqlite"` (avec support des fonctions définies par l'utilisateur et des update hooks dans v1.4.4+) ou `import { SQL } from "bun"` (`new SQL("sqlite://app.db")` / `new SQL({ adapter: "sqlite", filename: "app.db" })`). Ne pas utiliser `better-sqlite3`.
  - Pour Postgres / MySQL / SQLite unifié : utiliser `Bun.SQL` (`import { sql, SQL } from "bun"`), supportant `query.cancel()` et les flux `COPY` (v1.4.4+). Ne pas utiliser `pg` ou `postgres.js`.
  - Pour Redis : utiliser `Bun.redis` au lieu de `ioredis`.
- **Fichiers, Globbing & Shell (`Bun.file`, `Bun.write`, `Bun.Glob`, `Bun.$`)** :
  - Préférer `Bun.file(path)` et `await Bun.write(dest, input)` (zero-copy `sendfile`) à `node:fs` (`readFile` / `writeFile`).
  - Utiliser `new Bun.Glob(pattern)` (avec support `extglob` et `brace ranges` en v1.4.4+) au lieu du paquet `glob` ou `fast-glob`.
  - Utiliser `import { $ } from "bun"` (`await $\`cmd\``) au lieu de `execa` ou `child_process.exec`.
- **Tests unitaires (`bun:test`)** :
  - Importer depuis `"bun:test"` : `import { test, expect, describe, beforeEach, mock, spyOn } from "bun:test"`.
