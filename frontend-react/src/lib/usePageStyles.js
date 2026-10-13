import { useLayoutEffect } from 'react';
import { rootFontCss, scaleCss } from '@/legacy/scaleCss.js';

// Applies a page's original stylesheets and <body> classes while the page is mounted, then
// removes them. This is how a multi-page site (one stylesheet set per page) is reproduced in a
// single-page app without the pages' CSS leaking into each other.
//
//   usePageStyles(EXPERIENCE_CSS, 'experience-page experience-home-page', 'Experience Home');
//
// The CSS is scaled to the app's UI density on the way in (see legacy/scaleCss.js).
// `cssTexts` must be a stable (module-level) array.
export function usePageStyles(cssTexts, bodyClass = '', title) {
  useLayoutEffect(() => {
    const nodes = [...cssTexts.map((text) => scaleCss(text)), rootFontCss()].map((text) => {
      const node = document.createElement('style');
      node.setAttribute('data-legacy-css', '');
      node.textContent = text;
      document.head.appendChild(node);
      return node;
    });
    const classes = bodyClass.split(/\s+/).filter(Boolean);
    document.body.classList.add(...classes);
    const previousTitle = document.title;
    if (title) document.title = `${title} - Xploreo`;
    return () => {
      nodes.forEach((node) => node.remove());
      document.body.classList.remove(...classes);
      document.title = previousTitle;
    };
  }, [cssTexts, bodyClass, title]);
}
