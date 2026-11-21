/* 轻记 · 线性图标与「小桃」形象 */
(function () {
  'use strict';

  const QJ = (window.QJ = window.QJ || {});

  const ICONS = {
    bowl: '<path d="M4 11h16c0 4.6-3.6 8-8 8s-8-3.4-8-8Z"/><path d="M8 11V8m4 3V6m4 5V8"/><path d="M7 19h10"/>',
    train: '<rect x="5" y="3" width="14" height="14" rx="4"/><path d="M5 11h14M9 17l-2 4m8-4 2 4"/><circle cx="9" cy="7" r="1"/><circle cx="15" cy="7" r="1"/>',
    bag: '<path d="M5 8h14l-1.2 12H6.2L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    play: '<rect x="3" y="5" width="18" height="14" rx="4"/><path d="M10 9l5 3-5 3V9Z"/>',
    medical: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3Z"/>',
    book: '<path d="M4 5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 0-2 2V5Z"/><path d="M4 19a2 2 0 0 1 2-2h13"/>',
    gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v8h14v-8M12 8v12"/><path d="M12 8c-1.5-4-6-4-6-1 0 2 3 1 6 1Zm0 0c1.5-4 6-4 6-1 0 2-3 1-6 1Z"/>',
    phone: '<rect x="7" y="2" width="10" height="20" rx="3"/><path d="M11 18h2"/>',
    paw: '<circle cx="7" cy="8" r="2"/><circle cx="12" cy="6" r="2"/><circle cx="17" cy="8" r="2"/><path d="M8 17c0-3 2-5 4-5s4 2 4 5c0 2-2 3-4 3s-4-1-4-3Z"/>',
    plane: '<path d="M2 12l20-8-8 20-3-8-9-4Z"/>',
    box: '<path d="M3 7l9-4 9 4-9 4-9-4Z"/><path d="M3 7v10l9 4 9-4V7M12 11v10"/>',
    wallet: '<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18M16 14h2"/>',
    trophy: '<path d="M8 4h8v4a4 4 0 0 1-8 0V4Z"/><path d="M8 5H5v2a3 3 0 0 0 3 3m8-5h3v2a3 3 0 0 1-3 3M12 12v4m-3 4h6"/>',
    briefcase: '<rect x="3" y="7" width="18" height="12" rx="3"/><path d="M9 7V5h6v2M3 12h18"/>',
    chart: '<path d="M4 20V10m5 10V4m5 16v-7m5 7V7"/>',
    receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
    redpacket: '<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M4 10c3 2 5 3 8 3s5-1 8-3"/><circle cx="12" cy="8" r="2"/>',
    cup: '<path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5V9Z"/><path d="M16 10h2a2 2 0 0 1 0 4h-2M7 3v3m4-3v3m4-3v3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.09a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4m8-4v4"/>',
    'chevron-left': '<path d="m15 5-7 7 7 7"/>',
    'chevron-right': '<path d="m9 5 7 7-7 7"/>',
    'chevron-down': '<path d="m5 9 7 7 7-7"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    check: '<path d="m4 12 5 5L20 6"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3m-9 0 1 14h10l1-14M10 11v6m4-6v6"/>',
    edit: '<path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>',
    more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
    download: '<path d="M12 3v12m0 0 5-5m-5 5-5-5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
    upload: '<path d="M12 21V9m0 0 5 5m-5-5-5 5"/><path d="M4 7V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.4 8 8 9 4.6-1 8-4 8-9V6l-8-3Z"/><path d="m9 12 2 2 4-4"/>',
    sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    database: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    'eye-off': '<path d="M3 3l18 18M10.6 5.2A11 11 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.2 6.2A17 17 0 0 0 2 12s3.5 7 10 7a11 11 0 0 0 4.2-.8"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-9.5v.2"/>',
    'arrow-left': '<path d="M20 12H4m0 0 6-6m-6 6 6 6"/>',
    'arrow-up': '<path d="M12 19V5m0 0-6 6m6-6 6 6"/>',
    'arrow-down': '<path d="M12 5v14m0 0 6-6m-6 6-6-6"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2 6"/><path d="M20 5v6h-6"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    heart: '<path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 0 0-7.1 7.1L12 21l8.8-8.3a5 5 0 0 0 0-7.1Z"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>'
  };

  function icon(name, size, className) {
    const content = ICONS[name] || ICONS.box;
    return '<svg class="icon ' + (className || '') + '" width="' + (size || 24) + '" height="' + (size || 24) +
      '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      content + '</svg>';
  }

  function mascot(mood, size) {
    mood = mood || 'happy';
    const s = size || 120;
    let face = '';
    if (mood === 'sorry') {
      face = '<path d="M44 66l6 2M76 66l-6 2" stroke="#3F2A33" stroke-width="2.6" stroke-linecap="round"/>' +
        '<path d="M56 82c2-2 6-2 8 0" stroke="#3F2A33" stroke-width="2.6" fill="none" stroke-linecap="round"/>';
    } else if (mood === 'soft') {
      face = '<circle cx="48" cy="68" r="2.8" fill="#3F2A33"/><circle cx="72" cy="68" r="2.8" fill="#3F2A33"/>' +
        '<path d="M57 79c2 1.5 4.5 1.5 6.5 0" stroke="#3F2A33" stroke-width="2.4" fill="none" stroke-linecap="round"/>';
    } else {
      face = '<circle cx="48" cy="68" r="2.8" fill="#3F2A33"/><circle cx="72" cy="68" r="2.8" fill="#3F2A33"/>' +
        '<path d="M54 78c3.5 3.5 8.5 3.5 12 0" stroke="#3F2A33" stroke-width="2.6" fill="none" stroke-linecap="round"/>';
    }
    return '<svg class="mascot mascot--' + mood + '" width="' + s + '" height="' + s + '" viewBox="0 0 120 120" fill="none" aria-hidden="true" focusable="false">' +
      '<ellipse cx="60" cy="109" rx="29" ry="6" fill="#F2D7E1" opacity=".6"/>' +
      '<path d="M60 24C84 24 100 44 100 68c0 25-18 40-40 40S20 93 20 68c0-24 16-44 40-44Z" fill="#FFB3CA" stroke="#D95C86" stroke-width="2.4"/>' +
      '<path d="M60 25c2-12 13-19 26-15 0 12-12 19-26 15Z" fill="#8FD4C1" stroke="#4C9A86" stroke-width="2.2"/>' +
      '<path d="M60 27c1-7 4-11 8-14" stroke="#4C9A86" stroke-width="2.2" stroke-linecap="round"/>' +
      '<path d="M60 30c-4 15-4 28 0 37" stroke="#D95C86" stroke-width="2.2" stroke-linecap="round" opacity=".32"/>' +
      '<ellipse cx="36" cy="79" rx="7" ry="4" fill="#F27E9D" opacity=".38"/>' +
      '<ellipse cx="84" cy="79" rx="7" ry="4" fill="#F27E9D" opacity=".38"/>' +
      '<ellipse cx="40" cy="54" rx="7" ry="3.4" fill="#FFFFFF" opacity=".38"/>' +
      face +
      '</svg>';
  }

  function peachMark(size) {
    const s = size || 28;
    return '<svg class="peach-mark" width="' + s + '" height="' + s + '" viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false">' +
      '<path d="M32 12c14 0 24 11 24 24S46 60 32 60 8 51 8 36s10-24 24-24Z" fill="#F78FB3"/>' +
      '<path d="M32 14c2-8 9-12 17-9 0 8-8 12-17 9Z" fill="#7BC8B5"/>' +
      '<circle cx="24" cy="36" r="2.2" fill="#3F2A33"/><circle cx="40" cy="36" r="2.2" fill="#3F2A33"/>' +
      '<path d="M27 44c3 3 7 3 10 0" stroke="#3F2A33" stroke-width="2.4" stroke-linecap="round"/>' +
      '</svg>';
  }

  QJ.icon = icon;
  QJ.mascot = mascot;
  QJ.peachMark = peachMark;
  QJ.iconNames = Object.keys(ICONS);
})();
