# Main Site

The hub at https://sevin47.github.io

Plain static HTML and one stylesheet. No build step, no dependencies. Every
project link points at that project's own repo and its own already-live Pages
deployment, so nothing is copied in here and nothing needs rebuilding when a
game updates.

## Layout

```
index.html        the hub
style.css         everything
projects/*.html   one build-notes page per project
shots/            card art (empty for now, cards fall back to CSS gradients)
```

## Preview locally

```bash
python -m http.server 8099
```

## Publishing

This needs to live in a repo named `Sevin47.github.io` for it to serve from the
bare root.

```bash
git init && git add . && git commit -m "Project hub"
gh repo create Sevin47.github.io --public --source=. --push
```

Then Settings > Pages > deploy from `main` / root.

## Adding a project

Copy any file in `projects/`, then add a card to the grid in `index.html`. Add a
thumb class in `style.css` if you want a different gradient, or drop an image in
`shots/` and set it as the `.thumb` background.

## Not listed yet

Bond Flipper, Gielinor Deeds and the OSRS land cover tool. Waiting on the
plugin hub.
