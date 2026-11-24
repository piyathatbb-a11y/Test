import { seeded } from '../systems/Expedition.js';

export const ROUTE_SIZE = { width: 1340, height: 460 };
const ICONS = {
  fight: '<path d="m5 3 12 12-3 3L2 6V2h4M14 3l-4 4m9 7-4 4m-4-1-6 6m-2-4 4 4M21 2v4l-3 3"/>',
  elite: '<path d="M6 15c-5-8 0-13 6-13s11 5 6 13l-3 2v4H9v-4Z"/><path d="m5 6-3-3m17 3 3-3M9 18v3m6-3v3M10 13l2-2 2 2"/><path d="M7 8h3v3H7zm7 0h3v3h-3z"/>',
  event: '<path d="M7 7a5 5 0 0 1 10 0c0 4-5 4-5 8"/><circle cx="12" cy="20" r="1"/>',
  shop: '<path d="M3 10h18L18 3H6Zm1 0v12h16V10M9 22v-7h6v7M8 3l-1 7m5-7v7m4-7 1 7"/><path d="M3 10c0 4 4 4 5 0 0 4 4 4 4 0 0 4 4 4 4 0 1 4 5 4 5 0"/>',
  treasure: '<path d="M3 10V7a5 5 0 0 1 5-4h8a5 5 0 0 1 5 4v3M3 10h18v11H3ZM8 3v7m8-7v7M3 14h6m6 0h6"/><path d="M9 11h6v6H9z"/>',
  rest: '<path d="m12 2-2 6 4 2-1 4c5-3 7 2 5 5-3 5-13 3-13-2-1-4 1-6 3-8l1 6c4-3 4-7 3-13Z"/><path d="m3 23 18-3M3 20l18 3"/>',
  boss: '<path d="M3 22V10h5v12m8 0V10h5v12M8 22V6h8v16M2 22h20M2 10V6h2v2h2V6h2v4m8 0V6h2v2h2V6h2v4M8 6V2h2v2h4V2h2v4"/><path d="M10 22v-5a2 2 0 0 1 4 0v5M11 9h2m-2 4h2"/>'
};
export function roomIcon(type) {
  return `<svg class="exp-room-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[type] || ICONS.event}</svg>`;
}
export function routePositions(nodes, seed) {
  const positions = new Map();
  for (const n of nodes) {
    const rng = seeded(`${seed}:drawing:${n.id}`);
    positions.set(n.id, {
      x: 140 + n.row * 136 + (n.row === 0 || n.type === 'boss' ? 0 : Math.round((rng() - .5) * 24)),
      y: n.type === 'boss' ? 230 : [95, 230, 365][n.col] + Math.round((rng() - .5) * 48)
    });
  }
  return positions;
}
export function routeCurve(from, to) {
  const start = from.x + 24, end = to.x - 24, middle = (start + end) / 2;
  return `M${start} ${from.y} C${middle} ${from.y},${middle} ${to.y},${end} ${to.y}`;
}
