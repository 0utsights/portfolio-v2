// ── Named tile content ──
const NAMED_TILES = [
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
      <div class="project-row">
        <h3>This Site</h3>
        <p>Portfolio built with a BSP tiling layout — no frameworks, no libraries.</p>
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

// Returns named tile content or a default placeholder for any index
function getTile(index) {
  if (index < NAMED_TILES.length) return NAMED_TILES[index];
  const n = index + 1;
  const ws = Math.floor(index / TILES_PER_WORKSPACE) + 1;
  const slot = (index % TILES_PER_WORKSPACE) + 1;
  return {
    id: `tile-${n}`,
    render: () => `
      <p class="tile-label">Workspace ${ws} · Tile ${slot}</p>
      <p class="tile-body">Tile ${n}</p>
    `
  };
}

const TILES_PER_WORKSPACE = 4;

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

// ── Workspace ──
function createWorkspace() {
  return { root: null, focusedLeaf: null, tileCount: 0, history: [] };
}

// ── State ──
const state = {
  workspaces: [createWorkspace()],
  activeIndex: 0,
  get ws() { return this.workspaces[this.activeIndex]; }
};

// ── Mouse tracking ──
const mouse = { x: 0, y: 0 };
document.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });

// ── Workspace indicator ──
let indicatorTimeout = null;
function showIndicator() {
  const el = document.getElementById('ws-indicator');
  el.textContent = `${state.activeIndex + 1} / ${state.workspaces.length}`;
  el.classList.add('visible');
  clearTimeout(indicatorTimeout);
  indicatorTimeout = setTimeout(() => el.classList.remove('visible'), 1200);
}

// ── BSP helpers ──
function findLeafByIndex(node, index) {
  if (!node) return null;
  if (node.type === 'leaf') return node.tileIndex === index ? node : null;
  return findLeafByIndex(node.first, index) || findLeafByIndex(node.second, index);
}

function findLeaf(node, target) {
  if (!node) return false;
  if (node === target) return true;
  if (node.type === 'split') return findLeaf(node.first, target) || findLeaf(node.second, target);
  return false;
}

function firstLeaf(node) {
  if (node.type === 'leaf') return node;
  return firstLeaf(node.first);
}

function getDepth(leaf) {
  let depth = 0, node = leaf;
  while (node.parent) { depth++; node = node.parent; }
  return depth;
}

function getLeafAtMouse(ws) {
  const el = document.elementFromPoint(mouse.x, mouse.y);
  if (!el) return ws.focusedLeaf;
  const tile = el.closest('.bsp-tile');
  if (!tile) return ws.focusedLeaf;
  return findLeafByIndex(ws.root, parseInt(tile.dataset.leafId));
}

// Total tiles across all workspaces
function totalTiles() {
  return state.workspaces.reduce((sum, ws) => sum + ws.tileCount, 0);
}

// ── Add tile ──
function addTile() {
  // If current workspace is full, create a new one and switch to it
  if (state.ws.tileCount >= TILES_PER_WORKSPACE) {
    state.workspaces.push(createWorkspace());
    state.activeIndex = state.workspaces.length - 1;
    showIndicator();
  }

  const ws = state.ws;
  // Capture global index before incrementing tileCount
  const tileIndex = totalTiles();
  const newLeaf = new LeafNode(tileIndex);
  ws.tileCount++;

  if (!ws.root) {
    ws.root = newLeaf;
    ws.focusedLeaf = newLeaf;
    ws.history.push(newLeaf);
    return;
  }

  const target = getLeafAtMouse(ws) || ws.focusedLeaf;
  const el = document.querySelector(`[data-leaf-id="${target.tileIndex}"]`);
  const rect = el
    ? el.getBoundingClientRect()
    : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };

  const depth = getDepth(target);
  const dir = depth % 2 === 0 ? 'vertical' : 'horizontal';
  const mouseInSecondHalf = dir === 'vertical'
    ? mouse.x > rect.left + rect.width / 2
    : mouse.y > rect.top + rect.height / 2;

  const split = new SplitNode(dir);
  split.parent = target.parent;

  if (target === ws.root) {
    ws.root = split;
  } else {
    const p = target.parent;
    if (p.first === target) p.first = split;
    else p.second = split;
  }

  if (mouseInSecondHalf) {
    split.first = target;
    split.second = newLeaf;
  } else {
    split.first = newLeaf;
    split.second = target;
  }

  target.parent = split;
  newLeaf.parent = split;
  ws.focusedLeaf = newLeaf;
  ws.history.push(newLeaf);
}

// ── Remove tile ──
function removeTile() {
  const ws = state.ws;

  if (ws.tileCount === 1) {
    ws.root = null;
    ws.focusedLeaf = null;
    ws.tileCount = 0;
    ws.history = [];

    if (state.activeIndex > 0) {
      // Remove this workspace and switch back — render() will pick up the new activeIndex
      state.workspaces.splice(state.activeIndex, 1);
      state.activeIndex = state.workspaces.length - 1;
      showIndicator();
    } else {
      document.getElementById('tiles').classList.remove('active');
      document.getElementById('prompt').style.display = '';
    }
    return;
  }

  let target = null;
  while (ws.history.length > 0) {
    const candidate = ws.history.pop();
    if (findLeaf(ws.root, candidate)) { target = candidate; break; }
  }
  if (!target) return;

  const parent = target.parent;
  const sibling = parent.first === target ? parent.second : parent.first;
  sibling.parent = parent.parent;

  if (parent === ws.root) {
    ws.root = sibling;
  } else {
    const gp = parent.parent;
    if (gp.first === parent) gp.first = sibling;
    else gp.second = sibling;
  }

  ws.focusedLeaf = sibling.type === 'leaf' ? sibling : firstLeaf(sibling);
  ws.tileCount--;
}

// ── Switch workspace ──
function switchWorkspace(dir) {
  const next = state.activeIndex + dir;
  if (next < 0 || next >= state.workspaces.length) return;
  state.activeIndex = next;
  showIndicator();
  render();
}

// ── Rendering ──
function renderNode(node) {
  if (node.type === 'leaf') {
    const tile = getTile(node.tileIndex);
    const div = document.createElement('div');
    div.className = 'bsp-tile' + (node === state.ws.focusedLeaf ? ' focused' : '');
    div.dataset.leafId = node.tileIndex;
    div.addEventListener('click', (e) => {
      e.stopPropagation();
      state.ws.focusedLeaf = node;
      state.ws.history.push(node);
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
  const ws = state.ws;
  if (ws.root) container.appendChild(renderNode(ws.root));
  updateHint();
}

function updateHint() {
  const hint = document.getElementById('hint');
  const ws = state.ws;
  if (ws.tileCount === 0 && state.activeIndex === 0) { hint.classList.remove('visible'); return; }
  hint.classList.add('visible');

  const parts = ['↑ open', '↓ close'];
  if (state.workspaces.length > 1) parts.push('← → switch');
  hint.textContent = parts.join(' · ');
}

// ── Input ──
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (totalTiles() === 0) {
      document.getElementById('prompt').style.display = 'none';
      document.getElementById('tiles').classList.add('active');
    }
    addTile();
    render();
  }

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (state.ws.tileCount >= 1) {
      removeTile();
      render();
    }
  }

  if (e.key === 'ArrowLeft')  { e.preventDefault(); switchWorkspace(-1); }
  if (e.key === 'ArrowRight') { e.preventDefault(); switchWorkspace(1); }
});
