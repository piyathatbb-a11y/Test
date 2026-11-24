// ============================================
// UNIT HUNTER — LeaderboardService
// ============================================

// ============================================
// CONFIG: Fill in to enable cloud leaderboard
// ============================================
const BACKEND_CONFIG = {
  provider: '', // 'firebase' | 'supabase' | ''
  firebase: { apiKey: '', authDomain: '', projectId: '' },
  supabase: { url: '', anonKey: '' }
};

export class LeaderboardService {
  constructor(saveSystem) {
    this.saveSystem = saveSystem;
    this.hasBackend = BACKEND_CONFIG.provider !== '';
    this.entries = [];
  }

  async init() {
    await this.fetchLeaderboard();
  }

  async submit(name, score, level) {
    const entry = { name: name.trim().toUpperCase().slice(0, 12), score, level, date: Date.now() };
    
    if (this.hasBackend) {
      // Backend submission stub — replace with real SDK calls
      console.log('[Leaderboard] Would submit to backend:', entry);
      // TODO: Implement Firebase/Supabase submit here
    }
    
    // Always save locally too
    this.saveSystem.addLocalEntry(entry.name, entry.score, entry.level);
    await this.fetchLeaderboard();
    return entry;
  }

  async fetchLeaderboard() {
    if (this.hasBackend) {
      // Backend fetch stub
      console.log('[Leaderboard] Would fetch from backend');
      // TODO: Implement Firebase/Supabase fetch here
    }
    
    // Merge local entries
    this.entries = this.saveSystem.getLocalLeaderboard(20);
    return this.entries;
  }

  getEntries() {
    return this.entries;
  }

  renderTable(containerId, entries) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Keep header, clear rows
    const header = container.querySelector('.lb-header');
    container.innerHTML = '';
    if (header) container.appendChild(header);
    
    const data = entries.slice(0, 10);
    if (data.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'lb-row';
      empty.innerHTML = '<span colspan="4" style="text-align:center;color:var(--text-dim)">No entries yet</span>';
      container.appendChild(empty);
      return;
    }
    
    data.forEach((e, i) => {
      const row = document.createElement('div');
      row.className = 'lb-row';
      row.innerHTML = `
        <span>${i + 1}</span>
        <span>${this.escapeHtml(e.name || '???')}</span>
        <span>${e.score.toLocaleString()}</span>
        <span>${e.level}</span>
      `;
      container.appendChild(row);
    });
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
