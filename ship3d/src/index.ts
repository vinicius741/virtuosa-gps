// Public entry of the 3D ship, for embedding it in another page:
//
//   import { ShipScene } from 'virtuosa-gps/ship3d';
//   const view = new ShipScene(document.getElementById('ship')!, { tour: true });
//   view.goTo('pool');   view.setHour(21);   view.dispose();
//
// On a page for phones of every kind, use AutoShip instead: it picks the quality by measuring.
//
//   import { AutoShip } from 'virtuosa-gps/ship3d';
//   const ship = new AutoShip(el, { onFallback: () => showPhotosInstead() });
//   ship.scene?.goTo('pool');   ship.setMode('lite');   ship.dispose();
export { ShipScene, SHOTS, TIERS, guessQuality, type Perf, type Quality, type Shot, type ShipSceneOptions } from './scene';
export { AutoShip, type AutoShipOptions, type FallbackReason, type Mode } from './auto';
export { TEXTS, type Lang } from './ui/texts';
