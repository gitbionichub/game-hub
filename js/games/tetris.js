class TetrisGame {
  constructor() {
    this.canvas = null; this.ctx = null;
    this.previewCanvas = null; this.previewCtx = null;
    this.state = 'ready';
    this.rafId = null; this.lastTime = 0;
    
    this.COLS = 10; this.ROWS = 20; this.CELL = 24;
    this.board = []; this.cur = null; this.nextType = null;
    this.bag = []; this.score = 0; this.lines = 0; this.level = 1;
    this.dropInterval = 800; this.lastDrop = 0; this.softDrop = false;

    this.SHAPES = {
      I: { cells: [[0,1],[1,1],[2,1],[3,1]], color: '#3cf' },
      O: { cells: [[1,0],[2,0],[1,1],[2,1]], color: '#fc3' },
      T: { cells: [[1,0],[0,1],[1,1],[2,1]], color: '#c6f' },
      S: { cells: [[1,0],[2,0],[0,1],[1,1]], color: '#6f6' },
      Z: { cells: [[0,0],[1,0],[1,1],[2,1]], color: '#f66' },
      J: { cells: [[0,0],[0,1],[1,1],[2,1]], color: '#66f' },
      L: { cells: [[2,0],[0,1],[1,1],[2,1]], color: '#fa6' },
    };
    this.TYPES = Object.keys(this.SHAPES);

    this.resizeHandler = () => { this.calculateSize(); this.draw(); };
  }

  init(container) {
    this.container = container;
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.previewCanvas = document.getElementById('preview-canvas');
    this.previewCtx = this.previewCanvas.getContext('2d');
    
    document.getElementById('game-hud').classList.remove('hidden');
    this.calculateSize();
    window.addEventListener('resize', this.resizeHandler);

    inputManager.bindGame(this, this.canvas);
    inputManager.renderTouchButtons(document.getElementById('touch-controls-container'));

    this.initBoard();
    this.state = 'ready';
    this.draw();
    this.start();
  }

  destroy() {
    window.removeEventListener('resize', this.resizeHandler);
    this.stop();
    inputManager.activeGame = null;
    document.getElementById('game-hud').classList.add('hidden');
    document.getElementById('game-overlay').classList.add('hidden');
  }

  calculateSize() {
    if (!this.canvas) return;
    const area = document.getElementById('game-area');
    const availW = area.clientWidth - 20;
    const availH = area.clientHeight - 20; 
    
    let cell = Math.floor(Math.min(availW / this.COLS, availH / this.ROWS));
    cell = Math.max(12, cell);
    this.CELL = cell;
    this.canvas.width = this.COLS * cell;
    this.canvas.height = this.ROWS * cell;
  }

  initBoard() {
    this.board = Array.from({ length: this.ROWS }, () => new Array(this.COLS).fill(null));
  }

  start() {
    this.initBoard(); this.bag = []; this.nextType = null;
    this.score = 0; this.lines = 0; this.level = 1;
    
    if (settings.data.difficulty === 'fixed') {
      this.dropInterval = parseInt(settings.data.fixedSpeed);
    } else {
      this.dropInterval = 800;
    }
    
    this.softDrop = false;
    this.updateHud();
    this.spawn();
    this.state = 'playing';
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  stop() { if (this.rafId) cancelAnimationFrame(this.rafId); this.rafId = null; }

  pause() {
    if (this.state === 'playing') {
      this.state = 'paused';
      this.stop();
      this.showOverlay(i18n.t('msg_paused'), '', [
        { text: i18n.t('msg_resume'), primary: true, action: () => this.resume() },
        { text: i18n.t('msg_back_to_menu'), action: () => window.app.exitToMenu() }
      ]);
    }
  }
  
  resume() {
    if (this.state === 'paused') {
      this.hideOverlay();
      this.state = 'playing';
      this.lastTime = performance.now();
      this.loop(this.lastTime);
    }
  }

  togglePause() {
    if (this.state === 'playing') {
      this.pause();
    } else if (this.state === 'paused') {
      this.resume();
    }
  }

  showOverlay(title, desc, buttons) {
    const ov = document.getElementById('game-overlay');
    document.getElementById('overlay-title').textContent = title;
    document.getElementById('overlay-desc').textContent = desc;
    
    const actionsContainer = document.getElementById('overlay-actions');
    actionsContainer.innerHTML = '';
    
    buttons.forEach(b => {
      const btn = document.createElement('button');
      btn.className = 'btn ' + (b.primary ? 'primary' : '');
      btn.textContent = b.text;
      btn.onclick = b.action;
      actionsContainer.appendChild(btn);
    });
    
    ov.classList.remove('hidden');
  }
  
  hideOverlay() {
    document.getElementById('game-overlay').classList.add('hidden');
  }

  handleAction(action) {
    if (this.state !== 'playing') return;
    if (action === 'left') this.move(-1, 0);
    else if (action === 'right') this.move(1, 0);
    else if (action === 'softDropOn') {
      this.softDrop = true; 
      this.lastDrop = 0;
    }
    else if (action === 'softDropOff') {
      this.softDrop = false; 
      this.lastDrop = 0;
    }
    else if (action === 'rotate') this.rotate();
    else if (action === 'hardDrop') this.hardDrop();
  }

  ensureBag() {
    if (this.bag.length === 0) {
      this.bag = this.TYPES.slice();
      for (let i = this.bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
      }
    }
  }

  popType() { this.ensureBag(); return this.bag.pop(); }

  spawn() {
    if (this.nextType == null) this.nextType = this.popType();
    const type = this.nextType; this.nextType = this.popType();
    const def = this.SHAPES[type];
    const maxX = Math.max(...def.cells.map(c => c[0]));
    const offsetX = Math.floor((this.COLS - (maxX + 1)) / 2);
    
    this.cur = { type, cells: def.cells.map(c => [...c]), color: def.color, x: offsetX, y: 0 };
    if (this.collides(this.cur.x, this.cur.y, this.cur.cells)) this.gameOver();
  }

  collides(px, py, cells) {
    for (const [cx, cy] of cells) {
      const x = px + cx; const y = py + cy;
      if (x < 0 || x >= this.COLS || y >= this.ROWS) return true;
      if (y >= 0 && this.board[y][x]) return true;
    }
    return false;
  }

  move(dx, dy) {
    if (!this.collides(this.cur.x + dx, this.cur.y + dy, this.cur.cells)) {
      this.cur.x += dx; this.cur.y += dy; this.draw(); return true;
    }
    return false;
  }

  rotate() {
    const rotated = this.cur.cells.map(([x, y]) => [-y, x]);
    let minX = Math.min(...rotated.map(c => c[0]));
    let minY = Math.min(...rotated.map(c => c[1]));
    const norm = rotated.map(([x, y]) => [x - minX, y - minY]);

    const kicks = [0, -1, 1, -2, 2];
    for (const k of kicks) {
      if (!this.collides(this.cur.x + k, this.cur.y, norm)) {
        this.cur.cells = norm; this.cur.x += k; this.draw(); return;
      }
    }
  }

  hardDrop() {
    let dropped = 0;
    while (!this.collides(this.cur.x, this.cur.y + 1, this.cur.cells)) {
      this.cur.y++; dropped++;
    }
    this.score += dropped * 2; this.updateHud(); this.lockPiece();
  }

  lockPiece() {
    for (const [cx, cy] of this.cur.cells) {
      const x = this.cur.x + cx; const y = this.cur.y + cy;
      if (y >= 0 && y < this.ROWS && x >= 0 && x < this.COLS) this.board[y][x] = this.cur.color;
    }
    
    // СБРОС УСКОРЕНИЯ ПРИ ФИКСАЦИИ (чтобы следующая фигура не падала камнем)
    this.softDrop = false;
    this.lastDrop = 0;
    
    this.clearLines(); 
    this.spawn(); 
    this.draw();
  }

  clearLines() {
    let cleared = 0;
    for (let y = this.ROWS - 1; y >= 0; y--) {
      if (this.board[y].every(c => c)) {
        this.board.splice(y, 1); this.board.unshift(new Array(this.COLS).fill(null));
        cleared++; y++;
      }
    }
    if (cleared > 0) {
      const points = [0, 100, 300, 500, 800][cleared] || 800;
      this.score += points * this.level;
      this.lines += cleared;
      if (settings.data.difficulty === 'normal') {
        const newLevel = Math.floor(this.lines / 10) + 1;
        if (newLevel !== this.level) {
          this.level = newLevel;
          this.dropInterval = Math.max(80, 800 - (this.level - 1) * 70);
        }
      } else {
        this.level = 1;
      }
      this.updateHud();
    }
  }

  gameOver() {
    this.cur = null;
    this.state = 'over'; this.stop();
    this.showOverlay(
      i18n.t('msg_gameover'), 
      `${i18n.t('msg_score')}: ${this.score}`, 
      [
        { text: i18n.t('msg_back_to_menu'), primary: true, action: () => window.app.exitToMenu() }
      ]
    );
  }

  updateHud() {
    const scoreEl = document.getElementById('hud-score');
    const linesEl = document.getElementById('hud-lines');
    const levelEl = document.getElementById('hud-level');
    if (scoreEl) scoreEl.textContent = this.score;
    if (linesEl) linesEl.textContent = this.lines;
    if (levelEl) levelEl.textContent = settings.data.difficulty === 'normal' ? this.level : '—';
  }

  draw() {
    if (!this.ctx) return;
    const style = getComputedStyle(document.documentElement);
    this.ctx.fillStyle = style.getPropertyValue('--bg').trim();
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    for (let y = 0; y < this.ROWS; y++) {
      for (let x = 0; x < this.COLS; x++) {
        if (this.board[y][x]) this.drawBlock(this.ctx, x, y, this.board[y][x], this.CELL);
      }
    }
    if (this.cur && this.state !== 'over') {
      for (const [cx, cy] of this.cur.cells) {
        const x = this.cur.x + cx; const y = this.cur.y + cy;
        if (y >= 0) this.drawBlock(this.ctx, x, y, this.cur.color, this.CELL);
      }
    }
    this.drawPreview();
  }

  drawBlock(ctx, x, y, color, cellSize) {
    ctx.fillStyle = color;
    ctx.fillRect(x * cellSize + 1, y * cellSize + 1, cellSize - 2, cellSize - 2);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(x * cellSize + 1, y * cellSize + 1, cellSize - 2, Math.max(2, cellSize * 0.18));
  }
  
  drawPreview() {
    if (!this.previewCtx || !this.nextType) return;
    const style = getComputedStyle(document.documentElement);
    this.previewCtx.fillStyle = style.getPropertyValue('--bg').trim();
    this.previewCtx.fillRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
    
    const def = this.SHAPES[this.nextType];
    const cells = def.cells;
    const minX = Math.min(...cells.map(c => c[0])), maxX = Math.max(...cells.map(c => c[0]));
    const minY = Math.min(...cells.map(c => c[1])), maxY = Math.max(...cells.map(c => c[1]));
    const w = maxX - minX + 1, h = maxY - minY + 1;
    const pad = 4;
    const pCell = Math.floor(Math.min((this.previewCanvas.width - pad * 2) / w, (this.previewCanvas.height - pad * 2) / h));
    const offsetX = Math.floor((this.previewCanvas.width - w * pCell) / 2);
    const offsetY = Math.floor((this.previewCanvas.height - h * pCell) / 2);
    
    for (const [cx, cy] of cells) {
      const px = offsetX + (cx - minX) * pCell;
      const py = offsetY + (cy - minY) * pCell;
      this.previewCtx.fillStyle = def.color;
      this.previewCtx.fillRect(px + 1, py + 1, pCell - 2, pCell - 2);
      this.previewCtx.fillStyle = 'rgba(255,255,255,0.18)';
      this.previewCtx.fillRect(px + 1, py + 1, pCell - 2, Math.max(2, pCell * 0.18));
    }
  }

  loop(time) {
    if (this.state !== 'playing') { this.rafId = null; return; }
    const dt = time - this.lastTime; this.lastTime = time;
    const interval = this.softDrop ? 40 : this.dropInterval;
    this.lastDrop += dt;
    
    if (this.lastDrop >= interval) {
      this.lastDrop = 0;
      if (!this.move(0, 1)) this.lockPiece();
    }
    this.draw();
    this.rafId = requestAnimationFrame((t) => this.loop(t));
  }
}