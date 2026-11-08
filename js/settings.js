class Settings {
  constructor() {
    this.data = { 
      lang: 'en', theme: 'dark', inputMode: 'keyboard_swipe',
      difficulty: 'normal', fixedSpeed: 800
    };
    this.load();
  }
  load() {
    try {
      const saved = localStorage.getItem('gamehub_settings');
      if (saved) this.data = { ...this.data, ...JSON.parse(saved) };
    } catch(e) {}
    this.apply();
  }
  save() {
    try { localStorage.setItem('gamehub_settings', JSON.stringify(this.data)); } catch(e) {}
    this.apply();
  }
  apply() {
    document.documentElement.setAttribute('data-theme', this.data.theme);
    i18n.setLang(this.data.lang);
  }
}
const settings = new Settings();