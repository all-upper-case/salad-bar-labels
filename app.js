const $ = (id) => document.getElementById(id);

const controls = {
  labelWidth: $("labelWidth"),
  labelHeight: $("labelHeight"),
  quantity: $("quantity"),
  seed: $("seed"),
  complexity: $("complexity"),
  ornamentDensity: $("ornamentDensity"),
  innerLineCount: $("innerLineCount"),
  cornerRadius: $("cornerRadius"),
  cornerStyle: $("cornerStyle"),
  symmetry: $("symmetry"),
  sideFeature: $("sideFeature"),
  textStyle: $("textStyle"),
  fillColor: $("fillColor"),
  strokeColor: $("strokeColor"),
  accentColor: $("accentColor"),
  strokeWeight: $("strokeWeight"),
  itemsInput: $("itemsInput"),
  fileInput: $("fileInput"),
  showNames: $("showNames"),
};

const state = {
  labels: [],
  selectedIndex: 0,
};

const SVG_NS = "http://www.w3.org/2000/svg";
const PX_PER_IN = 96;

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  return function rand() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rand, arr) {
  return arr[Math.floor(rand() * arr.length)];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function numberValue(input, fallback) {
  const n = Number(input.value);
  return Number.isFinite(n) ? n : fallback;
}

function getConfig() {
  return {
    widthIn: clamp(numberValue(controls.labelWidth, 2.45), 1, 6),
    heightIn: clamp(numberValue(controls.labelHeight, 1.45), 0.5, 4),
    quantity: Math.round(clamp(numberValue(controls.quantity, 36), 1, 120)),
    seed: controls.seed.value.trim() || "gaucho",
    complexity: numberValue(controls.complexity, 48) / 100,
    ornamentDensity: numberValue(controls.ornamentDensity, 30) / 100,
    innerLineCount: Math.round(numberValue(controls.innerLineCount, 2)),
    cornerRadius: numberValue(controls.cornerRadius, 14) / 100,
    cornerStyle: controls.cornerStyle.value,
    symmetry: controls.symmetry.value,
    sideFeature: controls.sideFeature.value,
    textStyle: controls.textStyle.value,
    fillColor: controls.fillColor.value,
    strokeColor: controls.strokeColor.value,
    accentColor: controls.accentColor.value,
    strokeWeight: clamp(numberValue(controls.strokeWeight, 2), 0.5, 8),
    showNames: controls.showNames.checked,
  };
}

function parseItems() {
  return controls.itemsInput.value
    .split(/\r?\n|,/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function esc(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function roundedRectPath(x, y, w, h, r) {
  r = clamp(r, 0, Math.min(w, h) / 2);
  return [
    `M ${x + r} ${y}`,
    `H ${x + w - r}`,
    `Q ${x + w} ${y} ${x + w} ${y + r}`,
    `V ${y + h - r}`,
    `Q ${x + w} ${y + h} ${x + w - r} ${y + h}`,
    `H ${x + r}`,
    `Q ${x} ${y + h} ${x} ${y + h - r}`,
    `V ${y + r}`,
    `Q ${x} ${y} ${x + r} ${y}`,
    "Z",
  ].join(" ");
}

function chamferRectPath(x, y, w, h, c) {
  c = clamp(c, 0, Math.min(w, h) / 2.4);
  return [
    `M ${x + c} ${y}`,
    `H ${x + w - c}`,
    `L ${x + w} ${y + c}`,
    `V ${y + h - c}`,
    `L ${x + w - c} ${y + h}`,
    `H ${x + c}`,
    `L ${x} ${y + h - c}`,
    `V ${y + c}`,
    `L ${x + c} ${y}`,
    "Z",
  ].join(" ");
}

function basePath(config, variant) {
  const rand = mulberry32(hashString(`${config.seed}:${variant}:base`));
  const w = config.widthIn * PX_PER_IN;
  const h = config.heightIn * PX_PER_IN;
  const margin = Math.min(w, h) * 0.08;
  const x = margin;
  const y = margin;
  const bw = w - margin * 2;
  const bh = h - margin * 2;
  const c = Math.min(bw, bh) * (0.08 + config.cornerRadius * 0.28);
  const style = config.cornerStyle === "mixed" ? pick(rand, ["rounded", "chamfered"]) : config.cornerStyle;
  let d = style === "chamfered" ? chamferRectPath(x, y, bw, bh, c) : roundedRectPath(x, y, bw, bh, c);

  const feature = config.sideFeature === "mixed" ? pick(rand, ["tabs", "notches", "scallops", "none"]) : config.sideFeature;
  const strength = Math.min(w, h) * (0.06 + config.complexity * 0.09);
  const midY = y + bh / 2;
  const midX = x + bw / 2;
  const topFeature = rand() < config.complexity;
  const sideFeature = feature !== "none" && rand() < 0.95;

  if (!sideFeature && !topFeature) return d;

  const leftBump = feature === "notches" ? -strength : strength;
  const rightBump = feature === "notches" ? strength : -strength;
  const scallopCount = feature === "scallops" ? 3 + Math.floor(rand() * 3 + config.complexity * 3) : 1;

  const topDecoration = () => {
    if (!topFeature) return `H ${x + bw - c}`;
    const tw = bw * (0.18 + rand() * 0.18);
    const th = strength * (rand() < 0.5 ? 1 : -1);
    const start = midX - tw / 2;
    const end = midX + tw / 2;
    return [
      `H ${start}`,
      `Q ${midX - tw * 0.25} ${y + th} ${midX} ${y}`,
      `Q ${midX + tw * 0.25} ${y + th} ${end} ${y}`,
      `H ${x + bw - c}`,
    ].join(" ");
  };

  const sideDecoration = (side) => {
    if (!sideFeature) return side === "right" ? `V ${y + bh - c}` : `V ${y + c}`;
    const bump = side === "right" ? rightBump : leftBump;
    const sx = side === "right" ? x + bw : x;
    const y1 = y + bh * 0.33;
    const y2 = y + bh * 0.67;
    const dir = side === "right" ? 1 : -1;

    if (feature === "tabs" || feature === "notches") {
      return side === "right"
        ? `V ${y1} Q ${sx + bump * dir} ${midY} ${sx} ${y2} V ${y + bh - c}`
        : `V ${y2} Q ${sx - bump * dir} ${midY} ${sx} ${y1} V ${y + c}`;
    }

    const parts = [];
    const step = (y2 - y1) / scallopCount;
    if (side === "right") {
      parts.push(`V ${y1}`);
      for (let i = 0; i < scallopCount; i += 1) {
        const a = y1 + i * step;
        const b = a + step;
        parts.push(`Q ${sx + strength * 0.75} ${(a + b) / 2} ${sx} ${b}`);
      }
      parts.push(`V ${y + bh - c}`);
    } else {
      parts.push(`V ${y2}`);
      for (let i = scallopCount; i > 0; i -= 1) {
        const b = y1 + i * step;
        const a = b - step;
        parts.push(`Q ${sx - strength * 0.75} ${(a + b) / 2} ${sx} ${a}`);
      }
      parts.push(`V ${y + c}`);
    }
    return parts.join(" ");
  };

  if (style === "chamfered") {
    d = [
      `M ${x + c} ${y}`,
      topDecoration(),
      `L ${x + bw} ${y + c}`,
      sideDecoration("right"),
      `L ${x + bw - c} ${y + bh}`,
      `H ${x + c}`,
      `L ${x} ${y + bh - c}`,
      sideDecoration("left"),
      `L ${x + c} ${y}`,
      "Z",
    ].join(" ");
  } else {
    d = [
      `M ${x + c} ${y}`,
      topDecoration(),
      `Q ${x + bw} ${y} ${x + bw} ${y + c}`,
      sideDecoration("right"),
      `Q ${x + bw} ${y + bh} ${x + bw - c} ${y + bh}`,
      `H ${x + c}`,
      `Q ${x} ${y + bh} ${x} ${y + bh - c}`,
      sideDecoration("left"),
      `Q ${x} ${y} ${x + c} ${y}`,
      "Z",
    ].join(" ");
  }

  return d;
}

function ornamentElements(config, variant, w, h) {
  const rand = mulberry32(hashString(`${config.seed}:${variant}:ornaments`));
  const density = config.ornamentDensity;
  const count = Math.round(density * 10 + config.complexity * 8);
  if (count <= 0) return "";

  const pieces = [];
  const cornerSets = [
    { x: w * 0.17, y: h * 0.22, sx: 1, sy: 1 },
    { x: w * 0.83, y: h * 0.22, sx: -1, sy: 1 },
    { x: w * 0.17, y: h * 0.78, sx: 1, sy: -1 },
    { x: w * 0.83, y: h * 0.78, sx: -1, sy: -1 },
  ];
  const active = cornerSets.filter(() => rand() < 0.45 + density * 0.35);

  active.forEach((corner) => {
    const localCount = Math.max(2, Math.round(count / Math.max(1, active.length)));
    for (let i = 0; i < localCount; i += 1) {
      const t = i / Math.max(1, localCount - 1);
      const x = corner.x + corner.sx * t * w * 0.09;
      const y = corner.y + corner.sy * Math.sin(t * Math.PI) * h * 0.08 + corner.sy * t * h * 0.08;
      const r = 1.4 + rand() * 2.4;
      if (rand() < 0.62) {
        pieces.push(`<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${r.toFixed(2)}" fill="none" stroke="${config.strokeColor}" stroke-width="1" />`);
      } else {
        pieces.push(`<path d="M ${x.toFixed(2)} ${y.toFixed(2)} q ${(corner.sx * 8).toFixed(2)} ${(-corner.sy * 5).toFixed(2)} ${(corner.sx * 16).toFixed(2)} 0" fill="none" stroke="${config.strokeColor}" stroke-width="1.25" stroke-linecap="round" />`);
      }
    }
  });

  return pieces.join("\n");
}

function textElement(config, text, w, h) {
  if (!config.showNames || !text) return "";
  const words = text.split(/\s+/).filter(Boolean);
  const line1 = [];
  const line2 = [];
  words.forEach((word, index) => {
    const target = index < Math.ceil(words.length / 2) || line2.join(" ").length > line1.join(" ").length;
    (target ? line1 : line2).push(word);
  });
  const lines = line2.length ? [line1.join(" "), line2.join(" ")] : [text];

  const styleMap = {
    classic: { family: "Georgia, 'Times New Roman', serif", weight: 500, transform: "none" },
    bold: { family: "Georgia, 'Times New Roman', serif", weight: 800, transform: "none" },
    smallcaps: { family: "Georgia, 'Times New Roman', serif", weight: 500, transform: "uppercase" },
    sans: { family: "Arial, Helvetica, sans-serif", weight: 700, transform: "none" },
  };
  const style = styleMap[config.textStyle] || styleMap.classic;
  const transformed = lines.map((line) => (style.transform === "uppercase" ? line.toUpperCase() : line));
  const longest = transformed.reduce((max, line) => Math.max(max, line.length), 1);
  const fontSize = clamp((w * 0.78) / (longest * 0.54), h * 0.18, h * 0.32);
  const lineHeight = fontSize * 1.05;
  const startY = h / 2 - ((transformed.length - 1) * lineHeight) / 2 + fontSize * 0.35;

  return `<text x="${w / 2}" y="${startY}" text-anchor="middle" font-family="${style.family}" font-weight="${style.weight}" font-size="${fontSize.toFixed(2)}" fill="#111">${transformed
    .map((line, i) => `<tspan x="${w / 2}" dy="${i === 0 ? 0 : lineHeight.toFixed(2)}">${esc(line)}</tspan>`)
    .join("")}</text>`;
}

function makeLabelSvg(config, variant, name = "") {
  const w = config.widthIn * PX_PER_IN;
  const h = config.heightIn * PX_PER_IN;
  const innerLines = [];
  const maxInner = clamp(config.innerLineCount, 0, 4);

  for (let i = 0; i < maxInner; i += 1) {
    const inset = Math.min(w, h) * (0.13 + i * 0.055);
    const strokeOpacity = 0.75 - i * 0.12;
    const r = Math.min(w, h) * (0.055 + config.cornerRadius * 0.13);
    innerLines.push(`<path d="${roundedRectPath(inset, inset, w - inset * 2, h - inset * 2, r)}" fill="none" stroke="${i % 2 ? config.accentColor : config.strokeColor}" stroke-width="${Math.max(0.75, config.strokeWeight * 0.45).toFixed(2)}" opacity="${strokeOpacity.toFixed(2)}" />`);
  }

  const outerPath = basePath(config, variant);
  const ornaments = ornamentElements(config, variant, w, h);
  const text = textElement(config, name, w, h);

  return `<svg xmlns="${SVG_NS}" width="${config.widthIn}in" height="${config.heightIn}in" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(name || `Label ${variant + 1}`)}">
  <rect width="100%" height="100%" fill="white" opacity="0" />
  <path d="${outerPath}" fill="${config.fillColor}" stroke="${config.strokeColor}" stroke-width="${config.strokeWeight}" />
  ${innerLines.join("\n  ")}
  ${ornaments}
  ${text}
</svg>`;
}

function generateLabels() {
  const config = getConfig();
  const items = parseItems();
  state.labels = Array.from({ length: config.quantity }, (_, i) => ({
    index: i,
    name: items[i % Math.max(1, items.length)] || "",
    svg: makeLabelSvg(config, i, items[i % Math.max(1, items.length)] || ""),
  }));
  state.selectedIndex = Math.min(state.selectedIndex, state.labels.length - 1);
  renderPreview();
}

function renderPreview() {
  const grid = $("previewGrid");
  const template = $("labelCardTemplate");
  grid.innerHTML = "";
  state.labels.forEach((label) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.classList.toggle("selected", label.index === state.selectedIndex);
    node.querySelector(".label-meta").innerHTML = `<span>S${String(label.index + 1).padStart(2, "0")}</span><span>${esc(label.name || "Blank sample")}</span>`;
    node.querySelector(".label-svg-wrap").innerHTML = label.svg;
    node.addEventListener("click", () => {
      state.selectedIndex = label.index;
      renderPreview();
    });
    grid.appendChild(node);
  });
  $("statusText").textContent = `${state.labels.length} labels generated. Selected S${String(state.selectedIndex + 1).padStart(2, "0")}.`;
}

function downloadText(filename, mime, text) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function downloadSelectedSvg() {
  const label = state.labels[state.selectedIndex];
  if (!label) return;
  const safeName = (label.name || `label-${label.index + 1}`).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  downloadText(`${safeName || "label"}.svg`, "image/svg+xml", label.svg);
}

function makeSheetSvg() {
  const config = getConfig();
  const cols = 3;
  const gapIn = 0.2;
  const marginIn = 0.35;
  const rows = Math.ceil(state.labels.length / cols);
  const sheetW = 8.5;
  const sheetH = Math.max(11, marginIn * 2 + rows * config.heightIn + Math.max(0, rows - 1) * gapIn);
  const labelWpx = config.widthIn * PX_PER_IN;
  const labelHpx = config.heightIn * PX_PER_IN;
  const sheetWpx = sheetW * PX_PER_IN;
  const sheetHpx = sheetH * PX_PER_IN;
  const gapPx = gapIn * PX_PER_IN;
  const marginPx = marginIn * PX_PER_IN;
  const totalGridW = cols * labelWpx + (cols - 1) * gapPx;
  const startX = (sheetWpx - totalGridW) / 2;

  const content = state.labels
    .map((label, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (labelWpx + gapPx);
      const y = marginPx + row * (labelHpx + gapPx);
      const inner = label.svg.replace(/<svg[^>]*>|<\/svg>/g, "");
      return `<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)})">${inner}</g>`;
    })
    .join("\n");

  return `<svg xmlns="${SVG_NS}" width="${sheetW}in" height="${sheetH}in" viewBox="0 0 ${sheetWpx} ${sheetHpx}">
  <rect width="100%" height="100%" fill="white" />
  ${content}
</svg>`;
}

function downloadSheetSvg() {
  if (!state.labels.length) return;
  downloadText("gaucho-salad-bar-label-sheet.svg", "image/svg+xml", makeSheetSvg());
}

function openPrintSheet() {
  if (!state.labels.length) return;
  const config = getConfig();
  const html = `<!doctype html><html><head><title>Gaucho Salad Bar Labels</title><style>
    @page { size: letter; margin: 0.35in; }
    body { margin: 0; font-family: Georgia, 'Times New Roman', serif; }
    .sheet { display: grid; grid-template-columns: repeat(3, ${config.widthIn}in); gap: 0.2in; justify-content: center; align-content: start; }
    .label { width: ${config.widthIn}in; height: ${config.heightIn}in; break-inside: avoid; page-break-inside: avoid; }
    svg { display: block; width: ${config.widthIn}in; height: ${config.heightIn}in; }
  </style></head><body><div class="sheet">${state.labels.map((label) => `<div class="label">${label.svg}</div>`).join("")}</div><script>window.addEventListener('load', () => setTimeout(() => window.print(), 150));<\/script></body></html>`;
  const win = window.open("", "_blank");
  if (!win) {
    alert("Popup blocked. Please allow popups for this page to open the print sheet.");
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}

function bindRangeValue(input, output) {
  const update = () => {
    output.textContent = input.value;
  };
  input.addEventListener("input", update);
  update();
}

function setupEvents() {
  $("generateBtn").addEventListener("click", generateLabels);
  $("randomizeSeedBtn").addEventListener("click", () => {
    controls.seed.value = `gaucho-${Math.floor(Math.random() * 999999)}`;
    generateLabels();
  });
  $("downloadSelectedSvgBtn").addEventListener("click", downloadSelectedSvg);
  $("downloadSheetSvgBtn").addEventListener("click", downloadSheetSvg);
  $("printSheetBtn").addEventListener("click", openPrintSheet);
  controls.showNames.addEventListener("change", generateLabels);

  [
    controls.labelWidth,
    controls.labelHeight,
    controls.quantity,
    controls.complexity,
    controls.ornamentDensity,
    controls.innerLineCount,
    controls.cornerRadius,
    controls.cornerStyle,
    controls.symmetry,
    controls.sideFeature,
    controls.textStyle,
    controls.fillColor,
    controls.strokeColor,
    controls.accentColor,
    controls.strokeWeight,
  ].forEach((control) => control.addEventListener("change", generateLabels));

  controls.fileInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    controls.itemsInput.value = text
      .split(/\r?\n/)
      .map((line) => line.split(",")[0]?.trim() || "")
      .filter(Boolean)
      .join("\n");
    generateLabels();
  });

  bindRangeValue(controls.complexity, $("complexityValue"));
  bindRangeValue(controls.ornamentDensity, $("ornamentDensityValue"));
  bindRangeValue(controls.innerLineCount, $("innerLineCountValue"));
  bindRangeValue(controls.cornerRadius, $("cornerRadiusValue"));
}

setupEvents();
generateLabels();
