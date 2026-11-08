class InputManager {
  constructor() {
    this.activeGame = null;
    this.canvas = null;
    this.gamepadIndex = null;
    
    this.gpState = { left: false, right: false, up: false, down: false, a: false, b: false, start: false };
    this.gpDAS = { left: 0, right: 0, up: 0, down: 0 };
    this.focusables = [];
    this.focusIndex = -1;
    this.touchHoldTimers = {};

    this.setupListeners();
    this.setupGamepad();
  }

  bindGame(game, canvas) {
    this.activeGame = game;
    this.canvas = canvas;
    this.clearFocus();
  }

  emit(action) {
    if (this.activeGame && this.activeGame.state === 'playing') {
      this.activeGame.handleAction(action);
    }
  }

  setFocusables(elements) {
    this.clearFocus();
    this.focusables = elements.filter(el => el && !el.classList.contains('hidden'));
    if (this.focusables.length > 0) {
      this.focusIndex = 0;
      this.updateFocusVisual();
    }
  }

  clearFocus() {
    this.focusables.forEach(el => el.classList.remove('focused'));
    this.focusables = [];
    this.focusIndex = -1;
  }

  moveFocus(dir) {
    if (this.focusables.length === 0) return;
    this.focusIndex += dir;
    if (this.focusIndex < 0) this.focusIndex = this.focusables.length - 1;
    if (this.focusIndex >= this.focusables.length) this.focusIndex = 0;
    this.updateFocusVisual();
  }

  updateFocusVisual() {
    this.focusables.forEach((el, i) => {
      if (i === this.focusIndex) el.classList.add('focused');
      else el.classList.remove('focused');
    });
  }

  triggerFocus() {
    if (this.focusIndex >= 0 && this.focusables[this.focusIndex]) {
      this.focusables[this.focusIndex].click();
    }
  }

  setupGamepad() {
    window.addEventListener("gamepadconnected", (e) => {
      this.gamepadIndex = e.gamepad.index;
      if (!this.activeGame && window.app) window.app.updateFocusables();
    });
    window.addEventListener("gamepaddisconnected", (e) => {
      if (this.gamepadIndex === e.gamepad.index) this.gamepadIndex = null;
    });

    let lastTime = performance.now();
    const pollGamepad = (time) => {
      const dt = time - lastTime;
      lastTime = time;

      if (this.gamepadIndex !== null && navigator.getGamepads) {
        const gp = navigator.getGamepads()[this.gamepadIndex];
        if (gp) {
          const isLeft = gp.buttons[14].pressed || gp.axes[0] < -0.5;
          const isRight = gp.buttons[15].pressed || gp.axes[0] > 0.5;
          const isUp = gp.buttons[12].pressed || gp.axes[1] < -0.5;
          const isDown = gp.buttons[13].pressed || gp.axes[1] > 0.5;
          const isA = gp.buttons[0].pressed;
          const isB = gp.buttons[1].pressed;
          const isStart = gp.buttons[9].pressed;

          if (this.activeGame && this.activeGame.state === 'playing') {
            if (isLeft && !this.gpState.left) { this.emit('left'); this.gpDAS.left = 150; }
            else if (isLeft) { this.gpDAS.left -= dt; if (this.gpDAS.left <= 0) { this.emit('left'); this.gpDAS.left = 50; } }

            if (isRight && !this.gpState.right) { this.emit('right'); this.gpDAS.right = 150; }
            else if (isRight) { this.gpDAS.right -= dt; if (this.gpDAS.right <= 0) { this.emit('right'); this.gpDAS.right = 50; } }

            if (isDown && !this.gpState.down) { this.emit('softDropOn'); }
            else if (!isDown && this.gpState.down) { this.emit('softDropOff'); }

            if (isA && !this.gpState.a) this.emit('rotate');
            if (isB && !this.gpState.b) this.emit('hardDrop');
            if (isStart && !this.gpState.start) this.activeGame.togglePause();

          } else if (this.focusables.length > 0) {
            if (isUp && !this.gpState.up) this.moveFocus(-1);
            if (isDown && !this.gpState.down) this.moveFocus(1);
            if (isA && !this.gpState.a) this.triggerFocus();
            if (isB && !this.gpState.b) {
              const backBtn = document.getElementById('btn-close-settings');
              const overlayBtns = Array.from(document.querySelectorAll('#overlay-actions button'));
              const backToMenuBtn = overlayBtns.find(b => b.textContent.includes(i18n.t('msg_back_to_menu')));
              if (backBtn && !document.getElementById('modal-settings').classList.contains('hidden')) backBtn.click();
              else if (backToMenuBtn) backToMenuBtn.click();
            }
          }
          this.gpState = { left: isLeft, right: isRight, up: isUp, down: isDown, a: isA, b: isB, start: isStart };
        }
      }
      requestAnimationFrame(pollGamepad);
    };
    requestAnimationFrame(pollGamepad);
  }

  setupListeners() {
    window.addEventListener('keydown', (e) => {
      if (!this.activeGame) return;
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (this.activeGame.state === 'playing' || this.activeGame.state === 'paused') this.activeGame.togglePause();
        return;
      }
      if (this.activeGame.state !== 'playing') return;

      let action = null;
      switch(e.key) {
        case 'ArrowLeft': case 'a': case 'A': case 'ф': case 'Ф': action = 'left'; break;
        case 'ArrowRight': case 'd': case 'D': case 'в': case 'В': action = 'right'; break;
        case 'ArrowDown': case 's': case 'S': case 'ы': case 'Ы': action = 'softDropOn'; break;
        case 'ArrowUp': case 'w': case 'W': case 'ц': case 'Ц': case 'x': case 'X': action = 'rotate'; break;
        case ' ': action = 'hardDrop'; break;
      }
      if (action) {
        e.preventDefault();
        if (action === 'softDropOn' && !e.repeat) this.emit(action);
        else if (action !== 'softDropOn') this.emit(action);
      }
    });

    window.addEventListener('keyup', (e) => {
      if (!this.activeGame) return;
      if (['ArrowDown', 's', 'S', 'ы', 'Ы'].includes(e.key)) {
        this.emit('softDropOff');
      }
    });

    let touchStartX = 0, touchStartY = 0, touchStartTime = 0;
    let touchMovedX = false, touchMovedY = false;

    const resetSoftDrop = () => {
      this.emit('softDropOff');
      touchMovedY = false;
    };

    document.addEventListener('touchstart', (e) => {
      if (!this.canvas || settings.data.inputMode !== 'keyboard_swipe') return;
      if (e.target !== this.canvas && !this.canvas.contains(e.target)) return;
      if (this.activeGame.state !== 'playing') return;
      const t = e.changedTouches[0];
      touchStartX = t.clientX; touchStartY = t.clientY;
      touchStartTime = Date.now();
      touchMovedX = false; touchMovedY = false;
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
      if (!this.canvas || settings.data.inputMode !== 'keyboard_swipe' || !this.activeGame) return;
      if (this.activeGame.state !== 'playing') return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStartX;
      const dy = t.clientY - touchStartY;
      
      if (Math.abs(dx) > 24 && Math.abs(dx) > Math.abs(dy)) {
        this.emit(dx > 0 ? 'right' : 'left');
        touchStartX = t.clientX; 
        touchMovedX = true;
        resetSoftDrop();
      } else if (dy > 24 && Math.abs(dy) > Math.abs(dx)) {
        if (!touchMovedY) {
          this.emit('softDropOn'); 
          touchMovedY = true;
        }
      }
      e.preventDefault();
    }, { passive: false });

    document.addEventListener('touchend', (e) => {
      if (!this.canvas || settings.data.inputMode !== 'keyboard_swipe' || !this.activeGame) return;
      if (this.activeGame.state !== 'playing') return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStartX;
      const dy = t.clientY - touchStartY;
      const dt = Date.now() - touchStartTime;

      if (!touchMovedX && !touchMovedY && Math.abs(dx) < 24 && Math.abs(dy) < 24 && dt < 300) {
        this.emit('rotate');
      } else if (touchMovedY && dy > 40 && Math.abs(dy) > Math.abs(dx)) {
        resetSoftDrop();
        this.emit('hardDrop');
      } else if (touchMovedY) {
        resetSoftDrop();
      }
      e.preventDefault();
    }, { passive: false });

    // Дополнительная страховка от залипания пальца
    document.addEventListener('touchcancel', () => {
      if (!this.activeGame) return;
      resetSoftDrop();
    }, { passive: false });
  }

  renderTouchButtons(container) {
    if (settings.data.inputMode !== 'touch_buttons') {
      container.innerHTML = ''; return;
    }
    
    container.innerHTML = `
      <div class="touch-controls">
        <div class="touch-col">
          <div class="touch-btn" data-action="left">←</div>
          <div class="touch-btn" data-action="right">→</div>
        </div>
        <div class="touch-col">
          <div class="touch-btn" data-action="rotate">⟳</div>
          <div class="touch-btn" data-action="hardDrop">⇩</div>
        </div>
      </div>
    `;

    const btns = container.querySelectorAll('.touch-btn');
    btns.forEach(btn => {
      const action = btn.dataset.action;

      const startHold = (e) => {
        e.preventDefault();
        btn.classList.add('active');
        this.emit(action);
        
        if (action === 'left' || action === 'right') {
          this.touchHoldTimers[action] = setInterval(() => {
            this.emit(action);
          }, 100);
        }
      };

      const stopHold = (e) => {
        if (e) e.preventDefault();
        btn.classList.remove('active');
        if (this.touchHoldTimers[action]) {
          clearInterval(this.touchHoldTimers[action]);
          delete this.touchHoldTimers[action];
        }
      };

      btn.addEventListener('pointerdown', startHold);
      btn.addEventListener('pointerup', stopHold);
      btn.addEventListener('pointercancel', stopHold);
      btn.addEventListener('pointerleave', stopHold);
    });
  }
}

const inputManager = new InputManager();