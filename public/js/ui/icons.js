/* Inline SVG icons (stroke icons, coloured by currentColor). */
const svg = body => `<svg viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;

/* The Dribbl mark (white on transparent). Always sits on the brand green. */
export const LOGO = '<img class="logo" src="assets/logo.png" alt="" width="256" height="256">';

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
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  star: svg('<path fill="currentColor" stroke="none" d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5L2.6 9.4l6.5-.9z"/>'),
  trophy: svg('<path d="M8 4h8v5a4 4 0 01-8 0z"/><path d="M8 5.5H5c0 3 1.2 4.5 3.3 4.8M16 5.5h3c0 3-1.2 4.5-3.3 4.8M12 13v4M8.5 20h7M9.5 17h5"/>'),
  rupee: svg('<circle cx="12" cy="12" r="9"/><path d="M8.5 7.5h7M8.5 10.5h7M9 7.5h2a3 3 0 010 6H9l5 4"/>'),
  calendar: svg('<rect x="4" y="5.5" width="16" height="14.5" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>'),
  goal: svg('<path d="M3.5 19V6h17v13"/><path d="M3.5 10.5h17M3.5 15h17M9.2 6v13M14.8 6v13"/>'),
  help: svg('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 114 2c-.9.6-1.5 1.1-1.5 2.2M12 16.8v.1"/>'),
  clipboard: svg('<rect x="5.5" y="5" width="13" height="15.5" rx="2.5"/><path d="M9 5V3.5h6V5M9 11h6M9 15h4"/>'),
  warn: svg('<path d="M12 4L2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17.2v.1"/>'),
  ban: svg('<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>'),
  shuffle: svg('<path d="M4 7h3.5c5 0 4.5 10 9.5 10h3M17.5 14.5L20 17l-2.5 2.5"/><path d="M4 17h3.5c1.4 0 2.3-.8 3.1-1.9M13.4 8.9C14.2 7.8 15.4 7 17 7h3M17.5 4.5L20 7l-2.5 2.5"/>'),
  scale: svg('<path d="M12 4v16M7.5 20h9M5 7h14"/><path d="M5 7l-2.5 6a2.5 2.5 0 005 0zM19 7l-2.5 6a2.5 2.5 0 005 0z"/>')
};
