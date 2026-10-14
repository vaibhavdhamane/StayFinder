# StayFinder

StayFinder is a Node.js and Express web app for browsing and managing vacation-rental listings. It uses EJS for server-rendered pages, MongoDB for data, and Passport for local accounts.

## Features

- Create, edit, browse, and delete listings
- Register and sign in with a local account
- Upload listing photos to Cloudinary
- Geocode listing locations and display them on a Mapbox map
- Add reviews to listings
- Use Gemini to interpret natural-language listing searches and refine descriptions

AI search and description refinement need Gemini credentials. The rest of the app can be used without them.

## Requirements

- Node.js 22.15.0
- MongoDB, local or hosted
- Cloudinary account for listing photo uploads
- Mapbox access token for geocoding and maps
- Google Gemini API key for AI features (optional)

## Run locally

1. Install dependencies:

   ```sh
   npm install
   ```

2. Copy the environment template and fill in the values you need:

   PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

   macOS or Linux:

   ```sh
   cp .env.example .env
   ```

3. Start the app:

   ```sh
   npm start
   ```

4. Open [http://localhost:8080](http://localhost:8080) and create an account.

Never commit `.env` or paste API credentials into issues or pull requests. Use a dedicated development database and replace the example session secret with a long random value.

## Environment variables

| Variable | Required for | Notes |
| --- | --- | --- |
| `ATLASDB_URL` | App database and sessions | MongoDB connection string. The example points to local MongoDB. |
| `SECRET` | Sessions | Use a long, random value. |
| `CLOUD_NAME` | Listing photo uploads | Cloudinary cloud name. |
| `CLOUD_API_KEY` | Listing photo uploads | Cloudinary API key. |
| `CLOUD_API_SECRET` | Listing photo uploads | Cloudinary API secret. |
| `MAP_TOKEN` | Listing creation and maps | Mapbox access token. Restrict browser-exposed tokens to the domains and APIs you need. |
| `GEMINI_API_KEY` | AI features | Leave blank to run without AI search and description refinement. |
| `GEMINI_MODEL` | AI features | Gemini model name used by the server. |
| `SEED_OWNER_ID` | Optional sample data | MongoDB ID of an account in the selected database; used only by `npm run seed`. |

## Optional sample listings

To load sample listings into a development database:

1. Start the app and sign up for a local account.
2. Copy that account's MongoDB `_id` into `SEED_OWNER_ID` in `.env`.
3. Make sure `ATLASDB_URL` points to your development database and `MAP_TOKEN` is set.
4. Run:

   ```sh
   npm run seed
   ```

The seed command adds missing sample listings for that account and leaves existing matching listings unchanged. It does not clear or overwrite listings. Mapbox geocoding is used to attach map coordinates.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for issue and pull-request guidelines. Bug reports, documentation improvements, accessibility fixes, and focused feature contributions are welcome.

## License

This project is licensed under the ISC License. See [LICENSE](LICENSE).
