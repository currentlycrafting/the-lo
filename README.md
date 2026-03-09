# The-Lo

The Event Tracker for the University of Minnesota


## Tech Stack

- Expo
- React Native
- TypeScript
- `react-native-webview`

## Prerequisites

- Node.js + npm
- Xcode + iOS Simulator (for iOS)

## Install

```bash
npm install
```

## Environment Setup

This project loads environment variables from:

- `config/env/.env`

Required variable:

- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`

If needed, copy the template:

```bash
cp config/env/.env.example config/env/.env
```

Then set your API key in `config/env/.env`.

## Run

Start iOS simulator:

```bash
npm run ios
```

Other targets:

```bash
npm run android
npm run web
```

## Project Structure

```text
src/
  app/
    App.tsx
    AppRoot.tsx
    registerRoot.ts

config/
  env/
    .env
    .env.example
    README.md

app.json
index.ts
App.tsx
```

## Notes

- The map UI and boundary behavior are defined in `src/app/AppRoot.tsx`.
- Keep secrets out of git. `config/env/.env` should remain local.
