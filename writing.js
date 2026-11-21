'use strict';

function writingPaths(number) {
  if (number !== 10) return digitStrokes[number];
  return [...digitStrokes[1], ...digitStrokes[0].map(stroke =>
    stroke.map(segment => segment.map((value, index) => index % 2 === 0 ? value + 72 : value)))];
}

function sampleStroke([start, ...segments]) {
  const points = [start];
  let origin = start;
  for (const segment of segments) {
    const end = segment.slice(-2);
    const controls = [origin, ...Array.from({ length: segment.length / 2 }, (_, i) => segment.slice(i * 2, i * 2 + 2))];
    const distance = controls.slice(1).reduce((sum, p, i) => sum + Math.hypot(p[0] - controls[i][0], p[1] - controls[i][1]), 0);
    const steps = Math.max(2, Math.ceil(distance / 2));
    for (let i = 1; i <= steps; i += 1) {
      const t = i / steps;
      const s = 1 - t;
      points.push(origin.map((value, axis) => segment.length === 2
        ? s * value + t * end[axis]
        : s ** 3 * value + 3 * s ** 2 * t * segment[axis] + 3 * s * t ** 2 * segment[axis + 2] + t ** 3 * end[axis]));
    }
    origin = end;
  }
  return points;
}

function createWriting(number, mode, { onComplete, onNextStroke, onInk }) {
  const canvas = document.createElement('canvas');
  canvas.className = 'writing-canvas';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', mode === 'watch' ? 'Показ написания' : 'Поле для рисования пальцем или мышью');
  const ctx = canvas.getContext('2d');
  const strokes = writingPaths(number).map(sampleStroke);
  const width = number === 10 ? 172 : 100;
  const total = strokes.reduce((sum, stroke) => sum + stroke.length, 0);
  let scale = 1;
  let left = 0;
  let top = 0;
  let frame;
  let resizeFrame;
  let strokeIndex = 0;
  let offset = -1;
  let pointer;
  let last;
  let ink = [];
  let guides = false;
  let shown = 0;
  let lastMotion = Date.now();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function drawLine(points, color, thickness) {
    if (!points.length) return;
    ctx.beginPath();
    ctx.moveTo(...points[0]);
    if (points.length === 1) ctx.lineTo(points[0][0] + .02, points[0][1]);
    for (const point of points.slice(1)) ctx.lineTo(...point);
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    ctx.stroke();
  }

  function dot(point, radius, color) {
    ctx.beginPath();
    ctx.arc(...point, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  function draw() {
    if (!scale) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.translate(left, top);
    ctx.scale(scale, scale);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (mode === 'free') {
      if (guides) strokes.forEach(stroke => stroke.forEach((point, index) => {
        if (index % 5 === 0) dot(point, 1.55, '#957c9c');
      }));
      ink.forEach(line => drawLine(line, '#874766', 4));
      return;
    }

    if (mode === 'trace') {
      strokes.forEach(stroke => {
        drawLine(stroke, '#dfb8cd', 17);
        drawLine(stroke, '#f9e6ef', 12);
      });
      strokes.slice(0, strokeIndex).forEach(stroke => drawLine(stroke, '#874766', 6));
      if (strokeIndex < strokes.length) {
        const stroke = strokes[strokeIndex];
        drawLine(stroke.slice(0, offset + 1), '#874766', 6);
        if (offset < 0 || Date.now() - lastMotion > 800) dot(stroke[Math.min(offset + 1, stroke.length - 1)], 3.8, '#236948');
      }
      return;
    }

    let remaining = shown;
    for (const stroke of strokes) {
      drawLine(stroke, '#e7cbd8', 5);
      drawLine(stroke.slice(0, Math.max(0, remaining)), '#874766', 5);
      if (remaining >= 0 && remaining < stroke.length) dot(stroke[remaining], 4, '#236948');
      remaining -= stroke.length;
    }
  }

  function size() {
    const bounds = canvas.getBoundingClientRect();
    const ratio = Math.min(2, devicePixelRatio || 1);
    const nextWidth = Math.round(bounds.width * ratio);
    const nextHeight = Math.round(bounds.height * ratio);
    if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
      pointer = undefined;
      canvas.width = nextWidth;
      canvas.height = nextHeight;
    }
    scale = Math.min(canvas.width / width, canvas.height / 104);
    left = (canvas.width - width * scale) / 2;
    top = (canvas.height - 104 * scale) / 2;
    draw();
  }

  function replay(milliseconds) {
    cancelAnimationFrame(frame);
    shown = reducedMotion ? total : 0;
    draw();
    if (reducedMotion) return;
    const start = performance.now();
    const duration = milliseconds || strokes.length * 520 + total * 22;
    function animate(now) {
      shown = Math.min(total, Math.floor((now - start) * total / duration));
      draw();
      if (shown < total) frame = requestAnimationFrame(animate);
    }
    frame = requestAnimationFrame(animate);
  }

  function coords(event) {
    const bounds = canvas.getBoundingClientRect();
    return [
      ((event.clientX - bounds.left) * canvas.width / bounds.width - left) / scale,
      ((event.clientY - bounds.top) * canvas.height / bounds.height - top) / scale,
    ];
  }

  function tracePoint([x, y]) {
    const stroke = strokes[strokeIndex];
    if (!stroke || pointer === undefined) return false;
    const previous = offset;
    const start = Math.max(0, offset + 1);
    const limit = Math.min(start + (offset < 0 ? 1 : 5), stroke.length);
    for (let i = start; i < limit; i += 1) {
      const point = stroke[i];
      if (Math.hypot(point[0] - x, point[1] - y) > 7.5) break;
      offset = i;
    }
    if (offset === stroke.length - 1) {
      strokeIndex += 1;
      offset = -1;
      pointer = undefined;
      if (strokeIndex === strokes.length) onComplete();
      else onNextStroke();
      return true;
    }
    return offset > previous;
  }

  function drawPoint(point) {
    if (mode === 'free') {
      const line = ink[ink.length - 1];
      line.push(point.map((value, axis) => Math.max(0, Math.min(axis ? 104 : width, value))));
      if (Math.hypot(point[0] - line[0][0], point[1] - line[0][1]) >= 4) onInk(true);
    } else if (tracePoint(point)) lastMotion = Date.now();
  }

  if (mode !== 'watch') {
    canvas.addEventListener('pointerdown', event => {
      if (pointer !== undefined || event.button !== 0 || !scale) return;
      pointer = event.pointerId;
      canvas.setPointerCapture?.(pointer);
      last = coords(event);
      if (mode === 'free') {
        ink.push([]);
      }
      drawPoint(last);
      draw();
    });
    canvas.addEventListener('pointermove', event => {
      if (pointer !== event.pointerId) return;
      const point = coords(event);
      if (mode === 'trace') {
        const steps = Math.ceil(Math.hypot(point[0] - last[0], point[1] - last[1]) / 2);
        for (let i = 1; i <= steps && pointer !== undefined; i += 1) {
          drawPoint(last.map((value, axis) => value + (point[axis] - value) * i / steps));
        }
      } else {
        drawPoint(point);
      }
      last = point;
      draw();
    });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      canvas.addEventListener(name, event => {
        if (pointer === event.pointerId) pointer = undefined;
      });
    }
    if (!canvas.setPointerCapture) canvas.addEventListener('pointerleave', () => { pointer = undefined; });
  }

  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(size) : null;
  if (observer) observer.observe(canvas);
  else {
    window.addEventListener('resize', size);
    resizeFrame = requestAnimationFrame(size);
  }
  const hint = mode === 'trace' ? setInterval(draw, 420) : undefined;

  return {
    canvas,
    replay,
    clear() {
      ink = [];
      strokeIndex = 0;
      offset = -1;
      pointer = undefined;
      lastMotion = Date.now();
      onInk(false);
      draw();
    },
    toggleGuides() {
      guides = !guides;
      draw();
      return guides;
    },
    dispose() {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(resizeFrame);
      clearInterval(hint);
      if (observer) observer.disconnect();
      else window.removeEventListener('resize', size);
    },
  };
}
