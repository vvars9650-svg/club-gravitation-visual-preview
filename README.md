# Gravitation visual preview

This repository publishes a visual-only snapshot of `visual/post-launch` to GitHub Pages. It contains five public pages, static assets, and inert placeholders for application and legal links. No form or backend configuration is included.

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
