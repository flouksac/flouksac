// Diagram renderer is loaded only on pages that contain fenced Mermaid blocks.
// All content stays readable as source when the external engine is unavailable.
const nodes = [...document.querySelectorAll('.flk-mermaid__canvas')];
const sources = new Map(nodes.map((node) => [node, node.textContent.trim()]));
let library = null;
let loading = null;
let rendering = Promise.resolve();
const currentTheme = () => document.documentElement.dataset.theme === 'light' ? 'neutral' : 'dark';

const getLibrary = async () => {
  if (!loading) {
    loading = import('https://cdn.jsdelivr.net/npm/mermaid@11.17.2/dist/mermaid.esm.min.mjs')
      .then(({ default: mermaid }) => {
        library = mermaid;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: currentTheme(),
          fontFamily: 'Space Grotesk, sans-serif',
          flowchart: { htmlLabels: false, useMaxWidth: true },
          sequence: { useMaxWidth: true, showSequenceNumbers: false }
        });
        return mermaid;
      });
  }
  return loading;
};

const render = (targets, resetTheme = false) => {
  rendering = rendering.then(async () => {
    try {
      const mermaid = await getLibrary();
      if (resetTheme) {
        mermaid.initialize({ startOnLoad: false, securityLevel: 'strict',
          theme: currentTheme(), fontFamily: 'Space Grotesk, sans-serif',
          flowchart: { htmlLabels: false, useMaxWidth: true }, sequence: { useMaxWidth: true }
        });
      }
      for (const node of targets) {
        node.textContent = sources.get(node);
        node.removeAttribute('data-processed');
      }
      await mermaid.run({ nodes: targets });
      targets.forEach((node) => node.closest('.flk-mermaid')?.classList.add('is-rendered'));
    } catch (error) {
      // Leave Markdown diagram source visible if loading or parsing fails.
      targets.forEach((node) => {
        node.textContent = sources.get(node);
        node.closest('.flk-mermaid')?.classList.add('has-error');
      });
      console.warn('Mermaid diagram rendering unavailable:', error);
    }
  });
};

if (nodes.length) {
  const rendered = new Set();
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting || rendered.has(entry.target)) continue;
        rendered.add(entry.target);
        observer.unobserve(entry.target);
        render([entry.target]);
      }
    }, { rootMargin: '600px' });
    nodes.forEach((node) => observer.observe(node));
  } else {
    nodes.forEach((node) => rendered.add(node));
    render(nodes);
  }

  // Re-render only diagrams already on screen when the site's theme changes.
  new MutationObserver(() => {
    if (library && rendered.size) render([...rendered], true);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}
