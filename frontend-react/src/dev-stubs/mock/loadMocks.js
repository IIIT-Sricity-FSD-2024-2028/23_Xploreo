// TEMP-STUB: imports src/mocks/<domain>/index.js for each domain named in VITE_MOCKS.
//   VITE_MOCKS=all | partners,schedule | (empty = everything real)
// Mocks exist in development only: the glob is empty in a production build, so no fixture
// data can ship.
const modules = import.meta.env.DEV ? import.meta.glob('/src/mocks/*/index.js') : {};

export async function loadMocks() {
  const flag = (import.meta.env.VITE_MOCKS || '').trim();
  if (!flag) return [];
  const enabled = flag === 'all' ? null : flag.split(',').map((d) => d.trim()).filter(Boolean);
  const loaded = [];
  for (const [path, load] of Object.entries(modules)) {
    const domain = path.split('/')[3];
    if (!enabled || enabled.includes(domain)) {
      await load();
      loaded.push(domain);
    }
  }
  return loaded;
}
