import { UI_SCALE } from '@/legacy/scaleCss.js';

// For the few sizes written inline in JSX (style={{ padding: px(20) }}), so they shrink with the CSS.
export const px = (n) => Math.round(n * UI_SCALE * 100) / 100;

// Same for font sizes, never below the readable minimum the CSS scaler also keeps.
export const fontPx = (n) => Math.max(11, px(n));
