/ ── Tile content ──
const TILES = [
  {
    id: 'hero',
    render: () => `
      <p class="tile-label">Hello</p>
      <h2 class="tile-title">John Surles</h2>
      <p class="tile-subtitle">Developer</p>
      <div class="tile-links">
        <a href="https://github.com/0utsights" target="_blank" rel="noopener noreferrer">github.com/0utsights</a>
        <a href="mailto:surlesjohn@outlook.com">surlesjohn@outlook.com</a>
      </div>
    `
  },
  {
    id: 'background',
    render: () => `
      <p class="tile-label">Background</p>
      <p class="tile-body">Self-taught developer with a background in game modding, web development, automation, and security. I'm always looking for new ways to use my code to make real world changes.</p>
    `
  },
  {
    id: 'projects',
    render: () => `
      <p class="tile-label">Projects</p>
      <div class="project-row">
        <h3>Aeyori</h3>
        <p>Commercial SaaS automation tool for a Discord card game — built and shipped solo. Desktop app with real-time OCR, REST API, payments, licensing, and a user dashboard.</p>
        <div class="project-row-links">
          <a href="https://aeyori.com" target="_blank" rel="noopener noreferrer">Live ↗</a>
        </div>
      </div>
      <div class="project-row>
        <h3>This Site</h3>
        <p>Portfolio built with a BSP tiling layout — no frameworks, no libraries. Mathematically rendered hex grid background using the Canvas API.</p>
        <div class="project-row-links">
          <a href="https://github.com/0utsights" target="_blank" rel="noopener noreferrer">Code ↗</a>
        </div>
      </div>
    `
  },
  {
    id: 'stack',
    render: () => `
      <p class="tile-label">Stack</p>
      <div class="stack-list">
        <span class="stack-tag">Python</span>
        <span class="stack-tag">FastAPI</span>
        <span class="stack-tag">JavaScript</span>
        <span class="stack-tag">HTML / CSS</span>
        <span class="stack-tag">Canvas API</span>
        <span class="stack-tag">OCR</span>
        <span class="stack-tag">Discord API</span>
        <span class="stack-tag">Git</span>
      </div>
    `
  },
  {
    id: 'contact',
    render: () => `
      <p class="tile-label">Contact</p>
      <div class="tile-links">
        <a href="mailto:surlesjohn@outlook.com">surlesjohn@outlook.com</a>
        <a href="https://github.com/0utsights" target="_blank" rel="noopener noreferrer">github.com/0utsights</a>
      </div>
    `
  }
];

// ── BSP nodes ──
class LeafNode {
  constructor(tileIndex) {
    this.type = 'leaf';
    this.tileIndex = tileIndex;
    this.parent = null;
  }
}

class SplitNode {
  constructor(direction) {
    this.type = 'split';
    this.direction = direction;
    this.first = null;
    this.second = null;
    this.parent = null;
  }
}

// ── BSP manager ──
const manager = {
  root: null,
  focusedLeaf: null,
  tileCount: 0,
  history: [],

  getRectFor(leaf) {
    const el = document.querySelector(`[data-leaf-id="${leaf.tileIndex}"]`);
    return el ? el.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight };
  },

  addTile() {
    if (this.tileCount >= TILES.length) return;

    const newLeaf = new LeafNode(this.tileCount);
    this.tileCount++;

    if (!this.root) {
      this.root = newLeaf;
      this.focusedLeaf = newLeaf;
      this.history.push(newLeaf);
      return;
    }

    const focused = this.focusedLeaf;
    const rect = this.getRectFor(focused);
    const dir = rect.width >= rect.height ? 'vertical' : 'horizontal';

    const split = new SplitNode(dir);
    split.parent = focused.parent;

    if (focused === this.root) {
      this.root = split;
    } else {
      const p = focused.parent;
      if (p.first === focused) p.first = split;
      else p.second = split;
    }

    split.first = focused;
    focused.parent = split;
    split.second = newLeaf;
    newLeaf.parent = split;

    this.focusedLeaf = newLeaf;
    this.history.push(newLeaf);
  },

  removeTile() {
    if (!this.root || this.root.type === 'leaf') return;

    let target = null;
    while (this.history.length > 0) {
      const candidate = this.history.pop();
      if (this.leafExists(candidate)) { target = candidate; break; }
    }
    if (!target) return;

    const parent = target.parent;
    const sibling = parent.first === target ? parent.second : parent.first;
    sibling.parent = parent.parent;

    if (parent === this.root) {
      this.root = sibling;
    } else {
      const gp = parent.parent;
      if (gp.first === parent) gp.first = sibling;
      else gp.second = sibling;
    }

    this.focusedLeaf = sibling.type === 'leaf' ? sibling : this.firstLeaf(sibling);
    this.tileCount--;
  },

  leafExists(leaf) {
    return this.findLeaf(this.root, leaf);
  },

  findLeaf(node, target) {
    if (!node) return false;
    if (node === target) return true;
    if (node.type === 'split') return this.findLeaf(node.first, target) || this.findLeaf(node.second, target);
    return false;
  },

  firstLeaf(node) {
    if (node.type === 'leaf') return node;
    return this.firstLeaf(node.first);
  }
};

// ── Rendering ──
function renderNode(node) {
  if (node.type === 'leaf') {
    const tile = TILES[node.tileIndex];
    const div = document.createElement('div');
    div.className = 'bsp-tile' + (node === manager.focusedLeaf ? ' focused' : '');
    div.dataset.leafId = node.tileIndex;
    div.addEventListener('click', (e) => {
      e.stopPropagation();
      manager.focusedLeaf = node;
      manager.history.push(node);
      render();
    });
    const inner = document.createElement('div');
    inner.className = 'tile-inner';
    inner.innerHTML = tile.render();
    div.appendChild(inner);
    return div;
  }

  const div = document.createElement('div');
  div.className = `bsp-split ${node.direction}`;
  div.appendChild(renderNode(node.first));
  div.appendChild(renderNode(node.second));
  return div;
}

function render() {
  const container = document.getElementById('tiles');
  container.innerHTML = '';
  if (manager.root) container.appendChild(renderNode(manager.root));
  updateHint();
}

function updateHint() {
  const hint = document.getElementById('hint');
  if (manager.tileCount === 0) { hint.classList.remove('visible'); return; }
  hint.classList.add('visible');
  if (manager.tileCount >= TILES.length) {
    hint.textContent = 'Press ↓ to close a tile';
  } else if (manager.tileCount > 1) {
    hint.textContent = 'Press ↑ to open · ↓ to close · Click to focus';
  } else {
    hint.textContent = 'Press ↑ to open another tile';
  }
}

// ── Input ──
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (manager.tileCount === 0) {
      document.getElementById('prompt').style.display = 'none';
      document.getElementById('tiles').classList.add('active');
    }
    if (manager.tileCount < TILES.length) {
      manager.addTile();
      render();
    }
  }

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (manager.tileCount > 1) {
      manager.removeTile();
      render();
    }
  }
});
