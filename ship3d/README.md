# Virtuosa 3D

The MSC Virtuosa under way, in the browser: a three.js scene built in code from the deck plans of this repository. No downloaded 3D model, no textures from photographs.

**Open it:** https://virtuosa-3d.vinicius741.workers.dev (English) · https://virtuosa-3d.vinicius741.workers.dev/pt/ (Português)

> Unofficial project made by passengers. It is not affiliated with, endorsed by or connected to MSC Cruises. The ship carries no cruise line logo: the emblem on the funnel is this project's own. Shapes and details are approximate.

## What you see

- **The ship**, 331 m long: hull with flared bow and bulb, the lifeboats on their shelves, seven decks of balcony cabins (about 1,300 balconies, one for each balcony cabin the plans show), the navigation bridge with its wings, the pool court, the indoor pool under its glass roof, the amphitheatre at the stern, the aquapark with three slides, the ropes course, the twin-shell funnel and the radar mast.
- **People, about 2,400 of them, all moving**: a pool party in front of the stage, swimmers, sunbathers, joggers on the track, children in the water playground, riders coming down the slides, guests stepping out on their balconies and going back in, officers on the bridge wings.
- **Inside**: the Galleria, the two-deck promenade under an LED sky, with another party; and a cutaway view where people walk the real corridors of the plans.
- **The sea**: swell, bow wave, wake, foam and spray, with the sky reflected in it. Drag the clock from noon to sunset to night: cabin lights, pool lights and party lights come on.

## How it is made

| Path | What it is |
|---|---|
| `scripts/extract-plans.mjs` | Reads `plantas/export/deck-N.json` and `public/plantas/rotas.json` and writes `src/data/ship.json`: every deck outline in metres, pools and venues, cabins, and walking paths found on the GPS's own walkable grid. Each plan was traced at its own scale, so the script aligns the decks with each other (lift cores, balcony bays). |
| `src/ship/` | The model. `hull.ts` lofts the hull; `superstructure.ts` builds decks 6 to 14 and every balcony; `topdecks.ts` the open decks; `details.ts` funnel, mast, lifeboats, slides; `interior.ts` the Galleria and decks 5 to 7. |
| `src/env/` | Sky (sun, moon, stars, clouds) and the ocean shader. |
| `src/life/` | `people.ts` draws everyone in one instanced mesh, limbs animated in the vertex shader; `crowd.ts` decides what each person does; `effects.ts` adds spray, fountains, flags and party lights. |
| `src/scene.ts` | `ShipScene`: the whole scene behind a small API. |
| `src/auto.ts` | `AutoShip`: picks the quality by measuring, for pages that run on phones of every kind. |
| `src/main.ts`, `index.html` | This page: views, tour, clock, EN/PT. |

Heights (deck levels, the funnel, the bow) are not on the plans; they were set by eye against photographs on Wikimedia Commons, which are not part of this repository.

## Run it

```sh
npm install
npm run dev:3d       # http://127.0.0.1:4330
npm run data:3d      # regenerate src/data/ship.json after the plans change
npm run build:3d     # static files in ship3d/dist/
npm run deploy:3d    # Cloudflare Worker "virtuosa-3d" (static assets only)
```

Useful while working: `?shot=pool` opens a view, `?hour=21` sets the clock, `?q=lite|low|medium|high` forces a quality level, `?ui=0` hides the controls, `?cam=x,y,z,tx,ty,tz` places the camera by hand (add `&inside=1` and `&cut=2.6` for the interior).

## Use it in your own page

```ts
import { ShipScene } from 'virtuosa-gps/ship3d'; // needs `three` installed

const view = new ShipScene(document.getElementById('ship')!, { tour: true });
view.goTo('aquapark'); // any id from SHOTS, or your own { pos, target }
view.setHour(21);
view.dispose();
```

The element decides the size; the scene follows it. `ShipScene` guesses a quality (people, shadows, resolution) from the device and only adapts its resolution while running.

For a page that phones of every kind will open, use `AutoShip` instead. It starts on the lightest quality (`lite`: a fifth of the people, the cheapest sea, 30 frames per second), measures how the device keeps up, moves up one quality at a time while there is room and back down when there is not, and remembers the result on the device. When no 3D is possible it says so, and the page shows something else:

```ts
import { AutoShip } from 'virtuosa-gps/ship3d';

const ship = new AutoShip(el, {
  tour: true,
  onFallback: (reason) => showPicturesInstead(reason), // 'no-webgl' | 'too-slow' | 'context-lost'
});
ship.scene?.goTo('pool'); // the current ShipScene; it is replaced when the quality changes
ship.setMode('lite'); // the viewer's own choice: 'auto' | 'lite' | 'full'
```

Load it with a dynamic `import()` after a tap, so that nobody pays for the 3D before asking for it. The texts of the views are available without three.js from `virtuosa-gps/ship3d/texts`.
