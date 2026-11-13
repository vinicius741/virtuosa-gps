// Public entry of the 3D ship, for embedding it in another page:
//
//   import { ShipScene } from 'virtuosa-gps/ship3d';
//   const view = new ShipScene(document.getElementById('ship')!, { tour: true });
//   view.goTo('pool');   view.setHour(21);   view.dispose();
export { ShipScene, SHOTS, guessQuality, type Quality, type Shot, type ShipSceneOptions } from './scene';
export { TEXTS, type Lang } from './ui/texts';
