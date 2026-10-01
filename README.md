# Gravitation visual preview

This repository publishes a visual-only snapshot of `visual/post-launch` to GitHub Pages. It contains public pages, static assets, the full application UI, and inert placeholders for legal links. The application is an isolated demo: photo and submission adapters are local stubs, endpoints and runtime configuration are excluded, and CSP blocks connections and form submission. Every page keeps noindex.

To refresh the same preview URL from a checkout of the visual branch:

```sh
node scripts/build-preview.js /path/to/club-gravitation.ru
node scripts/check-preview.js
git add source snapshot.json
git commit -m "Update visual preview"
git push origin main
```

The build command first rebuilds the source checkout's ignored `public-dist`, then copies only the allowlisted public files. The GitHub workflow rebuilds the subpath-ready `site` artifact from this snapshot and deploys it. The source checkout's Git diff is not staged or committed.

For a local subpath check, run `node scripts/serve-preview.js` and open `http://localhost:4177/club-gravitation-visual-preview/`.

Application handoff: the required free-form contact keeps the `profile_or_messenger_url` payload key and an empty `preferred_contact`. Backend currently requires an HTTP(S) URL in that field; accepting free-form nonempty text is an explicit dependency before any intake release. No backend, PROD or TEST change is included here.
