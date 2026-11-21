/* 轻记 · 图表（无依赖 SVG + CSS） */
(function () {
  'use strict';

  const QJ = (window.QJ = window.QJ || {});

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function donut(segments, options) {
    options = options || {};
    const size = options.size || 220;
    const stroke = options.stroke || 26;
    const radius = (size - stroke) / 2 - 4;
    const center = size / 2;
    const circumference = 2 * Math.PI * radius;
    const total = segments.reduce(function (sum, s) { return sum + s.value; }, 0);
    const gap = segments.length > 1 ? 3 : 0;

    let rings = '<circle class="donut-track" cx="' + center + '" cy="' + center + '" r="' + radius +
      '" fill="none" stroke="var(--color-primary-soft)" stroke-width="' + stroke + '"/>';

    if (total > 0) {
      let cumulative = 0;
      rings += segments.map(function (segment, index) {
        const fraction = segment.value / total;
        const length = Math.max(0, circumference * fraction - gap);
        const offset = -circumference * cumulative;
        cumulative += fraction;
        const percent = Math.round(fraction * 1000) / 10;
        const tip = segment.name + ' · ¥' + (segment.value / 100).toFixed(2) + ' · ' + percent + '%';
        return '<circle class="donut-seg" cx="' + center + '" cy="' + center + '" r="' + radius +
          '" fill="none" stroke="' + segment.color + '" stroke-width="' + stroke +
          '" stroke-dasharray="' + length + ' ' + (circumference - length) +
          '" stroke-dashoffset="' + offset + '" transform="rotate(-90 ' + center + ' ' + center + ')"' +
          ' tabindex="0" role="img" aria-label="' + esc(segment.name + '，¥' + (segment.value / 100).toFixed(2) + '，' + percent + '%') + '"' +
          ' data-tip="' + esc(tip) + '" data-seg="' + index + '"><title>' + esc(tip) + '</title></circle>';
      }).join('');
    }

    return '<svg class="donut" viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size +
      '" role="img" aria-label="' + esc(options.label || '分类占比图') + '">' + rings + '</svg>';
  }

  function trendBars(items, selectedKey) {
    const max = Math.max.apply(null, items.map(function (item) { return item.value; }).concat([1]));
    return '<div class="trend-chart">' + items.map(function (item) {
      const pct = item.value === 0 ? 0 : Math.max(4, (item.value / max) * 100);
      const selected = item.key === selectedKey;
      return '<button class="trend-col' + (selected ? ' is-selected' : '') + '" type="button"' +
        ' data-action="trend-month" data-month="' + esc(item.key) + '"' +
        ' aria-label="' + esc(item.label + '，支出 ¥' + (item.value / 100).toFixed(2) + '，点击查看') + '"' +
        ' data-tip="' + esc(item.label + ' · ¥' + (item.value / 100).toFixed(2)) + '">' +
        '<span class="trend-value">' + (selected ? esc(item.shortValue) : '') + '</span>' +
        '<span class="trend-track"><span class="trend-fill" style="height:' + pct + '%"></span></span>' +
        '<span class="trend-label">' + esc(item.label) + '</span></button>';
    }).join('') + '</div>';
  }

  QJ.charts = { donut: donut, trendBars: trendBars, esc: esc };
})();
