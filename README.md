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
shots/            screenshots, 1280x720, one per project
```

## Preview locally

```bash
python -m http.server 8099
```

## Design

Warm paper background, IBM Plex Sans for text, JetBrains Mono for labels, one
burnt-orange accent. Light and dark both defined; the page follows the reader's
system setting. All foreground and background pairs clear WCAG AA.

## Adding a project

Drop a 1280x720 screenshot in `shots/`, copy any file in `projects/`, then add a
row to the grid in `index.html`. Rows alternate image side automatically.

## Not listed yet

Bond Flipper, Gielinor Deeds and the OSRS land cover tool. Waiting on the
plugin hub.
