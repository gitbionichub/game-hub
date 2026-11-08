class App {
  constructor() {
    this.screenMenu = document.getElementById('screen-menu');
    this.screenGame = document.getElementById('screen-game');
    this.gamesListEl = document.getElementById('games-list');
    this.activeGameInstance = null;

    this.options = {
      lang: [{v:'en', t:'English'}, {v:'ru', t:'Русский'}],
      theme: [{v:'dark', t:'Dark'}, {v:'light', t:'Light'}],
      input: [{v:'keyboard_swipe', t:'Auto'}, {v:'touch_buttons', t:'Buttons'}],
      difficulty: [{v:'normal', t:'Normal'}, {v:'fixed', t:'Fixed'}],
      fixedSpeed: [{v:'1200', t:'Slow'}, {v:'800', t:'Medium'}, {v:'450', t:'Fast'}, {v:'150', t:'Extreme'}]
    };

    this.games = [
      { id: 'tetris', titleKey: 'game_tetris_title', descKey: 'game_tetris_desc', class: TetrisGame },
      { id: 'snake', titleKey: 'game_snake_title', descKey: 'game_snake_desc', class: null, disabled: true },
    ];

    this.initUI();
    this.showScreen('menu');
  }

  exitToMenu() {
    if (this.activeGameInstance) {
      this.activeGameInstance.destroy();
      this.activeGameInstance = null;
    }
    this.showScreen('menu');
  }

  updateFocusables() {
    const modalSettings = document.getElementById('modal-settings');
    const overlay = document.getElementById('game-overlay');
    
    if (!modalSettings.classList.contains('hidden')) {
      const elements = modalSettings.querySelectorAll('.custom-select, #btn-close-settings');
      inputManager.setFocusables(Array.from(elements));
    } else if (!overlay.classList.contains('hidden')) {
      const elements = overlay.querySelectorAll('button');
      inputManager.setFocusables(Array.from(elements));
    } else if (!this.screenMenu.classList.contains('hidden')) {
      const elements = [document.getElementById('btn-menu-settings')];
      this.gamesListEl.querySelectorAll('.game-card:not(.disabled)').forEach(card => {
        elements.push(card);
      });
      inputManager.setFocusables(elements);
    } else {
      inputManager.clearFocus();
    }
  }

  setupCustomSelect(elementId, optionsArray, onSelect) {
    const el = document.getElementById(elementId);
    if (!el) return;
    
    const toggleValue = () => {
      const currentVal = el.getAttribute('data-value');
      let idx = optionsArray.findIndex(o => o.v.toString() === currentVal);
      idx = (idx + 1) % optionsArray.length;
      
      const newOpt = optionsArray[idx];
      el.setAttribute('data-value', newOpt.v);
      el.querySelector('span').textContent = newOpt.t;
      
      if (onSelect) onSelect(newOpt.v);
    };

    this.bindTap(el, toggleValue);
  }

  // Универсальная функция для кликов (работает и с мышью, и с тачем, и с геймпадом)
  bindTap(el, callback) {
    if (!el) return;
    
    // Для геймпада и клавиатуры (программный click)
    el.addEventListener('click', (e) => {
      if (e.pointerType !== 'touch') {
        callback(e);
      }
    });

    // Для тача (чтобы не было задержки 300мс)
    el.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') {
        e.preventDefault();
        callback(e);
      }
    });
  }

  initUI() {
    const modalSettings = document.getElementById('modal-settings');
    const rowFixedSpeed = document.getElementById('row-fixed-speed');

    this.setupCustomSelect('set-lang', this.options.lang, (val) => settings.data.lang = val);
    this.setupCustomSelect('set-theme', this.options.theme, (val) => {
      settings.data.theme = val;
      document.documentElement.setAttribute('data-theme', val);
    });
    this.setupCustomSelect('set-input', this.options.input, (val) => settings.data.inputMode = val);
    this.setupCustomSelect('set-difficulty', this.options.difficulty, (val) => {
      settings.data.difficulty = val;
      rowFixedSpeed.classList.toggle('hidden', val !== 'fixed');
      if (val === 'fixed') setTimeout(() => this.updateFocusables(), 10);
    });
    this.setupCustomSelect('set-fixed-speed', this.options.fixedSpeed, (val) => settings.data.fixedSpeed = parseInt(val));

    const openSettings = () => {
      if (this.activeGameInstance) this.activeGameInstance.pause();
      
      const updateBtn = (id, opts, currentVal) => {
        const el = document.getElementById(id);
        const opt = opts.find(o => o.v.toString() === currentVal.toString()) || opts[0];
        el.setAttribute('data-value', opt.v);
        el.querySelector('span').textContent = opt.t;
      };
      
      updateBtn('set-lang', this.options.lang, settings.data.lang);
      updateBtn('set-theme', this.options.theme, settings.data.theme);
      updateBtn('set-input', this.options.input, settings.data.inputMode);
      updateBtn('set-difficulty', this.options.difficulty, settings.data.difficulty);
      updateBtn('set-fixed-speed', this.options.fixedSpeed, settings.data.fixedSpeed);
      
      rowFixedSpeed.classList.toggle('hidden', settings.data.difficulty !== 'fixed');
      modalSettings.classList.remove('hidden');
      this.updateFocusables();
    };

    this.bindTap(document.getElementById('btn-menu-settings'), openSettings);
    this.bindTap(document.getElementById('btn-game-settings'), openSettings);
    this.bindTap(document.getElementById('btn-close-settings'), () => {
      settings.save();
      i18n.updateDOM();
      
      if (this.activeGameInstance) {
        inputManager.renderTouchButtons(document.getElementById('touch-controls-container'));
        this.activeGameInstance.updateHud();
        this.activeGameInstance.calculateSize();
        this.activeGameInstance.draw();
      }
      modalSettings.classList.add('hidden');
      
      if (this.activeGameInstance && this.activeGameInstance.state === 'paused') {
         this.activeGameInstance.resume();
       } else {
         this.updateFocusables();
       }
    });
    this.bindTap(document.getElementById('btn-game-back'), () => this.exitToMenu());

    window.addEventListener('lang-changed', () => {
      this.renderGamesList();
      if (this.activeGameInstance) this.activeGameInstance.updateHud();
    });

    this.renderGamesList();
  }

  renderGamesList() {
    this.gamesListEl.innerHTML = '';
    this.games.forEach(g => {
      const card = document.createElement('div');
      card.className = 'game-card' + (g.disabled ? ' disabled' : '');
      card.innerHTML = `
        <h2>${i18n.t(g.titleKey)}</h2>
        <p>${i18n.t(g.descKey)}</p>
      `;
      if (!g.disabled) {
        this.bindTap(card, () => this.startGame(g));
      }
      this.gamesListEl.appendChild(card);
    });
    this.updateFocusables();
  }

  showScreen(name) {
    this.screenMenu.classList.add('hidden');
    this.screenGame.classList.add('hidden');
    if (name === 'menu') {
      this.screenMenu.classList.remove('hidden');
      i18n.updateDOM();
      this.renderGamesList();
      this.updateFocusables();
    } else if (name === 'game') {
      this.screenGame.classList.remove('hidden');
      i18n.updateDOM();
      this.updateFocusables();
    }
  }

  startGame(gameDef) {
    this.showScreen('game');
    document.getElementById('game-title').textContent = i18n.t(gameDef.titleKey);
    
    const area = document.getElementById('game-area');
    area.innerHTML = `
      <canvas id="game-canvas"></canvas>
      <div id="touch-controls-container" style="position:absolute; inset:0; pointer-events:none;"></div>
      <div id="game-overlay" class="game-overlay hidden">
        <h2 id="overlay-title"></h2>
        <div id="overlay-desc" style="margin-bottom: 20px; font-size: 16px;"></div>
        <div id="overlay-actions" style="display: flex; gap: 10px; justify-content: center;"></div>
      </div>
    `;
    
    this.activeGameInstance = new gameDef.class();
    this.activeGameInstance.init(area);
    
    inputManager.clearFocus();
  }
}

const originalSetLang = i18n.setLang.bind(i18n);
i18n.setLang = function(lang) {
  originalSetLang(lang);
  window.dispatchEvent(new Event('lang-changed'));
};

window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});