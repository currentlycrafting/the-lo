# The-Lo

The-Lo is a mobile-first campus event map for the University of Minnesota area. Users can add event markers, browse live signals, open venue directions, and attach media to event cards.

## Current Features

- Lightweight sign-in gate to enter the app UI.
- Google Maps-powered map view inside a `WebView`.
- Marker creation from map taps and from address/place search.
- Marker details with category, date/time, venue, description, and counters.
- Per-event interactions: like/unlike, notification toggle, view/click tracking, delete.
- Media attachment flow using device library permissions and picker.
- Local persistence of markers + viewer identity using `expo-file-system`.
- Full-map mode with in-map controls (zoom, pan, recenter).

## Tech Stack

- Expo SDK 55
- React Native + TypeScript
- `react-native-webview`
- `expo-file-system`
- `expo-image-picker`
- `expo-blur`

## Prerequisites

- Node.js 22+ and npm
- Xcode + iOS Simulator (for iOS runs)
- Google Maps JavaScript API key

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create env file:

```bash
cp config/env/.env.example config/env/.env
```

3. Set `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` in `config/env/.env`.

## Run

Primary iOS command (recommended):

```bash
npm install
npm run ios -- --tunnel
```

Other common targets:

```bash
npm run start
npm run android
npm run web
```

## Quality Checks

- Typecheck: `npm run typecheck`
- Lint: `npm run lint`
- Tests: `npm test`
- Expo health check: `npx expo-doctor`

GitHub Actions CI also runs validation checks plus tunnel smoke tests, including an iOS tunnel smoke check on macOS.

## Project Layout

```text
src/
  app/
    App.tsx
    AppRoot.tsx
    registerRoot.ts
  screens/
    SignInScreen.tsx
    HomeScreen.tsx

config/
  env/
    .env.example
    README.md
```

## Notes

- Runtime env values are loaded from `config/env/.env` via `dotenv-cli`.
- Do not commit secrets; keep `config/env/.env` local-only.
