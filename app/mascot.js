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
  container.innerHTML = `<div class="original character" role="img" aria-label="PocketDev textured mini developer">${poses}</div><img class="custom" alt="Your personalized mini avatar" hidden>`;
};
window.applyMascot = (container, images, state) => {
  const pose = ["working", "done", "idle"].includes(state) ? state : "waiting";
  container.dataset.state = state;
  const custom = container.querySelector(".custom");
  const image =
    images?.[pose] || (pose === "idle" ? images?.waiting : undefined);
  custom.hidden = !image;
  container
    .querySelector(".original")
    .classList.toggle("hidden", Boolean(image));
  if (image && custom.getAttribute("src") !== image) custom.src = image;
};
