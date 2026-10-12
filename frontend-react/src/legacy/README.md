# legacy/

`css/` holds the ORIGINAL stylesheets from `front_end/css/`, copied byte-for-byte.
Do not edit them here: if the old UI changes, copy the file again. Pages use the same
class names and markup as the old HTML, so the React app looks exactly like the old site.

Why the styles are injected per page (`usePageStyles`) instead of imported globally:
the old site was multi-page, and each page loaded only its own stylesheets
(`profile.html` loads shared+profile, the Experience pages load styles+experiencestyles).
Those files redefine the same class names (`.primary-btn`, `.modal`, `.profile-header`, ...),
so loading them all at once would change how every page looks.
