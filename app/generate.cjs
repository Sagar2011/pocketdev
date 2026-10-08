const fs = require('node:fs/promises');
const path = require('node:path');

const POSES = ['waiting', 'working', 'done', 'idle'];
const PNG = Buffer.from('89504e470d0a1a0a', 'hex');

function imageMime(bytes) {
  if (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length > 10 * 1024 * 1024) throw new Error('Choose an image smaller than 10 MB.');
  if (bytes.subarray(0, 8).equals(PNG)) return 'image/png';
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  throw new Error('Use a PNG, JPEG, or WebP image.');
}

// Image tools often leave a faint semi-transparent haze where the background should be clear.
// Clean PNGs have partial alpha only along the character's edges; when much more of the image is
// haze, clear it and stretch the remaining alpha so soft edges survive. Mutates the BGRA/RGBA
// bitmap in place (premultiplied-safe) and reports whether it changed anything.
function clearAlphaHaze(bitmap) {
  let haze = 0;
  for (let i = 3; i < bitmap.length; i += 4) if (bitmap[i] > 0 && bitmap[i] < 128) haze++;
  if (haze / (bitmap.length / 4) < 0.2) return false;
  for (let i = 0; i < bitmap.length; i += 4) {
    const a = bitmap[i + 3], next = a <= 128 ? 0 : Math.round((a - 128) * 255 / 127), k = a ? next / a : 0;
    bitmap[i] = Math.round(bitmap[i] * k); bitmap[i + 1] = Math.round(bitmap[i + 1] * k); bitmap[i + 2] = Math.round(bitmap[i + 2] * k);
    bitmap[i + 3] = next;
  }
  return true;
}

// Generated sheets rarely put the gap between frames exactly at the centre, and the character
// drifts between cells. Find the real gutters near the middle, then rebuild an even 2×2 grid with
// every frame registered on its feet (the part that stays still). Returns null for non-sheets.
function normalizeSheet(bitmap, width, height) {
  if (width < 64 || Math.abs(width - height) > width * 0.02) return null;
  const bg = bitmap.subarray(0, 4);
  const filled = (x, y) => {
    const i = (y * width + x) * 4;
    return bitmap[i + 3] >= 128 && !(Math.abs(bitmap[i] - bg[0]) + Math.abs(bitmap[i + 1] - bg[1]) + Math.abs(bitmap[i + 2] - bg[2]) < 30 && Math.abs(bitmap[i + 3] - bg[3]) < 16);
  };
  const gutter = (length, other, count) => {
    let best = 0, least = Infinity;
    for (let p = Math.floor(length * 0.35); p < length * 0.65; p++) {
      let n = 0;
      for (let q = 0; q < other; q++) n += count(p, q);
      if (n < least) { least = n; best = p; }
    }
    return least / other <= 0.03 ? best : -1;
  };
  const gx = gutter(width, height, (x, y) => filled(x, y)), gy = gutter(height, width, (y, x) => filled(x, y));
  if (gx < 0 || gy < 0) return null;
  const quads = [[0, 0, gx, gy], [gx, 0, width, gy], [0, gy, gx, height], [gx, gy, width, height]];
  const frames = [];
  for (const [x0, y0, x1, y1] of quads) {
    let top = Infinity, bottom = -1, minX = Infinity, maxX = -1;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (filled(x, y)) { top = Math.min(top, y); bottom = y; minX = Math.min(minX, x); maxX = Math.max(maxX, x); }
    if (bottom < 0) return null; // Every frame needs a character.
    let left = Infinity, right = -1;
    const feet = Math.max(top, Math.round(bottom - (bottom - top) * 0.15));
    for (let y = feet; y <= bottom; y++) for (let x = x0; x < x1; x++) if (filled(x, y)) { left = Math.min(left, x); right = Math.max(right, x); }
    const anchor = (left + right) / 2;
    frames.push({ x0, y0, x1, y1, bottom, anchor, tall: bottom - top, half: Math.max(anchor - minX, maxX - anchor) });
  }
  // Size cells to the largest frame (feet-centred) plus padding, so nothing is clipped or resampled.
  const need = Math.max(...frames.map(f => Math.max(f.tall / 0.88, (f.half * 2) / 0.92)));
  const cell = Math.ceil(Math.max(need, Math.max(width, height) / 2)), out = Buffer.alloc(cell * cell * 16);
  for (const [k, { x0, y0, x1, y1, bottom, anchor }] of frames.entries()) {
    const cx0 = (k % 2) * cell, cy0 = (k >> 1) * cell;
    const dx = cx0 + Math.round(cell / 2 - anchor), dy = cy0 + Math.round(cell * 0.95) - bottom;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const tx = x + dx, ty = y + dy;
      if (!filled(x, y) && bitmap[(y * width + x) * 4 + 3] === 0) continue;
      if (tx < cx0 || ty < cy0 || tx >= cx0 + cell || ty >= cy0 + cell) continue;
      bitmap.copy(out, (ty * cell * 2 + tx) * 4, (y * width + x) * 4, (y * width + x) * 4 + 4);
    }
  }
  return { bitmap: out, width: cell * 2, height: cell * 2 };
}

// A 2×2 frame sheet (like the bundled buddy) has an empty gutter through both centre lines;
// a single centred character crosses them. Empty = mostly transparent (a faint glow is fine)
// or the corner background colour.
function isFrameSheet(bitmap, width, height) {
  if (width < 64 || Math.abs(width - height) > width * 0.02) return false;
  const at = (x, y) => (y * width + x) * 4;
  const bg = bitmap.subarray(0, 4);
  const empty = i => bitmap[i + 3] < 128 ||
    (Math.abs(bitmap[i] - bg[0]) + Math.abs(bitmap[i + 1] - bg[1]) + Math.abs(bitmap[i + 2] - bg[2]) < 30 && Math.abs(bitmap[i + 3] - bg[3]) < 16);
  const cx = width >> 1, cy = height >> 1, side = Math.min(width, height);
  let hits = 0, total = 0;
  for (let d = -2; d <= 2; d++) for (let t = 0; t < side; t++) {
    hits += empty(at(cx + d, t)) + empty(at(t, cy + d));
    total += 2;
  }
  return hits / total >= 0.97;
}

async function generatePoses({ photo, mime, key, save, progress = () => {}, signal, fetchImpl = fetch }) {
  imageMime(photo);
  if (typeof key !== 'string' || !key.trim() || key.length > 1024 || /[\r\n]/.test(key)) throw new Error('Enter a valid OpenAI API key.');
  const actions = {
    waiting: 'Standing with a small notepad in one hand, the other hand raised in a gentle knock-knock gesture, patiently asking for attention.',
    working: 'Sitting at a laptop, leaning in and typing intensely, eyes focused on the screen, hands visible.',
    done: 'Standing with a subtle satisfied smile and one hand clearly giving a thumbs-up.',
    idle: 'Sitting casually on a small stool, holding a bag of potato chips and lifting a chip toward the mouth, relaxed during a break.'
  };
  let reference;
  for (const pose of POSES) {
    signal?.throwIfAborted();
    progress(pose);
    const form = new FormData();
    form.set('model', 'gpt-image-1.5');
    form.set('size', '1024x1024');
    form.set('quality', 'medium');
    form.set('background', 'transparent');
    form.set('output_format', 'png');
    form.set('n', '1');
    form.set('prompt', `Create one understated full-body miniature avatar version of the person in the first photo. Preserve their face, skin tone, hairstyle, facial hair, clothing and existing accessories. Do not add glasses, a costume, or invented accessories. Refined semi-realistic illustration with natural adult proportions, a modestly stylized face, subtle shading and a muted palette. No oversized head, big cartoon eyes, blush circles, or chibi proportions. Readable as a tiny desktop companion. ${actions[pose]} ${reference ? 'The second image is the previously created avatar: match its identity, outfit, proportions, palette and illustration style exactly; change only the pose and necessary prop.' : ''} One character only, centered, consistent scale with 10 percent padding on every side. Transparent background, no text, no scenery, no floor, no cast shadow.`);
    form.append('image[]', new Blob([photo], { type: mime }), 'photo');
    if (reference) form.append('image[]', new Blob([reference], { type: 'image/png' }), 'avatar.png');
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(abort, 180000);
    try {
      const response = await fetchImpl('https://api.openai.com/v1/images/edits', {
        method: 'POST', headers: { Authorization: `Bearer ${key.trim()}` }, body: form, signal: controller.signal
      });
      if (!response.ok) throw new Error(`Image service returned HTTP ${response.status}. Check API access, billing, and rate limits. Completed poses are kept; retry generates all four again.`);
      const json = await response.json();
      const encoded = json.data?.[0]?.b64_json;
      if (typeof encoded !== 'string' || encoded.length > 14 * 1024 * 1024) throw new Error('The image service returned an invalid image.');
      const bytes = Buffer.from(encoded, 'base64');
      if (imageMime(bytes) !== 'image/png') throw new Error('Expected a PNG from the image service.');
      signal?.throwIfAborted();
      await save(pose, bytes);
      signal?.throwIfAborted();
      reference ||= bytes;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    }
  }
}

async function savePose(dir, pose, bytes) {
  if (!POSES.includes(pose)) throw new Error('Unknown pose.');
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  const file = path.join(dir, `${pose}.png`);
  await fs.writeFile(`${file}.tmp`, bytes, { mode: 0o600 });
  await fs.rename(`${file}.tmp`, file);
}

module.exports = { POSES, imageMime, clearAlphaHaze, normalizeSheet, isFrameSheet, generatePoses, savePose };
