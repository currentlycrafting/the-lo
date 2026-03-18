# The-Lo Engineering Standards

This document is the required coding and collaboration guide for this repository.

Primary objective:

**Make the app easy to build, easy to change, easy to debug, and hard to break.**

---

## 1) Core Philosophy

- Every file and layer must have a clear job.
- UI should be easy to read in one pass.
- Logic should be easy to locate and test.
- Data flow should be explicit and predictable.
- Prefer maintainability over cleverness.

If a change improves speed today but increases confusion tomorrow, reject it.

---

## 2) Current Project Structure

This repository is intentionally lean. We use folders for organization, but keep file count low.

- `src/screens/`:
  - Screen-level UI modules (for example `CampusBoundaryMapScreen.tsx`).
- `config/json/`:
  - JSON app configuration files used by root config loader.
- `config/env/`:
  - Environment templates and env setup docs.
- Root files required by Expo/tooling:
  - `App.tsx` (root component)
  - `index.ts` (Expo registration entry)
  - `app.config.ts` (Expo config entry)
  - `package.json` / `package-lock.json`
  - `tsconfig.json`
  - `.env` (local-only secrets, ignored by git)

Important:
- Some files must remain at repository root because Expo expects them there.
- Do not move required root entry files unless tooling is explicitly reconfigured.

---

## 3) Separation of Concerns

Never build "god screens."

A screen should not simultaneously own:
- API transport setup
- data mapping
- business rules
- navigation policy
- analytics side effects
- huge style dictionaries
- retry orchestration

Responsibilities:
- **UI layer** renders.
- **Hooks/coordination layer** orchestrates behavior.
- **Services layer** communicates with APIs/storage.
- **Utils/domain layer** transforms and validates data.

Rule:
- If logic is domain-specific and not presentation-specific, it should not be buried inside JSX.

---

## 4) Screen and Component Design

### 4.1 Keep screens thin

A good screen answers:
- What data does it need?
- What actions can users take?
- Which states are shown (loading/empty/error/success)?

### 4.2 Component extraction rules

Extract components when UI blocks are:
- repeated,
- conceptually meaningful, or
- reducing parent readability.

Avoid extraction for tiny wrappers with no meaning.

### 4.3 Composition over mega-props

Avoid highly-configurable "do everything" components.
Prefer composable components with clear intent.

---

## 5) Data Flow and State Rules

State categories must remain explicit:

- **Local UI state**:
  - inputs, toggles, temporary modal state.
- **Global client state**:
  - authenticated user, app-level settings, shared session data.
- **Server state**:
  - fetched API resources with loading/refetch/invalidation concerns.

Do not mix these categories randomly.

Use:
- `useState` for local UI state.
- Dedicated state library only when truly needed.
- Structured query tools for server state when complexity grows.

---

## 6) TypeScript Standards

TypeScript is architecture, not decoration.

Rules:
- Avoid `any`.
- Type component props explicitly.
- Keep domain types explicit and descriptive.
- Separate raw API DTOs from app models when APIs are introduced.

Naming for models:
- `UserDto` for transport shape.
- `User` for app/domain shape.

Transform once at boundaries; do not remap data repeatedly in screens.

---

## 7) Naming Conventions

- Components/screens: `PascalCase` (e.g. `CampusBoundaryMapScreen`)
- Hooks: `useSomething`
- Variables/functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Event handlers: `handleSomething`
- Callback props: `onSomething`
- Booleans: `is/has/should/can...`

Use domain language, not vague filler names.
Prefer `CampusBoundaryMapScreen` over `MapThing`.

---

## 8) Styling Standards

Use a consistent style system.

Current baseline:
- `StyleSheet.create` for static style definitions.
- Keep inline style usage minimal and justified.

Rules:
- Keep spacing/indentation consistent.
- Avoid random one-off values where a shared value is appropriate.
- Keep styles readable and grouped by purpose.

---

## 9) Async and Error Handling

Every async flow must model:
- loading
- success
- error

User-facing errors should be understandable and actionable.
Do not expose raw stack traces or backend internals to users.

Avoid deeply nested async chains.
Keep async orchestration close to hooks/services.

---

## 10) Platform and Device Behavior

React Native is cross-platform, but iOS and Android differ.

When platform-specific logic is needed:
- isolate it in a focused module,
- document why it exists,
- avoid scattering platform checks across unrelated files.

---

## 11) Performance and Render Hygiene

Design for predictable rendering:
- Avoid unnecessary object/function recreation in hot paths.
- Keep render trees clean and easy to reason about.
- Extract heavy computations out of render blocks.

Do not prematurely optimize, but keep architecture optimization-friendly.

---

## 12) File and Folder Rules

- One file = one primary responsibility.
- Keep folder hierarchy shallow and understandable.
- Do not create many tiny files for trivial single-use snippets.
- Prefer minimal but meaningful modularity.

Current preference in this repo:
- one descriptive screen module for primary UI flow,
- root entry files as thin wrappers.

---

## 13) Environment and Config Rules

Required environment variable:
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`

Rules:
- Never hardcode secrets in source.
- Keep runtime secret values in root `.env` only.
- Keep templates/docs in `config/env/`.
- Keep app JSON config in `config/json/` and load through `app.config.ts`.

---

## 14) Code Review Checklist

Every PR or direct change should pass these checks:

1. Is responsibility split clear?
2. Is naming explicit and domain-meaningful?
3. Is data flow predictable?
4. Is business logic outside JSX when appropriate?
5. Are loading/error states handled?
6. Are TypeScript types explicit and safe?
7. Are formatting and style conventions consistent?
8. Are secrets/config values handled safely?
9. Is this change simpler than the previous version?
10. Does this introduce unnecessary files or layers?

---

## 15) Anti-Patterns (Not Allowed)

- God screens with mixed responsibilities.
- Huge hooks that do unrelated jobs.
- Junk-drawer utility files.
- Direct API calls scattered across components.
- Hardcoded secrets.
- Inconsistent naming conventions.
- Boolean prop explosions.
- Hidden side effects and magic behavior.
- Excessive abstraction for low-complexity features.

---

## 16) Contributor Conduct and Collaboration

All contributors are expected to:

- Be respectful and constructive in code reviews.
- Critique code, not people.
- Explain rationale for non-obvious decisions.
- Prefer small, clear changes over broad risky rewrites.
- Keep repository conventions consistent.
- Document assumptions and constraints when behavior is non-obvious.

When proposing architectural changes:
- include tradeoffs,
- include migration impact,
- include rollback path if risk is high.

---

## 17) Practical Decision Rules

Use these defaults:

- If logic is reused: extract.
- If logic is not reused: keep close to usage.
- If readability drops: simplify before adding abstraction.
- If a new layer does not reduce maintenance cost: do not add it.

This standard should evolve with the app, but clarity and maintainability remain mandatory.

