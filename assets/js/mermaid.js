// Mermaid bootstrap. Renders Hugo's specific Mermaid hook and safely upgrades
// unconverted ```mermaid fences produced by older Hugo template layouts.
// The heavy Mermaid library is fetched only on pages containing diagrams.
function upgradeLegacyCodeBlocks() {
  const rawBlocks = document.querySelectorAll(
    'pre code.language-mermaid, pre code[data-lang="mermaid"]'
  );

  for (const code of rawBlocks) {
    if (code.closest('.flk-mermaid')) continue;

    const sourceText = code.textContent.trim();
    if (!sourceText) continue;

    const oldWrapper = code.closest('.highlight') || code.closest('pre');
    if (!oldWrapper) continue;

    const figure = document.createElement('figure');
    figure.className = 'flk-mermaid';

    const heading = document.createElement('figcaption');
    heading.className = 'flk-mermaid__bar';
    heading.textContent = 'DIAGRAM // MERMAID';

    const diagram = document.createElement('pre');
    diagram.className = 'mermaid flk-mermaid__canvas';
    diagram.textContent = sourceText;

    const status = document.createElement('p');
    status.className = 'flk-mermaid__status';
    status.setAttribute('role', 'status');
    status.hidden = true;

    const details = document.createElement('details');
    details.className = 'flk-mermaid__source';
    const summary = document.createElement('summary');
    summary.textContent = 'View source';
    const sourcePre = document.createElement('pre');
    const sourceCode = document.createElement('code');
    sourceCode.textContent = sourceText;
    sourcePre.appendChild(sourceCode);
    details.append(summary, sourcePre);

    figure.append(heading, diagram, status, details);
    oldWrapper.replaceWith(figure);
  }
}

upgradeLegacyCodeBlocks();

const nodes = [...document.querySelectorAll('.flk-mermaid__canvas')];
const sources = new Map(nodes.map(node => [node, node.textContent.trim()]));
const currentTheme = () => document.documentElement.dataset.theme === 'light' ? 'neutral' : 'dark';
let libraryPromise;
let library;
let rendering = Promise.resolve();

async function getLibrary() {
  if (!libraryPromise) {
    libraryPromise = (async () => {
      const providers = [
        'https://cdn.jsdelivr.net/npm/mermaid@11.17.2/dist/mermaid.esm.min.mjs',
        'https://unpkg.com/mermaid@11.17.2/dist/mermaid.esm.min.mjs'
      ];
      let lastError;
      for (const url of providers) {
        try {
          const module = await import(url);
          const mermaid = module.default;
          if (!mermaid || typeof mermaid.run !== 'function') throw new Error('Invalid Mermaid module');
          library = mermaid;
          return mermaid;
        } catch (error) {
          lastError = error;
        }
      }
      throw lastError || new Error('Unable to download the Mermaid library');
    })().catch((error) => {
      libraryPromise = undefined;
      throw error;
    });
  }
  return libraryPromise;
}

function configure(mermaid) {
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: currentTheme(),
    fontFamily: 'Space Grotesk, sans-serif',
    flowchart: { htmlLabels: false, useMaxWidth: true },
    sequence: { useMaxWidth: true }
  });
}

function render(targets) {
  rendering = rendering.then(async () => {
    try {
      const mermaid = await getLibrary();
      configure(mermaid);
      for (const node of targets) {
        node.textContent = sources.get(node);
        node.removeAttribute('data-processed');
      }
      await mermaid.run({ nodes: targets });
      for (const node of targets) {
        const figure = node.closest('.flk-mermaid');
        figure?.classList.remove('has-error');
        figure?.classList.add('is-rendered');
        const status = figure?.querySelector('.flk-mermaid__status');
        if (status) status.hidden = true;
      }
    } catch (error) {
      for (const node of targets) {
        node.textContent = sources.get(node);
        const figure = node.closest('.flk-mermaid');
        figure?.classList.remove('is-rendered');
        figure?.classList.add('has-error');
        const status = figure?.querySelector('.flk-mermaid__status');
        if (status) {
          status.hidden = false;
          status.textContent = `Unable to render Mermaid: ${error?.message || String(error)}. Diagram source is preserved below.`;
        }
      }
      console.error('Mermaid rendering failed:', error);
    }
  });
}

if (nodes.length) {
  const activated = new Set();
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting || activated.has(entry.target)) continue;
        activated.add(entry.target);
        observer.unobserve(entry.target);
        render([entry.target]);
      }
    }, { rootMargin: '700px' });
    nodes.forEach(node => observer.observe(node));
  } else {
    nodes.forEach(node => activated.add(node));
    render(nodes);
  }

  new MutationObserver(() => {
    if (library && activated.size) render([...activated]);
  }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme']
  });
}
