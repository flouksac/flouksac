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
    // A strict privacy setup or DNS/CDN issue can block one provider. Both
    // hosts serve the same pinned Mermaid release and its relative chunks.
    const providers = [
      'https://cdn.jsdelivr.net/npm/mermaid@11.17.2/dist/mermaid.esm.min.mjs',
      'https://unpkg.com/mermaid@11.17.2/dist/mermaid.esm.min.mjs'
    ];
    loading = (async () => {
      let lastError;
      for (const url of providers) {
        try {
          const { default: mermaid } = await import(url);
          mermaid.initialize({
            startOnLoad: false,
            securityLevel: 'strict',
            theme: currentTheme(),
            fontFamily: 'Space Grotesk, sans-serif',
            flowchart: { htmlLabels: false, useMaxWidth: true },
            sequence: { useMaxWidth: true, showSequenceNumbers: false }
          });
          library = mermaid;
          return mermaid;
        } catch (error) {
          lastError = error;
        }
      }
      throw lastError;
    })().catch((error) => {
      loading = null; // Retry if a later render is requested.
      throw error;
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
      targets.forEach((node) => {
        const figure = node.closest('.flk-mermaid');
        figure?.classList.remove('has-error');
        figure?.classList.add('is-rendered');
        const status = figure?.querySelector('.flk-mermaid__status');
        if (status) status.hidden = true;
      });
    } catch (error) {
      // Never lose the source. Expose a useful hint instead of silently
      // leaving raw Mermaid syntax on a published article.
      targets.forEach((node) => {
        node.textContent = sources.get(node);
        const figure = node.closest('.flk-mermaid');
        figure?.classList.remove('is-rendered');
        figure?.classList.add('has-error');
        const status = figure?.querySelector('.flk-mermaid__status');
        if (status) {
          status.hidden = false;
          status.textContent = 'Unable to render this diagram. The Mermaid library may be blocked by your browser or network, or the diagram syntax may be invalid. Source is shown below.';
        }
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
