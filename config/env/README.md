# Environment Configuration

This project keeps environment files in `config/env`.
NPM scripts use `dotenv-cli` to load `config/env/.env`.

This folder contains:

- `.env`: local runtime values (ignored by git).
- `.env.example`: template for required values.

## Setup

1. Copy `config/env/.env.example` to `config/env/.env`.
2. Set `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` in `config/env/.env`.
3. Restart Expo (`npm run ios` / `npm run start`) after changing env values.
