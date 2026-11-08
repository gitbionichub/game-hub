class SnakeGame {
  constructor() {
    this.canvas = null; this.ctx = null;
    this.state = 'ready';
    this.rafId = null; this.lastTime = 0;
    
    this.COLS = 20; this.ROWS = 20; this.CELL = 20;
    this.snake = [];
    this.dir = { x: 1, y: 0 };
    this.nextDir = { x: 1, y: 0 };
    this.food = { x: 10, y: 10 };
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('snake_highscore') || '0');
    
    this.tickRate = 150;
    this.tickTimer = 0;

    this.resizeHandler = () => { this.calculateSize(); this.draw(); };
  }

  init(container) {
    this.container = container;
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    
    const preview = document.getElementById('preview-container');
    if (preview) preview.classList.add('hidden');
    
    this.calculateSize();
    window.addEventListener('resize', this.resizeHandler);

    inputManager.bindGame(this, this.canvas);
    
    this.state = 'ready';
    this.start();
  }

  destroy() {
    window.removeEventListener('resize', this.resizeHandler);
    this.stop();
    inputManager.activeGame = null;
    
    const preview = document.getElementById('preview-container');
    if (preview) preview.classList.remove('hidden');
    
    const overlay = document.getElementById('game-overlay');
    if (overlay) overlay.classList.add('hidden');
  }

  calculateSize() {
    if (!this.canvas) return;
    const area = document.getElementById('game-area');
    const availW = area.clientWidth - 20;
    const availH = area.clientHeight - 20; 
    
    let cell = Math.floor(Math.min(availW / this.COLS, availH / this.ROWS));
    cell = Math.max(10, cell);
    this.CELL = cell;
    this.canvas.width = this.COLS * cell;
    this.canvas.height = this.ROWS * cell;
  }

  start() {
    this.hideOverlay(); // <--- ДОБАВЛЕНО: скрываем меню Game Over при рестарте
    
    this.snake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 }
    ];
    this.dir = { x: 1, y: 0 };
    this.nextDir = { x: 1, y: 0 };
    this.score = 0;
    this.tickRate = 150;
    
    this.spawnFood();
    this.updateHud();
    
    this.state = 'playing';
    this.lastTime = performance.now();
    this.tickTimer = 0;
    
    this.stop();
    this.loop(this.lastTime);
  }

  stop() { 
    if (this.rafId) cancelAnimationFrame(this.rafId); 
    this.rafId = null; 
  }

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
    if (this.state === 'playing') this.pause();
    else if (this.state === 'paused') this.resume();
  }

  showOverlay(title, desc, buttons) {
    const ov = document.getElementById('game-overlay');
    if(!ov) return;
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
    const ov = document.getElementById('game-overlay');
    if(ov) ov.classList.add('hidden');
  }

  handleAction(action) {
    if (this.state !== 'playing') return;
    
    if (action === 'up' && this.dir.y === 0) this.nextDir = { x: 0, y: -1 };
    else if (action === 'down' && this.dir.y === 0) this.nextDir = { x: 0, y: 1 };
    else if (action === 'left' && this.dir.x === 0) this.nextDir = { x: -1, y: 0 };
    else if (action === 'right' && this.dir.x === 0) this.nextDir = { x: 1, y: 0 };
  }

  spawnFood() {
    while (true) {
      const x = Math.floor(Math.random() * this.COLS);
      const y = Math.floor(Math.random() * this.ROWS);
      if (!this.snake.some(s => s.x === x && s.y === y)) {
        this.food = { x, y };
        break;
      }
    }
  }

  updateHud() {
    const scoreEl = document.getElementById('hud-score');
    const linesEl = document.getElementById('hud-lines');
    const levelEl = document.getElementById('hud-level');
    
    if (scoreEl) scoreEl.textContent = this.score;
    if (linesEl) linesEl.textContent = this.highScore; 
    if (levelEl) levelEl.textContent = '—';
  }

  gameOver() {
    this.state = 'over'; 
    this.stop();
    
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('snake_highscore', this.highScore.toString());
      this.updateHud();
    }

    this.showOverlay(
      i18n.t('msg_gameover'), 
      `${i18n.t('msg_score')}: ${this.score}`, 
      [
        { text: i18n.t('btn_restart'), action: () => this.start() },
        { text: i18n.t('msg_back_to_menu'), primary: true, action: () => window.app.exitToMenu() }
      ]
    );
  }

  tick() {
    this.dir = { ...this.nextDir };
    
    const head = this.snake[0];
    const newHead = { x: head.x + this.dir.x, y: head.y + this.dir.y };

    if (newHead.x < 0 || newHead.x >= this.COLS || newHead.y < 0 || newHead.y >= this.ROWS) {
      this.gameOver();
      return;
    }

    if (this.snake.some((s, idx) => idx !== this.snake.length - 1 && s.x === newHead.x && s.y === newHead.y)) {
      this.gameOver();
      return;
    }

    this.snake.unshift(newHead);

    if (newHead.x === this.food.x && newHead.y === this.food.y) {
      this.score += 10;
      if (this.score % 50 === 0 && this.tickRate > 60) {
        this.tickRate -= 10;
      }
      this.spawnFood();
      this.updateHud();
    } else {
      this.snake.pop();
    }
  }

  draw() {
    if (!this.ctx) return;
    const style = getComputedStyle(document.documentElement);
    
    this.ctx.fillStyle = style.getPropertyValue('--bg').trim();
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const cell = this.CELL;

    // Еда
    this.ctx.fillStyle = '#f66';
    this.ctx.beginPath();
    this.ctx.arc(
      this.food.x * cell + cell / 2, 
      this.food.y * cell + cell / 2, 
      cell / 2 - 2, 
      0, Math.PI * 2
    );
    this.ctx.fill();

    // Змейка
    this.ctx.fillStyle = style.getPropertyValue('--accent').trim();
    for (let i = 0; i < this.snake.length; i++) {
      const seg = this.snake[i];
      if (i === 0) this.ctx.fillStyle = '#fff';
      
      this.ctx.fillRect(seg.x * cell + 1, seg.y * cell + 1, cell - 2, cell - 2);
      
      if (i === 0) this.ctx.fillStyle = style.getPropertyValue('--accent').trim();
    }
  }

  loop(time) {
    if (this.state !== 'playing') { this.rafId = null; return; }
    
    const dt = time - this.lastTime; 
    this.lastTime = time;
    
    this.tickTimer += dt;
    if (this.tickTimer >= this.tickRate) {
      this.tickTimer = 0;
      this.tick();
    }

    this.draw();
    this.rafId = requestAnimationFrame((t) => this.loop(t));
  }
}