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
): GlowSprite {
  const margin = Math.ceil(blur * MARGIN_FACTOR);
  const spriteWidth = width + margin * 2;
  const spriteHeight = height + margin * 2;

  const canvas = document.createElement("canvas");
  canvas.width = spriteWidth;
  canvas.height = spriteHeight;

  const ctx = canvas.getContext("2d")!;
  ctx.translate(margin, margin);
  ctx.shadowBlur = blur;
  ctx.shadowColor = color;
  draw(ctx);

  return {
    canvas,
    width: spriteWidth,
    height: spriteHeight,
    offsetX: margin,
    offsetY: margin,
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
): GlowSprite {
  const cached = keyedCache.get(key);
  if (cached) return cached;

  const sprite = renderGlowSprite(width, height, blur, color, draw);
  keyedCache.set(key, sprite);
  return sprite;
}

const instanceCache = new WeakMap<object, GlowSprite>();

// Formas generadas por instancia (ej. el polígono aleatorio de cada asteroide,
// generado una sola vez en su constructor): cacheadas por identidad del objeto vía
// `WeakMap`, liberadas automáticamente por el GC al perder la referencia.
export function getInstanceGlowSprite(
  instance: object,
  width: number,
  height: number,
  blur: number,
  color: string,
  draw: (ctx: CanvasRenderingContext2D) => void,
): GlowSprite {
  const cached = instanceCache.get(instance);
  if (cached) return cached;

  const sprite = renderGlowSprite(width, height, blur, color, draw);
  instanceCache.set(instance, sprite);
  return sprite;
}

// Dibuja un sprite cacheado centrado en (centerX, centerY), la convención que ya usan
// los engines para posicionar formas con glow.
export function drawGlowSprite(
  ctx: CanvasRenderingContext2D,
  sprite: GlowSprite,
  centerX: number,
  centerY: number,
): void {
  ctx.drawImage(
    sprite.canvas,
    centerX - sprite.offsetX,
    centerY - sprite.offsetY,
  );
}
