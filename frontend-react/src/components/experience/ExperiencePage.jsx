import { EXPERIENCE_CSS } from '@/legacy/styles.js';
import { usePageStyles } from '@/lib/usePageStyles.js';

// Wraps every Experience page the way the old HTML did:
//   <body class="experience-page experience-xxx-page"> ... <main class="experience-shell"> ... </main>
export default function ExperiencePage({ pageClass, title, children }) {
  usePageStyles(EXPERIENCE_CSS, `experience-page ${pageClass}`, title);
  return <main className="experience-shell">{children}</main>;
}
