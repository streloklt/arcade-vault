// Cache de sprites con glow pre-renderizados a canvas offscreen, compartido por los
// engines de los 5 juegos. Evita recalcular `ctx.shadowBlur`/`ctx.shadowColor` por
// objeto en cada frame: la forma con glow se dibuja una sola vez a un canvas chico y
// luego se blitea con `drawImage` en cada frame subsiguiente.

export interface GlowSprite {
  canvas: HTMLCanvasElement;
  width: number; // incluye margen para no recortar el blur
  height: number;
  offsetX: number; // desplazamiento para centrar el sprite al dibujar
  offsetY: number;
}

// Margen alrededor de la forma para que el blur no se recorte contra el borde del
// canvas offscreen (el blur pinta fuera del bounding box de la forma original).
const MARGIN_FACTOR = 2;

function renderGlowSprite(
  width: number,
  height: number,
  blur: number,
  color: string,
  draw: (ctx: CanvasRenderingContext2D) => void,
  centered: boolean,
): GlowSprite {
  const margin = Math.ceil(blur * MARGIN_FACTOR);
  const spriteWidth = width + margin * 2;
  const spriteHeight = height + margin * 2;
  // Anclaje del local (0,0) que usa `draw()`: la esquina superior izquierda del
  // bounding box (igual que `fillRect(0,0,w,h)`), o su centro (para formas dibujadas
  // simétricas alrededor del origen, como un asteroide rotado o un círculo).
  const offsetX = centered ? spriteWidth / 2 : margin;
  const offsetY = centered ? spriteHeight / 2 : margin;

  const canvas = document.createElement("canvas");
  canvas.width = spriteWidth;
  canvas.height = spriteHeight;

  const ctx = canvas.getContext("2d")!;
  ctx.translate(offsetX, offsetY);
  ctx.shadowBlur = blur;
  ctx.shadowColor = color;
  draw(ctx);

  return {
    canvas,
    width: spriteWidth,
    height: spriteHeight,
    offsetX,
    offsetY,
  };
}

const keyedCache = new Map<string, GlowSprite>();

// Formas fijas (color + forma + tamaño + skin conocidos de antemano): cacheadas por
// clave string. Llamadas repetidas con la misma `key` devuelven el mismo sprite sin
// volver a ejecutar `draw`.
export function getGlowSprite(
  key: string,
  width: number,
  height: number,
  blur: number,
  color: string,
  draw: (ctx: CanvasRenderingContext2D) => void,
  centered = false,
): GlowSprite {
  const cached = keyedCache.get(key);
  if (cached) return cached;

  const sprite = renderGlowSprite(width, height, blur, color, draw, centered);
  keyedCache.set(key, sprite);
  return sprite;
}

// Formas generadas por instancia (ej. el polígono aleatorio de cada asteroide,
// generado una sola vez en su constructor): cacheadas por identidad del objeto vía
// `WeakMap`, liberadas automáticamente por el GC al perder la referencia. `variantKey`
// (color+blur, o skin+color+blur) permite que la misma instancia tenga sprites
// distintos por skin cacheados en paralelo, para que cambiar de skin en caliente
// muestre el color correcto sin quedar con el sprite de la skin anterior.
const instanceCache = new WeakMap<object, Map<string, GlowSprite>>();

export function getInstanceGlowSprite(
  instance: object,
  variantKey: string,
  width: number,
  height: number,
  blur: number,
  color: string,
  draw: (ctx: CanvasRenderingContext2D) => void,
  centered = false,
): GlowSprite {
  let variants = instanceCache.get(instance);
  if (!variants) {
    variants = new Map();
    instanceCache.set(instance, variants);
  }

  const cached = variants.get(variantKey);
  if (cached) return cached;

  const sprite = renderGlowSprite(width, height, blur, color, draw, centered);
  variants.set(variantKey, sprite);
  return sprite;
}

// Dibuja un sprite cacheado en (x, y), donde (x, y) es el mismo punto de anclaje que
// usaba `draw()` al dibujar la forma sin glow dentro del sprite (normalmente la
// esquina superior izquierda del bounding box, igual que un `fillRect(x, y, w, h)`
// original). El offset del sprite compensa el margen del blur.
export function drawGlowSprite(
  ctx: CanvasRenderingContext2D,
  sprite: GlowSprite,
  x: number,
  y: number,
): void {
  ctx.drawImage(sprite.canvas, x - sprite.offsetX, y - sprite.offsetY);
}
