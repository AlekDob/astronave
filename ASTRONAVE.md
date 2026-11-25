# Astronave

Astronave is a fork of [T3 Code](https://github.com/pingdotgg/t3code) (MIT) for beginners, Italian first.
Upstream is merged every night, so every line we touch is a future merge conflict.

**Rule: keep upstream files untouched where possible.** Prefer new files, config and env over edits.
When an edit is unavoidable, keep it to the fewest lines and mark it with an `Astronave:` comment when the reason is not obvious.

Project memory (diary, decisions, gotchas, features) lives in [`documentation/`](documentation/INDEX.md).

## What changes vs upstream

- Data in `~/.astronave` (desktop default; `T3CODE_HOME` still overrides), never in T3 Code's `~/.t3`.
- Name "Astronave", appId `com.studiofuturo.astronave`, its own Electron profile dir, so it installs and runs next to T3 Code.
- Built-in "Astronave" palette (near-black/near-white neutrals, accent `#2433FF`), the default for new users.
- PostHog analytics off by default (`T3CODE_TELEMETRY_ENABLED=true` turns it back on).
- "Basato su T3 Code (MIT)" in About (Settings and the macOS About panel). `LICENSE` is untouched.
- Desktop updates come from GitHub releases of `AlekDob/astronave`. The feed is the publish config baked at build time from `GITHUB_REPOSITORY` (or `T3CODE_DESKTOP_UPDATE_REPOSITORY`), so a release built in this repo's CI never points at stock T3.
- Italian UI catalogs (owned by the translation work: `apps/*/src/i18n/translations/it.json`, `gt.config.json`, `scripts/astronave/translate-it.mjs`).

## Files we touch

| File                                                                                                                                         | Why                                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/desktop/package.json`                                                                                                                  | `productName`                                                                                                                                                                  |
| `apps/desktop/src/app/DesktopEnvironment.ts`                                                                                                 | app base name, Windows AppUserModelId                                                                                                                                          |
| `apps/desktop/src/app/DesktopStatePaths.ts` (+ `DesktopEnvironment.test.ts`)                                                                 | default data dir `~/.astronave` instead of `~/.t3` (`T3CODE_HOME` still overrides)                                                                                             |
| `apps/desktop/src/app/DesktopUserData.ts`                                                                                                    | own profile dir `astronave` (Electron's single-instance lock is keyed on it)                                                                                                   |
| `apps/desktop/src/app/DesktopLegacyLocalStorage.ts`                                                                                          | no import of T3 Code's V1 Local Storage (it carried T3's language and settings into Astronave)                                                                                 |
| `apps/desktop/src/app/DesktopAppIdentity.ts`                                                                                                 | MIT credit in the native About panel                                                                                                                                           |
| `apps/desktop/src/app/DesktopStartupRecovery.ts`                                                                                             | releases link in the startup error page                                                                                                                                        |
| `apps/desktop/src/app/*.test.ts` (Identity, Clerk, UserData, PreReadyPlatform)                                                               | test literals for the new name and profile dir                                                                                                                                 |
| `scripts/build-desktop-artifact.ts` (+ `.test.ts`)                                                                                           | electron-builder `appId` and product name; stage package name `astronave` (own keychain "Safe Storage" key); `it` bundle language (UI follows an Italian macOS)                |
| `apps/web/src/branding.ts`, `apps/web/vite.config.ts`, `apps/web/public/manifest.webmanifest`                                                | web app name and title                                                                                                                                                         |
| `apps/web/index.html`                                                                                                                        | boot copy of the Astronave palette, first-run default theme                                                                                                                    |
| `packages/shared/src/themePalettes.ts`                                                                                                       | `ASTRONAVE_THEME`                                                                                                                                                              |
| `packages/contracts/src/settings.ts`                                                                                                         | default `language` is `it`                                                                                                                                                     |
| `apps/web/src/components/sidebar/SidebarChrome.tsx`                                                                                          | sidebar shows the app name instead of the T3 wordmark; rocket logo (`AstronaveLogo`) next to it, also in the width probe                                                       |
| `apps/web/src/components/chat/DraftHeroHeadline.tsx`                                                                                         | Astro (`AstroHero`) above the new-chat heading (syncs Astro's brain files on project-less chats); the no-project heading is Astro's greeting                                   |
| `apps/web/src/components/NoProjectsHero.tsx`                                                                                                 | first launch shows "Crea il tuo Astro" (`AstroOnboardingGate`) before the welcome                                                                                              |
| `apps/server/src/project/ManagedProjectFolders.ts` (+ test), `ScratchThreadPromotion.ts`                                                     | each new scratch chat folder gets a copy of the scratch root's `AGENTS.md` (agents other than Claude Code read it only from the cwd); promotion to a project removes that copy |
| `apps/web/src/components/settings/settingsSearch.ts`, `SettingsSidebarNav.tsx`, `apps/web/src/routeTree.gen.ts`                              | Settings > Astro page (`/settings/astro`) in the nav                                                                                                                           |
| `apps/web/src/components/settings/AboutVersionTitle.tsx`                                                                                     | "Basato su T3 Code (MIT)" link                                                                                                                                                 |
| `apps/server/src/telemetry/AnalyticsService.ts`                                                                                              | analytics default off                                                                                                                                                          |
| `assets/prod/app-icon.icon` (`rocket.png` from `assets/astronave/icon-source-1024.png`), `assets/prod/*.png`/`*.ico`, `assets/prod/logo.svg` | Astronave rocket icon; macOS PNG = macOS render at 824 px padded to 1024; 16/32 px favicons are a tighter crop of the rocket, so `icons:check` flags them on purpose           |
| `README.md`                                                                                                                                  | Italian header above the original README                                                                                                                                       |
| `knip.jsonc`                                                                                                                                 | `scripts/astronave/translate-it.mjs` as an entry (run from a shell script)                                                                                                     |
| `ASTRONAVE.md`, `scripts/astronave/*`, `apps/web/src/astro/*`                                                                                | ours only                                                                                                                                                                      |

## Nightly sync

`scripts/astronave/sync-upstream.sh` (needs a clean tree, `upstream` remote = pingdotgg/t3code):

1. `git fetch upstream` and `git merge upstream/main` into `main` (merge, never rebase).
2. On conflict: abort the merge, print the conflicting files, exit non-zero. Resolve by hand.
3. `pnpm install --frozen-lockfile`, then `node scripts/astronave/translate-it.mjs` to fill new Italian keys.
4. `pnpm run i18n:check` and typecheck of `packages/shared`, `apps/web`, `apps/desktop`, `apps/server`.
5. Commit new translations if any, push `origin main`.

## Still open

- Icons were rendered with Icon Composer 1.6 (Xcode 26.6); `icons:export`/`icons:check` want 2.x (Xcode 27). Re-export there for pixel-exact output, then redo the 16/32 px favicon crop.
- The server CLI is still `t3` (its launcher lives in `~/.astronave/bin`) and the URL scheme `t3code://`.
