// Stylesheet bundles, one per kind of page, mirroring what each old HTML page linked.
//   <link href="../css/styles.css"> + <link href="../css/experiencestyles.css">  -> EXPERIENCE_CSS
//   <link href="../css/shared.css"> + <link href="../css/profile.css">           -> PROFILE_CSS
// `?inline` gives the CSS text (with @imports resolved) instead of adding it to the page.
import sharedCss from './css/shared.css?inline';
import stylesCss from './css/styles.css?inline';
import experienceCss from './css/experiencestyles.css?inline';
import profileCss from './css/profile.css?inline';

export const NAVBAR_CSS = [sharedCss];
export const EXPERIENCE_CSS = [stylesCss, experienceCss];
export const PROFILE_CSS = [sharedCss, profileCss];
