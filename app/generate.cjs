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

module.exports = { POSES, imageMime, generatePoses, savePose };
