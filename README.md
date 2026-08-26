# Main Site

The hub at https://sevin47.github.io

Plain static HTML and one stylesheet. Every project link points at that
project's own repo and its own already-live Pages deployment, so nothing is
copied in here and nothing needs rebuilding when a game updates.

## Layout

```
index.html            the hub
style.css             everything
data/projects.json    the card content, and the only file you edit to add one
projects/*.html       one build-notes page per project, hand written
scripts/build.mjs     regenerates the card rows in index.html
scripts/shots.mjs     recaptures the screenshots from the live builds
shots/                screenshots, 1280x720
```

## The pipeline

`scripts/build.mjs` reads `data/projects.json`, asks the GitHub API when each
project repo was last pushed, checks that each live URL still answers, and
rewrites only the block between the `PROJECTS:START` and `PROJECTS:END` markers
in `index.html`. Everything outside those markers is hand-edited and never
touched, so the masthead is safe.

`.github/workflows/sync.yml` runs it daily at 06:17 UTC, on demand from the
Actions tab, and whenever `projects.json` changes. If the output differs it
commits the result. That is what keeps the "Updated 3 days ago" line on each
card honest without anyone doing anything.

Run it yourself with:

```bash
npm run build
```

### Making it instant

The daily schedule means a change to a game shows up here within a day. To make
it immediate, add this to any project repo as `.github/workflows/ping-hub.yml`
and give that repo a `HUB_TOKEN` secret holding a fine-grained PAT with
contents write on `Sevin47/Sevin47.github.io`:

```yaml
name: Ping the hub
on:
  push:
    branches: [main]
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -sS -X POST \
            -H "Authorization: Bearer ${{ secrets.HUB_TOKEN }}" \
            -H "Accept: application/vnd.github+json" \
            https://api.github.com/repos/Sevin47/Sevin47.github.io/dispatches \
            -d '{"event_type":"project-updated"}'
```

The hub already listens for that `project-updated` event.

## Screenshots

Not on a schedule, because a bad capture would quietly replace a good image.
Run it when a game has changed enough to be worth reshooting:

```bash
npm install
npm run shots
```

Or one at a time: `npm run shots -- ember-line`.

It drives your installed Chrome against the live builds. Each game needs its
own nudging to reach a frame worth showing, and those quirks are commented in
the script. Two deliberate limits: Plot Twist is captured on its title screen
because Play now claims a real tile, and Roadworks has its signup modal hidden
rather than filled in, because signing up would add a fake manager to the live
leaderboard. Look at the images before committing them.

## Preview locally

```bash
npm run serve
```

## Adding a project

Add an entry to `data/projects.json`, drop a 1280x720 image in `shots/`, write
a page in `projects/`, then run `npm run build`. Rows alternate image side on
their own.

## Design

Warm paper background, IBM Plex Sans for text, JetBrains Mono for labels, one
burnt-orange accent. Light and dark both defined; the page follows the reader's
system setting. All foreground and background pairs clear WCAG AA.

## Not listed yet

Bond Flipper, Gielinor Deeds and the OSRS land cover tool. Waiting on the
plugin hub.
