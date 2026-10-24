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
const isLightTheme = () => document.documentElement.dataset.theme === 'light';

// The site has its own color system. Mermaid's stock dark/neutral themes use
// unrelated palettes and can leave labels invisible over sequence regions.
const palettes = {
  dark: {
    darkMode: true,
    background: '#090e14',
    primaryColor: '#152431', primaryBorderColor: '#65c9d0', primaryTextColor: '#f4fbff',
    secondaryColor: '#213b48', secondaryBorderColor: '#5bb5c0', secondaryTextColor: '#f4fbff',
    tertiaryColor: '#1a2933', tertiaryBorderColor: '#6d8997', tertiaryTextColor: '#f4fbff',
    mainBkg: '#152431', textColor: '#ecf7fb', lineColor: '#8dbecb',
    nodeTextColor: '#f4fbff', clusterBkg: '#15222d', clusterBorder: '#587b89',
    edgeLabelBackground: '#152431',
    actorBkg: '#152431', actorBorder: '#65c9d0', actorTextColor: '#f4fbff',
    actorLineColor: '#87a7b4', signalColor: '#93cbd5', signalTextColor: '#ecf7fb',
    labelBoxBkgColor: '#213644', labelBoxBorderColor: '#65c9d0',
    labelTextColor: '#f4fbff', loopTextColor: '#f4fbff',
    activationBkgColor: '#274c59', activationBorderColor: '#6ac4ce',
    noteBkgColor: '#29313f', noteBorderColor: '#77909f', noteTextColor: '#f4fbff',
    sequenceNumberColor: '#ffe48b'
  },
  light: {
    darkMode: false,
    background: '#fafcfb',
    primaryColor: '#e4f4f2', primaryBorderColor: '#007987', primaryTextColor: '#14262e',
    secondaryColor: '#d7ebee', secondaryBorderColor: '#237a87', secondaryTextColor: '#14262e',
    tertiaryColor: '#f0f3f6', tertiaryBorderColor: '#63838c', tertiaryTextColor: '#14262e',
    mainBkg: '#e4f4f2', textColor: '#1d3038', lineColor: '#4c7280',
    nodeTextColor: '#14262e', clusterBkg: '#edf5f3', clusterBorder: '#6d939c',
    edgeLabelBackground: '#fafcfb',
    actorBkg: '#e4f4f2', actorBorder: '#007987', actorTextColor: '#14262e',
    actorLineColor: '#567985', signalColor: '#426c79', signalTextColor: '#1d3038',
    labelBoxBkgColor: '#deeff1', labelBoxBorderColor: '#007987',
    labelTextColor: '#14262e', loopTextColor: '#14262e',
    activationBkgColor: '#cee5ea', activationBorderColor: '#237a87',
    noteBkgColor: '#fff1ce', noteBorderColor: '#a58b4f', noteTextColor: '#26313a',
    sequenceNumberColor: '#00556c'
  }
};

// In dark mode very pale `rect rgb(...)` bands from authored sequence diagrams
// would put near-white labels on a near-white region. Adapt only pale bands for
// rendering; the "View source" panel retains the original, unmodified code.
function themeAwareSource(source) {
  if (isLightTheme() || !/^\s*sequenceDiagram\b/im.test(source)) return source;
  const darkBands = [
    'rgba(58, 133, 180, .17)',
    'rgba(124, 102, 162, .15)',
    'rgba(57, 153, 132, .16)'
  ];
  let band = 0;
  return source.replace(/^(\s*rect\s+)rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)/gim,
    (match, prefix, r, g, b) => {
      const channels = [Number(r), Number(g), Number(b)];
      if (channels.some(value => value > 255)) return match;
      // Restrict to pastel shades; don't reinterpret deliberately vivid colors.
      if (Math.min(...channels) < 205) return match;
      return `${prefix}${darkBands[band++ % darkBands.length]}`;
    }
  );
}

function keepTextReadable(node) {
  const svg = node.querySelector('svg');
  const intrinsicWidth = svg?.viewBox?.baseVal?.width;
  if (!intrinsicWidth || !Number.isFinite(intrinsicWidth)) return;
  // Keep Mermaid's native text size. Large sequence diagrams scroll sideways
  // rather than shrinking every label to 8px on phones or narrow blog layouts.
  svg.style.width = `${Math.ceil(intrinsicWidth)}px`;
  svg.style.maxWidth = 'none';
  svg.style.height = 'auto';
  node.tabIndex = 0;
  node.setAttribute('role', 'region');
  node.setAttribute('aria-label', 'Mermaid diagram; scroll horizontally if necessary');
}

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
  const palette = isLightTheme() ? palettes.light : palettes.dark;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'base',
    themeVariables: {
      ...palette,
      fontFamily: 'Space Grotesk, sans-serif',
      fontSize: '16px'
    },
    flowchart: { htmlLabels: false, useMaxWidth: false },
    sequence: { useMaxWidth: false }
  });
}

function render(targets) {
  rendering = rendering.then(async () => {
    try {
      const mermaid = await getLibrary();
      configure(mermaid);
      for (const node of targets) {
        node.textContent = themeAwareSource(sources.get(node));
        node.removeAttribute('data-processed');
      }
      await mermaid.run({ nodes: targets });
      for (const node of targets) {
        const figure = node.closest('.flk-mermaid');
        figure?.classList.remove('has-error');
        figure?.classList.add('is-rendered');
        keepTextReadable(node);
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
