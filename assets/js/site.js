(() => {
  const root = document.documentElement;
  const savedTheme = localStorage.getItem('theme');
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  root.dataset.theme = savedTheme || (prefersLight ? 'light' : 'dark');

  const themeButton = document.querySelector('[data-theme-toggle]');
  themeButton?.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    localStorage.setItem('theme', next);
  });

  const nav = document.querySelector('[data-nav]');
  const navToggle = document.querySelector('[data-nav-toggle]');
  navToggle?.addEventListener('click', () => {
    const open = nav?.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(Boolean(open)));
  });



  const readingProgress = document.querySelector('[data-reading-progress] span');
  if (readingProgress) {
    let ticking = false;
    const updateReadingProgress = () => {
      const doc = document.documentElement;
      const scrollable = Math.max(1, doc.scrollHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, window.scrollY / scrollable));
      readingProgress.style.transform = `scaleX(${progress})`;
      readingProgress.parentElement?.classList.toggle('is-complete', progress > 0.985);
      ticking = false;
    };
    const requestProgressUpdate = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(updateReadingProgress);
    };
    updateReadingProgress();
    window.addEventListener('scroll', requestProgressUpdate, { passive: true });
    window.addEventListener('resize', requestProgressUpdate, { passive: true });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nav?.classList.contains('is-open')) {
      nav.classList.remove('is-open');
      navToggle?.setAttribute('aria-expanded', 'false');
    }
  });

  // Make the slash in numbered headings part of the typography itself.
  // Preserve existing inline markup and actual heading text.
  document.querySelectorAll('.article-body h2, .article-body h3, .article-body h4').forEach((heading) => {
    const first = heading.firstChild;
    if (!first || first.nodeType !== Node.TEXT_NODE) return;
    const text = first.nodeValue;
    const separator = text.indexOf('//');
    if (separator < 0) return;
    const before = text.slice(0, separator);
    const after = text.slice(separator + 2);
    const slash = document.createElement('span');
    slash.className = 'heading-slash';
    slash.textContent = '//';
    first.replaceWith(document.createTextNode(before), slash, document.createTextNode(after));
  });


  // Ambient Matrix rain sits above the fixed SVG background, behind all UI.
  // Throttled and atlas-rendered: avoids expensive fillText calls on each frame.
  (() => {
    const canvas = document.getElementById('matrixCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    if (!ctx) return;
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const charset = [...'01abcdef0123456789{}[]<>/$#@+-=',
      ...'アイウエオカキクケコサシスセソタチツテトナニヌネノマミムメモヤユヨラリルレロワン',
      'FLK', 'flouksac', 'RmxvdWtzYWM=', '0x464c4b'];
    const cell = 25;
    const fontSize = 16;
    const atlasCellWidth = 128;
    const atlasCellHeight = 22;
    const atlasColumns = 16;
    const framePeriod = 1000 / 24;
    let width = 0, height = 0, columns = [], atlas, glyphPositions = new Map();
    let frame = 0, lastPaint = 0, resizeFrame = 0, motionReduced = motionQuery.matches;

    const buildAtlas = () => {
      const dark = root.dataset.theme !== 'light';
      const palette = dark
        ? ['#4bd3d8', '#ef4d77', '#a5bbc2']
        : ['#007888', '#b13f68', '#385b64'];
      const rowsPerPalette = Math.ceil(charset.length / atlasColumns);
      const w = atlasColumns * atlasCellWidth;
      const h = rowsPerPalette * palette.length * atlasCellHeight;
      atlas = typeof OffscreenCanvas === 'function'
        ? new OffscreenCanvas(w, h)
        : document.createElement('canvas');
      atlas.width = w;
      atlas.height = h;
      const buffer = atlas.getContext('2d', { alpha: true });
      buffer.clearRect(0, 0, w, h);
      buffer.font = `${fontSize}px ui-monospace, SFMono-Regular, Consolas, monospace`;
      buffer.textBaseline = 'top';
      glyphPositions = new Map();
      palette.forEach((color, colorIndex) => {
        buffer.fillStyle = color;
        charset.forEach((glyph, glyphIndex) => {
          const sx = (glyphIndex % atlasColumns) * atlasCellWidth;
          const sy = (Math.floor(glyphIndex / atlasColumns) + colorIndex * rowsPerPalette) * atlasCellHeight;
          buffer.fillText(glyph, sx, sy);
          glyphPositions.set(`${colorIndex}:${glyphIndex}`, {
            sx, sy, width: Math.min(atlasCellWidth, Math.ceil(buffer.measureText(glyph).width) + 3)
          });
        });
      });
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      const count = Math.ceil(width / cell);
      columns = Array.from({ length: count }, (_, index) => ({
        x: index * cell,
        y: Math.random() * (height + 200) - height,
        speed: 25 + Math.random() * 48,
        tail: 5 + Math.floor(Math.random() * 5),
        color: Math.floor(Math.random() * 3),
        seed: Math.floor(Math.random() * charset.length)
      }));
    };

    const draw = (now) => {
      frame = requestAnimationFrame(draw);
      if (!motionReduced && lastPaint && now - lastPaint < framePeriod) return;
      const dt = motionReduced ? 0 : Math.min(.08, (now - (lastPaint || now)) / 1000);
      lastPaint = now;
      ctx.clearRect(0, 0, width, height);
      const cycle = Math.floor(now / 230);
      for (const col of columns) {
        for (let i = col.tail - 1; i >= 0; i--) {
          const y = col.y - i * cell;
          if (y < -cell || y > height) continue;
          const idx = (col.seed + i * 17 + cycle * 3) % charset.length;
          const sprite = glyphPositions.get(`${col.color}:${idx}`);
          if (!sprite || !atlas) continue;
          ctx.globalAlpha = (.13 + .62 * Math.pow(1 - i / col.tail, 1.8));
          ctx.drawImage(atlas, sprite.sx, sprite.sy, sprite.width, atlasCellHeight,
            col.x, y, sprite.width, atlasCellHeight);
        }
        if (!motionReduced) {
          col.y += col.speed * dt;
          if (col.y - col.tail * cell > height) {
            col.y = -Math.random() * 300;
            col.speed = 25 + Math.random() * 48;
            col.color = Math.floor(Math.random() * 3);
          }
        }
      }
      ctx.globalAlpha = 1;
      if (motionReduced) stop();
    };

    const stop = () => { if (frame) cancelAnimationFrame(frame); frame = 0; };
    const start = () => {
      if (frame || document.hidden) return;
      lastPaint = 0;
      frame = requestAnimationFrame(draw);
    };
    const requestResize = () => {
      if (resizeFrame) return;
      resizeFrame = requestAnimationFrame(() => { resizeFrame = 0; resize(); if (motionReduced) start(); });
    };
    buildAtlas();
    resize();
    start();
    window.addEventListener('resize', requestResize, { passive: true });
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
    motionQuery.addEventListener?.('change', (event) => {
      motionReduced = event.matches;
      stop();
      start();
    });
    new MutationObserver(() => { buildAtlas(); if (motionReduced) start(); })
      .observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  })();

  const searchInput = document.querySelector('[data-search-input]');
  const searchResults = document.querySelector('[data-search-results]');
  if (searchInput && searchResults) {
    const indexUrl = searchInput.getAttribute('data-index-url') || '/index.json';
    let documents = [];
    fetch(indexUrl)
      .then((response) => response.ok ? response.json() : [])
      .then((data) => { documents = Array.isArray(data) ? data : []; })
      .catch(() => { searchResults.innerHTML = '<p class="muted">Search index unavailable.</p>'; });

    const render = (items) => {
      searchResults.innerHTML = items.slice(0, 12).map((item) => `
        <article class="content-card">
          <a class="card-hit" href="${item.url}" aria-label="Open ${item.title}"></a>
          <div class="card-kicker"><span>${item.section || 'note'}</span><span>${item.date || ''}</span></div>
          <h3><a href="${item.url}">${item.title}</a></h3>
          <p>${item.summary || ''}</p>
        </article>
      `).join('') || '<p class="muted">No matching result.</p>';
    };

    searchInput.addEventListener('input', () => {
      const query = searchInput.value.trim().toLowerCase();
      if (query.length < 2) {
        searchResults.innerHTML = '';
        return;
      }
      const terms = query.split(/\s+/).filter(Boolean);
      const matches = documents.filter((doc) => {
        const haystack = [doc.title, doc.summary, doc.section, ...(doc.tags || []), ...(doc.playlists || [])]
          .join(' ')
          .toLowerCase();
        return terms.every((term) => haystack.includes(term));
      });
      render(matches);
    });
  }


  const copyText = async (text, fallbackNode) => {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.inset = '0 auto auto 0';
    textarea.style.width = '1px';
    textarea.style.height = '1px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand('copy');
    textarea.remove();
    if (!ok && fallbackNode) {
      fallbackNode.removeAttribute('aria-hidden');
      fallbackNode.focus();
      fallbackNode.select();
      document.execCommand('copy');
      fallbackNode.setAttribute('aria-hidden', 'true');
      window.getSelection()?.removeAllRanges();
    }
  };

  const createCodeBar = (language = 'text', title = '') => {
    const bar = document.createElement('figcaption');
    bar.className = 'flk-codeblock__bar';
    bar.innerHTML = `
      <span class="flk-codeblock__meta">
        <span class="flk-codeblock__dot" aria-hidden="true"></span>
        <span class="flk-codeblock__lang"></span>
        ${title ? '<span class="flk-codeblock__title"></span>' : ''}
      </span>
      <button class="flk-codeblock__copy" type="button" aria-label="Copy code to clipboard">
        <span class="flk-codeblock__copy-label">COPY</span>
      </button>`;
    bar.querySelector('.flk-codeblock__lang').textContent = language;
    const titleNode = bar.querySelector('.flk-codeblock__title');
    if (titleNode) titleNode.textContent = title;
    return bar;
  };

  const upgradeLegacyCodeBlocks = () => {
    document.querySelectorAll('.article-body pre code').forEach((code, index) => {
      if (code.closest('.flk-codeblock')) return;
      const pre = code.closest('pre');
      if (!pre) return;
      const highlight = pre.closest('.highlight');
      const target = highlight || pre;
      if (!target.parentNode || target.closest('.flk-codeblock')) return;

      const className = Array.from(code.classList).find((name) => name.startsWith('language-')) || '';
      const language = className.replace('language-', '') || code.getAttribute('data-lang') || 'text';
      const figure = document.createElement('figure');
      figure.className = 'flk-codeblock flk-codeblock--legacy';
      figure.dataset.codeblock = `legacy-${index}`;

      const body = document.createElement('div');
      body.className = 'flk-codeblock__body';
      const source = document.createElement('textarea');
      source.className = 'flk-codeblock__source';
      source.setAttribute('aria-hidden', 'true');
      source.setAttribute('tabindex', '-1');
      source.value = code.innerText.replace(/\n$/, '');

      target.parentNode.insertBefore(figure, target);
      figure.appendChild(createCodeBar(language));
      figure.appendChild(body);
      body.appendChild(target);
      figure.appendChild(source);
    });
  };

  const enhanceCodeCopy = () => {
    upgradeLegacyCodeBlocks();
    document.addEventListener('click', async (event) => {
      const button = event.target.closest('.flk-codeblock__copy');
      if (!button) return;
      const block = button.closest('.flk-codeblock');
      const source = block?.querySelector('.flk-codeblock__source');
      const label = button.querySelector('.flk-codeblock__copy-label');
      if (!block || !label) return;

      const codeText = source?.value || block.querySelector('pre')?.innerText || '';
      const original = label.textContent;
      try {
        await copyText(codeText.replace(/\n$/, ''), source);
        button.classList.add('is-copied');
        label.textContent = 'COPIED';
      } catch (_) {
        label.textContent = 'FAILED';
      }
      window.setTimeout(() => {
        button.classList.remove('is-copied');
        label.textContent = original;
      }, 1450);
    });
  };

  const enhanceMarkdownTables = () => {
    document.querySelectorAll('.article-body table').forEach((table, index) => {
      if (table.closest('.highlight') || table.closest('.flk-table-shell')) return;
      const shell = document.createElement('div');
      shell.className = 'flk-table-shell';
      shell.dataset.table = `flk-table-${index}`;
      shell.setAttribute('role', 'region');
      shell.setAttribute('aria-label', 'Scrollable markdown table');
      shell.tabIndex = 0;
      const parent = table.parentNode;
      if (!parent) return;
      parent.insertBefore(shell, table);
      shell.appendChild(table);
    });
  };

  enhanceCodeCopy();
  enhanceMarkdownTables();

})();