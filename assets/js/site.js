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

  const canvas = document.getElementById('matrixCanvas');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (canvas && !reduceMotion) {
    const ctx = canvas.getContext('2d', { alpha: true });
    const alphabet = [
      ...'01abcdef0123456789{}[]<>/$#@+-=',
      ...'アイウエオカキクケコサシスセソタチツテトナニヌネノマミムメモヤユヨラリルレロワン',
      'flouksac', 'Flouksac', 'FLK', 'RkxL', 'RmxvdWtzYWM=', 'ZmxvdWtzYWM=', '0x464c4b', '466c6f756b736163', '666c6f756b736163',
      '01000110', '01001100', '01001011'
    ];
    const specialGlyphs = ['RmxvdWtzYWM=', 'flouksac', 'フロックサック'];
    const glyphs = [...new Set([...alphabet, ...specialGlyphs])];
    const fontSize = 17;
    const font = `${fontSize}px ui-monospace, SFMono-Regular, Consolas, monospace`;
    const atlasCellWidth = 128;
    const atlasCellHeight = 22;
    const atlasColumns = 16;

    let width = 0;
    let height = 0;
    let columns = 0;
    let drops = [];
    let dpr = 1;
    let running = !document.hidden;
    let frameId = 0;
    let resizeId = 0;
    let lastFrame = 0;
    let palette = [];
    let atlas = null;
    let glyphRects = new Map();

    const paletteForTheme = () => (root.dataset.theme || 'dark') === 'dark'
      ? ['rgba(39,245,238,.30)', 'rgba(255,47,87,.24)', 'rgba(160,170,176,.17)']
      : ['rgba(0,169,191,.44)', 'rgba(231,217,0,.36)', 'rgba(44,54,58,.27)'];

    const buildGlyphAtlas = () => {
      palette = paletteForTheme();
      const rowsPerPalette = Math.ceil(glyphs.length / atlasColumns);
      const atlasWidth = atlasColumns * atlasCellWidth;
      const atlasHeight = rowsPerPalette * palette.length * atlasCellHeight;
      const useOffscreenCanvas = typeof OffscreenCanvas === 'function';
      const buffer = useOffscreenCanvas
        ? new OffscreenCanvas(atlasWidth, atlasHeight)
        : document.createElement('canvas');

      if (!useOffscreenCanvas) {
        buffer.width = atlasWidth;
        buffer.height = atlasHeight;
      }

      const bufferCtx = buffer.getContext('2d', { alpha: true });
      bufferCtx.font = font;
      bufferCtx.textBaseline = 'top';
      glyphRects = new Map();

      palette.forEach((color, paletteIndex) => {
        bufferCtx.fillStyle = color;
        glyphs.forEach((glyph, glyphIndex) => {
          const column = glyphIndex % atlasColumns;
          const row = Math.floor(glyphIndex / atlasColumns) + (paletteIndex * rowsPerPalette);
          const sx = column * atlasCellWidth;
          const sy = row * atlasCellHeight;
          bufferCtx.fillText(glyph, sx, sy);
          const width = Math.min(atlasCellWidth, Math.ceil(bufferCtx.measureText(glyph).width) + 2);
          glyphRects.set(`${paletteIndex}:${glyph}`, { sx, sy, width });
        });
      });

      atlas = buffer;
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      columns = Math.ceil(width / fontSize);
      drops = Array.from({ length: columns }, () => Math.random() * -height / fontSize);
    };

    const requestResize = () => {
      if (resizeId) return;
      resizeId = requestAnimationFrame(() => {
        resizeId = 0;
        resize();
      });
    };

    const drawGlyph = (glyph, paletteIndex, x, y, alpha = 1) => {
      const rect = glyphRects.get(`${paletteIndex}:${glyph}`);
      if (!atlas || !rect) return;
      if (alpha !== 1) ctx.globalAlpha = alpha;
      ctx.drawImage(atlas, rect.sx, rect.sy, rect.width, atlasCellHeight, x, y, rect.width, atlasCellHeight);
      if (alpha !== 1) ctx.globalAlpha = 1;
    };

    const draw = (now) => {
      if (!running) return;
      frameId = requestAnimationFrame(draw);

      const elapsed = lastFrame ? now - lastFrame : (1000 / 60);
      // Keep motion speed stable on high-refresh displays and after occasional slow frames.
      const frameScale = Math.min(elapsed / (1000 / 60), 3);
      lastFrame = now;

      ctx.clearRect(0, 0, width, height);
      const darkTheme = (root.dataset.theme || 'dark') === 'dark';
      for (let i = 0; i < drops.length; i += 1) {
        if (Math.random() < 0.34) continue;
        const roll = Math.random();
        const glyph = roll > 0.994
          ? specialGlyphs[0]
          : (roll > 0.988 ? specialGlyphs[1] : (roll > 0.978 ? specialGlyphs[2] : alphabet[Math.floor(Math.random() * alphabet.length)]));
        const x = i * fontSize;
        const y = drops[i] * fontSize;
        const paletteIndex = Math.floor(Math.random() * palette.length);

        if (roll > 0.982) {
          drawGlyph(glyph, paletteIndex, x - Math.min(90, glyph.length * 5), y, darkTheme ? 0.68 : 0.78);
        } else {
          drawGlyph(glyph, paletteIndex, x, y);
        }

        if (y > height && Math.random() > 0.985) drops[i] = Math.random() * -24;
        drops[i] += (Math.random() > 0.64 ? 0.28 : 0.11) * frameScale;
      }
    };

    const startMatrix = () => {
      if (running && !frameId) {
        lastFrame = performance.now();
        frameId = requestAnimationFrame(draw);
      }
    };

    const stopMatrix = () => {
      if (frameId) cancelAnimationFrame(frameId);
      frameId = 0;
    };

    buildGlyphAtlas();
    resize();
    startMatrix();

    window.addEventListener('resize', requestResize, { passive: true });
    document.addEventListener('visibilitychange', () => {
      running = !document.hidden;
      if (running) startMatrix();
      else stopMatrix();
    });

    // Theme changes alter only the pre-rendered atlas, not every animation frame.
    new MutationObserver((records) => {
      if (records.some((record) => record.attributeName === 'data-theme')) buildGlyphAtlas();
    }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  }

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