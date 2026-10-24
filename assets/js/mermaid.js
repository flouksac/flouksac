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

// Native, dependency-free pan/zoom. Diagrams initially fit entirely inside
// the viewport; users can zoom, drag, pinch, use the keyboard, or expand.
const viewers = new Map();
let expandedViewer = null;

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function applyTransform(viewer) {
  viewer.node.style.transform = `translate(${viewer.x}px, ${viewer.y}px) scale(${viewer.scale})`;
}

function confine(viewer) {
  const width = viewer.viewport.clientWidth;
  const height = viewer.viewport.clientHeight;
  const contentWidth = viewer.svgWidth * viewer.scale;
  const contentHeight = viewer.svgHeight * viewer.scale;
  viewer.x = contentWidth <= width
    ? (width - contentWidth) / 2
    : clamp(viewer.x, width - contentWidth, 0);
  viewer.y = contentHeight <= height
    ? (height - contentHeight) / 2
    : clamp(viewer.y, height - contentHeight, 0);
}

function fitDiagram(viewer) {
  const width = viewer.viewport.clientWidth;
  const height = viewer.viewport.clientHeight;
  if (!width || !height || !viewer.svgWidth || !viewer.svgHeight) return;
  viewer.fitScale = Math.min(1, (width - 24) / viewer.svgWidth, (height - 24) / viewer.svgHeight);
  viewer.scale = viewer.fitScale;
  viewer.x = (width - viewer.svgWidth * viewer.scale) / 2;
  viewer.y = (height - viewer.svgHeight * viewer.scale) / 2;
  viewer.changed = false;
  applyTransform(viewer);
}

function zoomAt(viewer, x, y, requestedScale) {
  const lower = Math.max(.05, viewer.fitScale * .5);
  const upper = Math.max(2.5, viewer.fitScale * 5);
  const next = clamp(requestedScale, lower, upper);
  const ratio = next / viewer.scale;
  viewer.x = x - (x - viewer.x) * ratio;
  viewer.y = y - (y - viewer.y) * ratio;
  viewer.scale = next;
  viewer.changed = true;
  confine(viewer);
  applyTransform(viewer);
}

function localPoint(viewer, clientX, clientY) {
  const r = viewer.viewport.getBoundingClientRect();
  return { x: clientX - r.left, y: clientY - r.top };
}

function sizeViewer(viewer, reset = false) {
  if (!viewer.svgWidth || !viewer.svgHeight) return;
  const width = Math.max(240, viewer.viewport.clientWidth || viewer.figure.clientWidth - 2);
  if (!viewer.expanded) {
    const availableHeight = window.innerWidth <= 680 ? 440 : 580;
    const heightAtWidth = viewer.svgHeight * Math.min(1, (width - 24) / viewer.svgWidth) + 24;
    const height = Math.round(clamp(heightAtWidth, 260, availableHeight));
    if (viewer.viewport.style.height !== `${height}px`) viewer.viewport.style.height = `${height}px`;
  } else {
    viewer.viewport.style.removeProperty('height');
  }
  if (reset || !viewer.changed) {
    fitDiagram(viewer);
  } else {
    viewer.fitScale = Math.min(1,
      (viewer.viewport.clientWidth - 24) / viewer.svgWidth,
      (viewer.viewport.clientHeight - 24) / viewer.svgHeight);
    confine(viewer);
    applyTransform(viewer);
  }
}

function toggleExpanded(viewer, expand) {
  if (expand && expandedViewer && expandedViewer !== viewer) toggleExpanded(expandedViewer, false);
  if (expand === viewer.expanded) return;
  viewer.expanded = expand;
  viewer.figure.classList.toggle('is-expanded', expand);
  if (expand) {
    viewer.placeholder = document.createComment('Mermaid diagram original position');
    viewer.figure.before(viewer.placeholder);
    document.body.appendChild(viewer.figure);
    document.body.classList.add('flk-mermaid-modal-open');
    expandedViewer = viewer;
  } else {
    viewer.placeholder?.replaceWith(viewer.figure);
    viewer.placeholder = null;
    document.body.classList.remove('flk-mermaid-modal-open');
    expandedViewer = null;
  }
  viewer.expandButton.textContent = expand ? 'CLOSE' : 'EXPAND';
  viewer.expandButton.setAttribute('aria-label', expand ? 'Close expanded diagram' : 'Expand diagram');
  // Re-fit to the new view. Preserve no hidden horizontal scroll position.
  requestAnimationFrame(() => {
    sizeViewer(viewer, true);
    viewer.expandButton.focus({ preventScroll: true });
  });
}

function makeViewer(node) {
  const figure = node.closest('.flk-mermaid');
  if (!figure) return null;
  const viewport = document.createElement('div');
  viewport.className = 'flk-mermaid__viewport';
  viewport.tabIndex = 0;
  viewport.setAttribute('role', 'region');
  viewport.setAttribute('aria-label', 'Interactive Mermaid diagram. Drag to move; use plus, minus and arrow keys, or Ctrl and mouse wheel to zoom.');
  node.before(viewport);
  viewport.append(node);

  const bar = figure.querySelector('.flk-mermaid__bar');
  const tools = document.createElement('span');
  tools.className = 'flk-mermaid__tools';
  tools.setAttribute('role', 'toolbar');
  tools.setAttribute('aria-label', 'Diagram controls');
  function button(text, label, title) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'flk-mermaid__tool';
    el.textContent = text;
    el.setAttribute('aria-label', label);
    el.title = title;
    tools.append(el);
    return el;
  }
  const minus = button('−', 'Zoom out', 'Zoom out');
  const plus = button('+', 'Zoom in', 'Zoom in');
  const fit = button('FIT', 'Fit entire diagram', 'Fit diagram to window (0)');
  const expand = button('EXPAND', 'Expand diagram', 'Expand diagram to screen');
  bar?.append(tools);

  const hint = document.createElement('p');
  hint.className = 'flk-mermaid__hint';
  hint.textContent = 'Drag to pan · Ctrl + wheel or pinch to zoom · FIT to reset';
  viewport.after(hint);

  const viewer = {
    node, figure, viewport, expandButton: expand,
    svgWidth: 0, svgHeight: 0, scale: 1, fitScale: 1,
    x: 0, y: 0, changed: false, expanded: false,
    pointers: new Map(), gesture: null, placeholder: null
  };
  const midpoint = () => ({x: viewport.clientWidth / 2, y: viewport.clientHeight / 2});
  minus.addEventListener('click', () => {
    const pt = midpoint(); zoomAt(viewer, pt.x, pt.y, viewer.scale / 1.3);
  });
  plus.addEventListener('click', () => {
    const pt = midpoint(); zoomAt(viewer, pt.x, pt.y, viewer.scale * 1.3);
  });
  fit.addEventListener('click', () => fitDiagram(viewer));
  expand.addEventListener('click', () => toggleExpanded(viewer, !viewer.expanded));

  // Keep ordinary wheel scrolling available to the blog reader.
  viewport.addEventListener('wheel', (event) => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    const pt = localPoint(viewer, event.clientX, event.clientY);
    zoomAt(viewer, pt.x, pt.y, viewer.scale * Math.exp(-event.deltaY * .008));
  }, { passive: false });
  viewport.addEventListener('dblclick', (event) => {
    event.preventDefault();
    const pt = localPoint(viewer, event.clientX, event.clientY);
    zoomAt(viewer, pt.x, pt.y, viewer.scale * 1.5);
  });

  function pairGesture() {
    const values = [...viewer.pointers.values()];
    if (values.length !== 2) return null;
    const first = localPoint(viewer, values[0].x, values[0].y);
    const second = localPoint(viewer, values[1].x, values[1].y);
    return {
      x: (first.x + second.x) / 2,
      y: (first.y + second.y) / 2,
      distance: Math.hypot(first.x - second.x, first.y - second.y)
    };
  }
  viewport.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    viewport.focus({ preventScroll: true });
    viewport.setPointerCapture(event.pointerId);
    viewer.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    viewer.gesture = pairGesture();
    viewport.classList.add('is-dragging');
  });
  viewport.addEventListener('pointermove', event => {
    const previous = viewer.pointers.get(event.pointerId);
    if (!previous) return;
    viewer.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (viewer.pointers.size === 2) {
      const gesture = pairGesture();
      if (gesture && viewer.gesture) {
        zoomAt(viewer, viewer.gesture.x, viewer.gesture.y,
          viewer.scale * (gesture.distance / Math.max(1, viewer.gesture.distance)));
        viewer.x += gesture.x - viewer.gesture.x;
        viewer.y += gesture.y - viewer.gesture.y;
        confine(viewer);
        applyTransform(viewer);
      }
      viewer.gesture = gesture;
    } else if (viewer.pointers.size === 1) {
      viewer.x += event.clientX - previous.x;
      viewer.y += event.clientY - previous.y;
      viewer.changed = true;
      confine(viewer);
      applyTransform(viewer);
    }
  });
  function release(event) {
    viewer.pointers.delete(event.pointerId);
    viewer.gesture = pairGesture();
    if (!viewer.pointers.size) viewport.classList.remove('is-dragging');
  }
  viewport.addEventListener('pointerup', release);
  viewport.addEventListener('pointercancel', release);
  viewport.addEventListener('keydown', event => {
    const pt = midpoint();
    let handled = true;
    switch (event.key) {
      case '+': case '=': zoomAt(viewer, pt.x, pt.y, viewer.scale * 1.3); break;
      case '-': case '_': zoomAt(viewer, pt.x, pt.y, viewer.scale / 1.3); break;
      case '0': case 'Home': fitDiagram(viewer); break;
      case 'ArrowLeft': viewer.x += 48; break;
      case 'ArrowRight': viewer.x -= 48; break;
      case 'ArrowUp': viewer.y += 48; break;
      case 'ArrowDown': viewer.y -= 48; break;
      default: handled = false;
    }
    if (!handled) return;
    event.preventDefault();
    if (event.key.startsWith('Arrow')) {
      viewer.changed = true;
      confine(viewer);
      applyTransform(viewer);
    }
  });
  viewers.set(node, viewer);
  return viewer;
}

function mountPanZoom(node) {
  const svg = node.querySelector('svg');
  if (!svg) return;
  const viewBox = svg.viewBox?.baseVal;
  let width = viewBox?.width || 0;
  let height = viewBox?.height || 0;
  if (!width || !height) {
    const bbox = svg.getBBox();
    width = bbox.width;
    height = bbox.height;
  }
  if (!width || !height) return;
  let viewer = viewers.get(node);
  if (!viewer) viewer = makeViewer(node);
  if (!viewer) return;
  viewer.svgWidth = width;
  viewer.svgHeight = height;
  svg.style.width = `${width}px`;
  svg.style.height = `${height}px`;
  svg.style.maxWidth = 'none';
  node.style.width = `${width}px`;
  node.style.height = `${height}px`;
  node.tabIndex = -1; // the surrounding viewport is the keyboard target
  sizeViewer(viewer, true);
}

window.addEventListener('resize', () => {
  for (const viewer of viewers.values()) sizeViewer(viewer);
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && expandedViewer) {
    event.preventDefault();
    toggleExpanded(expandedViewer, false);
  }
});

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
        mountPanZoom(node);
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
