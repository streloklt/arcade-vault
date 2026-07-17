// Coordenadas de sprites copiadas de references/source-assets/snake-assets/sprites.js
// (fuente: fruits.png, hoja 3790x442px, fila de frutas y=136-295)

export interface FruitSprite {
  x: number;
  y: number;
  w: number;
  h: number;
  points: 10 | 25;
}

export const FRUIT_ATLAS: Record<string, FruitSprite> = {
  // Comunes (10pts)
  apple: { x: 2786, y: 136, w: 110, h: 160, points: 10 },
  banana: { x: 34, y: 136, w: 110, h: 160, points: 10 },
  grape: { x: 378, y: 136, w: 110, h: 160, points: 10 },
  garlic: { x: 540, y: 136, w: 130, h: 160, points: 10 },
  eggplant: { x: 712, y: 136, w: 130, h: 160, points: 10 },
  strawberry: { x: 894, y: 136, w: 110, h: 160, points: 10 },
  cherry: { x: 1066, y: 136, w: 110, h: 160, points: 10 },
  carrot: { x: 1228, y: 136, w: 130, h: 160, points: 10 },
  mushroom: { x: 1400, y: 136, w: 130, h: 160, points: 10 },
  broccoli: { x: 1582, y: 136, w: 110, h: 160, points: 10 },
  peach: { x: 2432, y: 136, w: 130, h: 160, points: 10 },
  peanut: { x: 2604, y: 136, w: 130, h: 160, points: 10 },
  tomato: { x: 2948, y: 136, w: 130, h: 160, points: 10 },
  grapes2: { x: 3302, y: 136, w: 110, h: 160, points: 10 },

  // Raras (25pts)
  watermelon: { x: 1734, y: 136, w: 150, h: 160, points: 25 },
  pineapple: { x: 3454, y: 136, w: 150, h: 160, points: 25 },
  melon: { x: 3637, y: 136, w: 130, h: 160, points: 25 },
  kiwi: { x: 2068, y: 136, w: 170, h: 160, points: 25 },
  pepper: { x: 1906, y: 136, w: 150, h: 160, points: 25 },
  lemon: { x: 2250, y: 136, w: 140, h: 160, points: 25 },
  orange: { x: 186, y: 136, w: 150, h: 160, points: 25 },
  berries: { x: 3110, y: 136, w: 150, h: 160, points: 25 },
};

export const FRUIT_ATLAS_SOURCE = "/games/snake/fruits.png";

export const COMMON_FRUITS = Object.keys(FRUIT_ATLAS).filter(
  (key) => FRUIT_ATLAS[key].points === 10,
);

export const RARE_FRUITS = Object.keys(FRUIT_ATLAS).filter(
  (key) => FRUIT_ATLAS[key].points === 25,
);
