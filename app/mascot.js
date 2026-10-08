// Bundled 3D-style sprite sheets; no network or animation library required.
// View boxes align the original generated frames without resampling the artwork.
const buddyAssets = new URL("assets/buddy/", document.currentScript.src).href;
const buddyFrames = {
  waiting: {
    size: 1254,
    cell: 627,
    views: [
      [20, -75, 742, 742],
      [569, -75, 742, 742],
      [20, 550, 742, 742],
      [569, 550, 742, 742],
    ],
  },
  working: {
    size: 1254,
    cell: 627,
    views: [
      [-41, -63, 726, 726],
      [577, -63, 726, 726],
      [-41, 548, 726, 726],
      [577, 549, 726, 726],
    ],
  },
  done: {
    size: 1254,
    cell: 627,
    views: [
      [-3, -68, 732, 732],
      [545, -68, 732, 732],
      [-3, 558, 732, 732],
      [545, 558, 732, 732],
    ],
  },
  idle: {
    size: 1254,
    cell: 627,
    views: [
      [-18, -46, 703, 703],
      [574, -46, 703, 703],
      [-15, 567, 703, 703],
      [576, 568, 703, 703],
    ],
  },
};
window.mountMascot = (container) => {
  const poses = Object.entries(buddyFrames)
    .map(([pose, sheet]) => {
      const frames = sheet.views
        .map((view, index) => {
          const x = (index % 2) * sheet.cell,
            y = Math.floor(index / 2) * sheet.cell;
          return `<svg class="sprite-frame" viewBox="${view.join(" ")}" aria-hidden="true"><svg x="${x}" y="${y}" width="${sheet.cell}" height="${sheet.cell}" viewBox="${x} ${y} ${sheet.cell} ${sheet.cell}" overflow="hidden"><image href="${buddyAssets}${pose}.png" width="${sheet.size}" height="${sheet.size}"/></svg></svg>`;
        })
        .join("");
      return `<div class="pose pose-${pose}"><div class="film">${frames}</div></div>`;
    })
    .join("");
  // Imported 2×2 sheets reuse the bundled frame timings; cells read the pose image from --img.
  const cells = '<i class="cell"></i>'.repeat(4);
  const sheets = Object.keys(buddyFrames)
    .map((pose) => `<div class="pose pose-${pose}"><div class="film">${cells}</div></div>`)
    .join("");
  container.innerHTML = `<div class="original character" role="img" aria-label="PocketDev textured mini developer">${poses}</div><div class="sheet character hidden" role="img" aria-label="Your personalized mini avatar">${sheets}</div><img class="custom" alt="Your personalized mini avatar" hidden>`;
};
window.applyMascot = (container, images, state, sheets = {}) => {
  const pose = ["working", "done", "idle"].includes(state) ? state : "waiting";
  container.dataset.state = state;
  const imageFor = (p) => images?.[p] || (p === "idle" ? images?.waiting : undefined);
  const animated = Object.values(sheets || {}).some(Boolean) && Boolean(images?.waiting);
  const custom = container.querySelector(".custom"),
    sheet = container.querySelector(".sheet");
  const image = animated ? undefined : imageFor(pose);
  custom.hidden = !image;
  sheet.classList.toggle("hidden", !animated);
  container.querySelector(".original").classList.toggle("hidden", Boolean(image) || animated);
  if (image && custom.getAttribute("src") !== image) custom.src = image;
  if (animated && sheet.images !== images) {
    sheet.images = images; // A new appearance object means new pose files.
    for (const p of Object.keys(buddyFrames)) {
      const el = sheet.querySelector(`.pose-${p}`);
      el.style.setProperty("--img", `url("${imageFor(p)}")`);
      // A pose given as one still image shows that image in all four frames.
      el.classList.toggle("still", !(images[p] ? sheets[p] : p === "idle" && sheets.waiting));
    }
  }
};
