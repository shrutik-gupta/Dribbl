/* Inline SVG icons (stroke icons, coloured by currentColor). */
const svg = body => `<svg viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;

export const ICON = {
  ball: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7.5l3.8 2.8-1.5 4.4H9.7l-1.5-4.4z"/><path d="M12 3v4.5M15.8 10.3l4.6-1.6M14.3 14.7l2.8 4M9.7 14.7l-2.8 4M8.2 10.3L3.6 8.7"/>'),
  players: svg('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><circle cx="17" cy="9" r="2.8"/><path d="M16 14.6c2.8 0 4.8 1.6 5.5 4.6"/>'),
  stats: svg('<path d="M5 20V10M12 20V4M19 20v-7"/>'),
  graphs: svg('<path d="M4 19V5M4 19h16"/><path d="M7 15l4-5 3 3 5-6"/>'),
  me: svg('<circle cx="12" cy="8.5" r="4"/><path d="M4.5 20.5c1-4 4-6 7.5-6s6.5 2 7.5 6"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  arrow: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  back: svg('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
  swap: svg('<path d="M7 7h12l-3-3M17 17H5l3 3"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>')
};
