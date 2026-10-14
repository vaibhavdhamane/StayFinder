# Contributing to StayFinder

Thanks for considering a contribution.

## Before you start

- Check existing issues and pull requests so work is not duplicated.
- For a larger change, open an issue first to discuss the scope.
- Keep credentials, personal data, and local `.env` files out of commits.
- Use a development database when running the app or the optional seed command.

## Development setup

Follow the local setup steps in [README.md](README.md). The app uses Node.js 22.15.0. Some features need credentials for MongoDB, Cloudinary, or Mapbox; Gemini credentials are only needed for AI features.

## Pull requests

- Keep each pull request focused on one change.
- Describe the user-visible change and link the related issue, if there is one.
- Include screenshots for visible UI changes when useful.
- Explain how you checked the change. GitHub Actions installs dependencies and checks JavaScript syntax, but this repository does not yet have an automated behavioral test suite.
- Update the README when setup steps or environment variables change.

## Good places to start

- Add ordinary location, price, and category filters.
- Improve mobile layout, keyboard navigation, and screen-reader labels.
- Add pagination to listing results.
- Improve validation and error messages for listings, reviews, and uploads.
- Add automated tests for search filters and access-control behavior.
- Add saved listings or a booking request flow.
