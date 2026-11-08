const TRANSLATIONS = {
  en: {
    app_title: "Game Hub", game_tetris_title: "Tetris", game_tetris_desc: "Classic block puzzle",
    game_snake_title: "Snake", game_snake_desc: "Coming soon", settings_title: "Settings",
    setting_language: "Language", setting_theme: "Theme", setting_input: "Controls",
    setting_difficulty: "Difficulty", setting_speed: "Speed",
    theme_dark: "Dark", theme_light: "Light", input_auto: "Auto (Keyboard/Swipe)", input_buttons: "Screen Buttons",
    diff_normal: "Normal (Speed up)", diff_fixed: "Fixed Speed",
    speed_slow: "Slow", speed_medium: "Medium", speed_fast: "Fast", speed_extreme: "Extreme",
    btn_ok: "OK", msg_paused: "Paused", msg_gameover: "Game Over", msg_resume: "Resume",
    msg_score: "Score", msg_lines: "Lines", msg_level: "Level", msg_next: "Next", msg_back_to_menu: "To Menu"
  },
  ru: {
    app_title: "Игровой Хаб", game_tetris_title: "Тетрис", game_tetris_desc: "Классическая головоломка",
    game_snake_title: "Змейка", game_snake_desc: "Скоро", settings_title: "Настройки",
    setting_language: "Язык", setting_theme: "Тема", setting_input: "Управление",
    setting_difficulty: "Сложность", setting_speed: "Скорость",
    theme_dark: "Тёмная", theme_light: "Светлая", input_auto: "Авто (Клавиатура/Свайпы)", input_buttons: "Экранные кнопки",
    diff_normal: "Обычная (С ускорением)", diff_fixed: "Фиксированная",
    speed_slow: "Медленно", speed_medium: "Средне", speed_fast: "Быстро", speed_extreme: "Экстрим",
    btn_ok: "ОК", msg_paused: "Пауза", msg_gameover: "Игра окончена", msg_resume: "Продолжить",
    msg_score: "Счёт", msg_lines: "Линии", msg_level: "Уровень", msg_next: "Далее", msg_back_to_menu: "В меню"
  }
};

class I18n {
  constructor() { this.currentLang = 'en'; }
  setLang(lang) {
    if (TRANSLATIONS[lang]) {
      this.currentLang = lang;
      document.documentElement.lang = lang;
      this.updateDOM();
    }
  }
  t(key) { return TRANSLATIONS[this.currentLang][key] || key; }
  updateDOM() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = this.t(el.getAttribute('data-i18n'));
    });
  }
}
const i18n = new I18n();