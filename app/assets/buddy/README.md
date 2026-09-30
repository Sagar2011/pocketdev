# Default textured buddy

Four bundled 1254 × 1254 transparent PNG sheets, each a 2 × 2 grid in reading order.
They are generated artwork, distributed with PocketDev under its MIT license.
Generated using Codex's built-in image-generation tool from the user's approved
developer concept. The user's original style reference is not bundled.

No generation requests, API key, image service, or 3D engine are needed to use them.
The files retain their generated pixels and alpha. The view boxes in `mascot.js`
align the frames at display time; changing a sheet requires checking those bounds.
CSS changes frames discretely and supplies the jump, sway, and gentle body motion.
Reduced Motion displays the first frame. Custom/imported avatars still use the
existing separate image-based path.

## Generation prompt specification

Shared direction: preserve the approved miniature adult developer's wavy dark
hair, warm skin, short beard, charcoal olive woven overshirt, gray T-shirt,
slate trousers, gray sneakers, tactile 3D materials, and soft studio lighting.
Create one square transparent PNG per activity, exactly two columns by two rows
of equal square cells. Keep camera, scale, head placement, and feet registered
across frames. Show the complete character inside every cell. No labels, text,
borders, environment, pedestal, checkerboard, or extra props.

- **waiting.png:** stand with cream notepad in left hand; right hand prepares
  to knock, extends knuckles, pulls back, then knocks slightly more emphatically.
  Only forearm/hand and subtle eyebrows change.
- **working.png:** seated behind a slim desk with silver laptop; alternate
  typing hand positions, lift a hand toward the head, then scratch the hair.
  Keep desk, chair, laptop, body, and feet fixed.
- **done.png:** standing with one thumbs-up; raise the thumb slightly, extend
  it toward the viewer with a warmer smile, then return. Feet stay grounded in
  all source frames: the application supplies the jump.
- **idle.png:** seated with a kraft chips bag on the lap; hold a chip near the
  bag, lift toward mouth, bring it to the mouth, then lower the hand and chew.
  Keep the bag, stool, body, and feet fixed. No idle sound.

Each is a four-frame stylized sequence, not continuous motion capture. Inspect
at both 120 px and the minimum supported size before changing timing or artwork.
