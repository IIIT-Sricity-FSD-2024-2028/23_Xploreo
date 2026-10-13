// Shrinks the original stylesheets to a comfortable density without editing them.
//
// The old front_end was drawn for a roomy desktop (22-32px headings, 24-36px card padding,
// 190px-tall stat cards) and needs a lot of scrolling on a laptop. Instead of forking every
// stylesheet, every `px` length is multiplied by UI_SCALE as the page's CSS is injected.
// The files in ./css stay byte-for-byte copies of the old ones.
//
// Rules (so the result stays sharp and readable):
//  - media-query breakpoints are never touched
//  - page-width containers (width / max-width / min-width of 900px or more) are not shrunk,
//    so wide screens still fill nicely
//  - px lengths are multiplied; rem/em (and the browser's default heading sizes, which are em-based)
//    shrink through the root font size, see rootFontCss()
//  - font sizes never go below MIN_FONT_PX
//  - anything that was at least 1px stays at least 1px (borders keep their hairline)
//  - declarations containing url(...) are left alone
//
// To make the whole UI bigger or smaller change UI_SCALE (1 = exactly the old sizes).
export const UI_SCALE = 0.8;
const MIN_FONT_PX = 11;
const WIDE_CONTAINER_PX = 900;

const WIDTH_PROPS = new Set(['width', 'max-width', 'min-width']);
const cache = new Map();

// The old CSS leans on rem/em and on the browser's default sizes (an unstyled h1 is 2em = 32px),
// none of which a px rewrite can reach. They all follow the root font size, so shrinking that
// one value brings them down with everything else.
export const rootFontCss = (scale = UI_SCALE) => `html { font-size: ${fmt(16 * scale)}px; }`;

function fmt(n) {
  return String(Number(n.toFixed(2)));
}

function scaleValue(prop, value, scale) {
  if (value.includes('url(')) return value;
  // clamp(2.2rem, 3vw, 3rem): the fluid middle term has to shrink with its bounds or it wins.
  if (value.includes('clamp(')) {
    value = value.replace(/(-?\d*\.?\d+)vw\b/g, (m, n) => `${fmt(Number(n) * scale)}vw`);
  }
  // Only px is rewritten. rem/em follow the root font size, which rootFontCss() shrinks.
  return value.replace(/(-?\d*\.?\d+)px\b/g, (match, num) => {
    const px = Number(num);
    if (px === 0) return match;
    if (WIDTH_PROPS.has(prop) && Math.abs(px) >= WIDE_CONTAINER_PX) return match;
    let scaled = px * scale;
    if (prop === 'font-size' || prop === 'font') scaled = Math.max(scaled, Math.min(px, MIN_FONT_PX));
    if (Math.abs(px) >= 1 && Math.abs(scaled) < 1) scaled = Math.sign(px);
    return `${fmt(scaled)}px`;
  });
}

export function scaleCss(text, scale = UI_SCALE) {
  if (scale === 1) return text;
  const key = `${scale}:${text.length}:${text.slice(0, 64)}:${text.slice(-64)}`;
  const hit = cache.get(key);
  if (hit) return hit;
  // Alternation: an @media / @container prelude is copied as-is, otherwise a declaration is scaled.
  const out = text.replace(
    /(@(?:media|container|supports)[^{]*\{)|([\w-]+)(\s*:\s*)([^;{}]*)/g,
    (match, prelude, prop, colon, value) => {
      if (prelude) return prelude;
      return `${prop}${colon}${scaleValue(prop.toLowerCase(), value, scale)}`;
    },
  );
  cache.set(key, out);
  return out;
}
