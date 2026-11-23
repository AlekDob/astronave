# Astronave

Astronave is a fork of [T3 Code](https://github.com/pingdotgg/t3code) (MIT) for beginners, Italian first.
Upstream is merged every night, so every line we touch is a future merge conflict.

**Rule: keep upstream files untouched where possible.** Prefer new files, config and env over edits.
When an edit is unavoidable, keep it to the fewest lines and mark it with an `Astronave:` comment when the reason is not obvious.

## What changes vs upstream

- Name "Astronave", appId `com.studiofuturo.astronave`, its own Electron profile dir, so it installs and runs next to T3 Code.
- Built-in "Astronave" palette (near-black/near-white neutrals, accent `#2433FF`), the default for new users.
- PostHog analytics off by default (`T3CODE_TELEMETRY_ENABLED=true` turns it back on).
- "Basato su T3 Code (MIT)" in About (Settings and the macOS About panel). `LICENSE` is untouched.
- Desktop updates come from GitHub releases of `AlekDob/astronave`. The feed is the publish config baked at build time from `GITHUB_REPOSITORY` (or `T3CODE_DESKTOP_UPDATE_REPOSITORY`), so a release built in this repo's CI never points at stock T3.
- Italian UI catalogs (owned by the translation work: `apps/*/src/i18n/translations/it.json`, `gt.config.json`, `scripts/astronave/translate-it.mjs`).

## Files we touch

| File | Why |
|---|---|
| `apps/desktop/package.json` | `productName` |
| `apps/desktop/src/app/DesktopEnvironment.ts` | app base name, Windows AppUserModelId |
| `apps/desktop/src/app/DesktopUserData.ts` | own profile dir `astronave` (Electron's single-instance lock is keyed on it) |
| `apps/desktop/src/app/DesktopAppIdentity.ts` | MIT credit in the native About panel |
| `apps/desktop/src/app/DesktopStartupRecovery.ts` | releases link in the startup error page |
| `apps/desktop/src/app/*.test.ts` (Identity, Clerk, UserData, PreReadyPlatform) | test literals for the new name and profile dir |
| `scripts/build-desktop-artifact.ts` (+ `.test.ts`) | electron-builder `appId` and product name |
| `apps/web/src/branding.ts`, `apps/web/vite.config.ts`, `apps/web/public/manifest.webmanifest` | web app name and title |
| `apps/web/index.html` | boot copy of the Astronave palette, first-run default theme |
| `packages/shared/src/themePalettes.ts` | `ASTRONAVE_THEME` |
| `apps/web/src/components/settings/AboutVersionTitle.tsx` | "Basato su T3 Code (MIT)" link |
| `apps/server/src/telemetry/AnalyticsService.ts` | analytics default off |
| `packages/contracts/src/settings.ts` | default `language` is `it` |
| `assets/prod/app-icon.icon/Assets/text.svg`, `assets/prod/logo.svg` | Astronave mark |
| `README.md` | Italian header above the original README |
| `ASTRONAVE.md`, `scripts/astronave/*` | ours only |

## Nightly sync

`scripts/astronave/sync-upstream.sh` (needs a clean tree, `upstream` remote = pingdotgg/t3code):

1. `git fetch upstream` and `git merge upstream/main` into `main` (merge, never rebase).
2. On conflict: abort the merge, print the conflicting files, exit non-zero. Resolve by hand.
3. `pnpm install --frozen-lockfile`, then `node scripts/astronave/translate-it.mjs` to fill new Italian keys.
4. `pnpm run i18n:check` and typecheck of `packages/shared`, `apps/web`, `apps/desktop`, `apps/server`.
5. Commit new translations if any, push `origin main`.

## Still open

- Icons: `icons:export` needs macOS Icon Composer. Regenerate `assets/prod/*.png`, `*.ico` and the macOS PNG on a Mac.
- App data still lives in `~/.t3` (shared with an installed T3 Code); the server CLI is still `t3` and the URL scheme `t3code://`.
