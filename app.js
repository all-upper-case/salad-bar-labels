const $ = (id) => document.getElementById(id);
const PX = 96;
const NS = "http://www.w3.org/2000/svg";
const state = { labels: [], selectedIndex: 0, draft: null, drag: null };

const c = {
  labelWidth: $("labelWidth"), labelHeight: $("labelHeight"), quantity: $("quantity"), seed: $("seed"),
  complexity: $("complexity"), ornamentDensity: $("ornamentDensity"), innerLineCount: $("innerLineCount"), cornerRadius: $("cornerRadius"),
  cornerStyle: $("cornerStyle"), symmetry: $("symmetry"), sideFeature: $("sideFeature"), textStyle: $("textStyle"),
  fillColor: $("fillColor"), strokeColor: $("strokeColor"), accentColor: $("accentColor"), strokeWeight: $("strokeWeight"),
  itemsInput: $("itemsInput"), fileInput: $("fileInput"), showNames: $("showNames"),
};

const e = {
  overlay: $("editorOverlay"), canvas: $("editCanvas"), text: $("editText"), fontSize: $("editFontSize"),
  fontSizeValue: $("editFontSizeValue"), textX: $("editTextX"), textXValue: $("editTextXValue"),
  textY: $("editTextY"), textYValue: $("editTextYValue"), fontStyle: $("editFontStyle"),
};

function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { return () => { let t = seed += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function pick(r, a) { return a[Math.floor(r() * a.length)]; }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function n(el, d) { const v = Number(el?.value); return Number.isFinite(v) ? v : d; }
function esc(s) { return String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;"); }
function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

function config() {
  return {
    widthIn: clamp(n(c.labelWidth, 2.45), 1, 6), heightIn: clamp(n(c.labelHeight, 1.45), .5, 4),
    quantity: Math.round(clamp(n(c.quantity, 36), 1, 120)), seed: c.seed.value.trim() || "gaucho",
    complexity: n(c.complexity, 45) / 100, detail: n(c.ornamentDensity, 22) / 100,
    innerLineCount: Math.round(clamp(n(c.innerLineCount, 2), 0, 4)), cornerRadius: n(c.cornerRadius, 14) / 100,
    cornerStyle: c.cornerStyle.value, symmetry: c.symmetry.value, sideFeature: c.sideFeature.value, textStyle: c.textStyle.value,
    fillColor: c.fillColor.value, strokeColor: c.strokeColor.value, accentColor: c.accentColor.value,
    strokeWeight: clamp(n(c.strokeWeight, 2), .5, 8), showNames: c.showNames.checked,
  };
}

function items() { return c.itemsInput.value.split(/\r?\n|,/).map(x => x.trim()).filter(Boolean); }
function rr(x, y, w, h, r) { r = clamp(r, 0, Math.min(w, h) / 2); return `M ${x+r} ${y} H ${x+w-r} Q ${x+w} ${y} ${x+w} ${y+r} V ${y+h-r} Q ${x+w} ${y+h} ${x+w-r} ${y+h} H ${x+r} Q ${x} ${y+h} ${x} ${y+h-r} V ${y+r} Q ${x} ${y} ${x+r} ${y} Z`; }

function makeParams(g, i) {
  const r = rng(hash(`${g.seed}:${i}:shape`));
  const w = g.widthIn * PX, h = g.heightIn * PX, m = Math.min(w, h) * .085;
  const style = g.cornerStyle === "mixed" ? pick(r, ["rounded", "rounded", "chamfered"]) : g.cornerStyle;
  const family = g.sideFeature === "mixed" ? pick(r, ["none", "tabs", "notches", "scallops", "points", "tabs", "notches"]) : g.sideFeature;
  const amp = Math.min(w, h) * (.035 + g.complexity * .10);
  const topAmp = r() < g.complexity * .9 ? amp * pick(r, [-1, -1, 1]) : 0;
  const bottomAmp = g.symmetry === "both" ? -topAmp : (r() < g.complexity * .55 ? amp * pick(r, [-1, 1]) : 0);
  const sideAmp = family === "none" ? 0 : amp * (family === "notches" ? -0.75 : 1);
  return { x: m, y: m, bw: w - 2*m, bh: h - 2*m, corner: Math.min(w, h) * (.07 + g.cornerRadius * .34), style, family, topAmp, bottomAmp, leftAmp: sideAmp, rightAmp: sideAmp, detailSeed: hash(`${g.seed}:${i}:detail`) };
}

function sideSeg(p, side) {
  const right = side === "r", sx = right ? p.x + p.bw : p.x, sign = right ? 1 : -1;
  const y1 = p.y + p.bh * .32, y2 = p.y + p.bh * .68, mid = p.y + p.bh / 2;
  const amp = right ? p.rightAmp : p.leftAmp;
  if (p.family === "none" || Math.abs(amp) < .5) return right ? `V ${p.y+p.bh-p.corner}` : `V ${p.y+p.corner}`;
  if (p.family === "points") return right ? `V ${mid-Math.abs(amp)*.45} L ${sx+sign*amp} ${mid} L ${sx} ${mid+Math.abs(amp)*.45} V ${p.y+p.bh-p.corner}` : `V ${mid+Math.abs(amp)*.45} L ${sx-sign*amp} ${mid} L ${sx} ${mid-Math.abs(amp)*.45} V ${p.y+p.corner}`;
  if (p.family === "scallops") {
    const count = 4;
    let out = right ? `V ${y1}` : `V ${y2}`;
    for (let i = 0; i < count; i++) {
      const a = y1 + (right ? i : count-i) * (y2-y1)/count;
      const b = y1 + (right ? i+1 : count-i-1) * (y2-y1)/count;
      out += ` Q ${sx+sign*amp*.55} ${(a+b)/2} ${sx} ${b}`;
    }
    return out + (right ? ` V ${p.y+p.bh-p.corner}` : ` V ${p.y+p.corner}`);
  }
  return right ? `V ${y1} Q ${sx+sign*amp} ${mid} ${sx} ${y2} V ${p.y+p.bh-p.corner}` : `V ${y2} Q ${sx-sign*amp} ${mid} ${sx} ${y1} V ${p.y+p.corner}`;
}

function outerPath(p) {
  const cr = clamp(p.corner, 0, Math.min(p.bw, p.bh)/2.25), mx = p.x + p.bw/2;
  const top = Math.abs(p.topAmp) > .5 ? `H ${mx-p.bw*.09} Q ${mx} ${p.y+p.topAmp} ${mx+p.bw*.09} ${p.y} H ${p.x+p.bw-cr}` : `H ${p.x+p.bw-cr}`;
  const bottom = Math.abs(p.bottomAmp) > .5 ? `H ${mx+p.bw*.09} Q ${mx} ${p.y+p.bh+p.bottomAmp} ${mx-p.bw*.09} ${p.y+p.bh} H ${p.x+cr}` : `H ${p.x+cr}`;
  if (p.style === "chamfered") return `M ${p.x+cr} ${p.y} ${top} L ${p.x+p.bw} ${p.y+cr} ${sideSeg(p,"r")} L ${p.x+p.bw-cr} ${p.y+p.bh} ${bottom} L ${p.x} ${p.y+p.bh-cr} ${sideSeg(p,"l")} L ${p.x+cr} ${p.y} Z`;
  return `M ${p.x+cr} ${p.y} ${top} Q ${p.x+p.bw} ${p.y} ${p.x+p.bw} ${p.y+cr} ${sideSeg(p,"r")} Q ${p.x+p.bw} ${p.y+p.bh} ${p.x+p.bw-cr} ${p.y+p.bh} ${bottom} Q ${p.x} ${p.y+p.bh} ${p.x} ${p.y+p.bh-cr} ${sideSeg(p,"l")} Q ${p.x} ${p.y} ${p.x+cr} ${p.y} Z`;
}

function borderDetails(g, label) {
  const w = g.widthIn*PX, h = g.heightIn*PX, r = rng(label.params.detailSeed), out = [];
  const levels = Math.max(0, Math.round(g.detail * 5));
  for (let j = 0; j < levels; j++) {
    const inset = Math.min(w,h)*(.12 + j*.055), rad = Math.min(w,h)*(.045 + g.cornerRadius*.12);
    const dash = r() < g.detail*.35 ? ` stroke-dasharray="${2+j} ${3+j}"` : "";
    out.push(`<path d="${rr(inset,inset,w-2*inset,h-2*inset,rad)}" fill="none" stroke="${j%2 ? g.accentColor : g.strokeColor}" stroke-width="${Math.max(.7,g.strokeWeight*.35)}" opacity="${(.72-j*.09).toFixed(2)}"${dash}/>`);
  }
  return out.join("\n");
}

function labelText(g, label) {
  if (!g.showNames || !label.name) return "";
  const w = g.widthIn*PX, h = g.heightIn*PX, words = label.name.split(/\s+/), lines = [];
  let cur = "";
  words.forEach(word => { const next = cur ? `${cur} ${word}` : word; if (next.length > 16 && cur) { lines.push(cur); cur = word; } else cur = next; });
  if (cur) lines.push(cur);
  const out = lines.length > 3 ? [words.slice(0, Math.ceil(words.length/2)).join(" "), words.slice(Math.ceil(words.length/2)).join(" ")] : lines;
  const styleName = label.textStyle || g.textStyle;
  const fonts = { classic:["Georgia, 'Times New Roman', serif",600,s=>s], bold:["Georgia, 'Times New Roman', serif",800,s=>s], smallcaps:["Georgia, 'Times New Roman', serif",600,s=>s.toUpperCase()], sans:["Arial, Helvetica, sans-serif",750,s=>s] };
  const [fam, weight, tx] = fonts[styleName] || fonts.classic, display = out.map(tx);
  const longest = Math.max(1, ...display.map(s => s.length));
  const base = clamp((w*.58)/(longest*.48), h*.13, h*.245);
  const fs = base * (label.textScale ?? 1), lh = fs*1.08;
  const x = w/2 + (label.textX || 0), y0 = h/2 + (label.textY || 0) - (display.length-1)*lh/2 + fs*.34;
  return `<text x="${x}" y="${y0}" text-anchor="middle" font-family="${fam}" font-weight="${weight}" font-size="${fs.toFixed(2)}" fill="#111">${display.map((line,j)=>`<tspan x="${x}" dy="${j?lh.toFixed(2):0}">${esc(line)}</tspan>`).join("")}</text>`;
}

function makeSvg(g, label) {
  const w = g.widthIn*PX, h = g.heightIn*PX;
  return `<svg xmlns="${NS}" width="${g.widthIn}in" height="${g.heightIn}in" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label.name || `Label ${label.index+1}`)}">
<rect width="100%" height="100%" fill="white" opacity="0"/>
<path d="${outerPath(label.params)}" fill="${g.fillColor}" stroke="${g.strokeColor}" stroke-width="${g.strokeWeight}"/>
${borderDetails(g,label)}
${labelText(g,label)}
</svg>`;
}

function refreshSvg(label) { label.svg = makeSvg(config(), label); }
function generate() {
  const g = config(), list = items(), names = list.length ? list : [""];
  state.labels = Array.from({length:g.quantity}, (_,i) => { const label = { index:i, name:names[i%names.length], textX:0, textY:0, textScale:1, textStyle:g.textStyle, params:makeParams(g,i) }; refreshSvg(label); return label; });
  state.selectedIndex = clamp(state.selectedIndex, 0, state.labels.length-1);
  render();
}

function render() {
  const grid = $("previewGrid"), tpl = $("labelCardTemplate"); grid.innerHTML = "";
  state.labels.forEach(label => { refreshSvg(label); const node = tpl.content.firstElementChild.cloneNode(true); node.classList.toggle("selected", label.index === state.selectedIndex); node.querySelector(".label-meta").innerHTML = `<span>S${String(label.index+1).padStart(2,"0")}</span><span>${esc(label.name||"Blank sample")}</span>`; node.querySelector(".label-svg-wrap").innerHTML = label.svg; node.onclick = () => { state.selectedIndex = label.index; render(); }; grid.appendChild(node); });
  const first = state.labels[state.selectedIndex], live = $("liveSample"); if (live && first) live.innerHTML = first.svg;
  $("statusText").textContent = `${state.labels.length} labels generated. Selected S${String(state.selectedIndex+1).padStart(2,"0")}.`;
}

function handlePositions(label) {
  const p = label.params, w = config().widthIn*PX, h = config().heightIn*PX;
  return [
    ["tl",p.x,p.y],["tr",p.x+p.bw,p.y],["bl",p.x,p.y+p.bh],["br",p.x+p.bw,p.y+p.bh],
    ["top",p.x+p.bw/2,p.y+p.topAmp],["bottom",p.x+p.bw/2,p.y+p.bh+p.bottomAmp],
    ["left",p.x-p.leftAmp,p.y+p.bh/2],["right",p.x+p.bw+p.rightAmp,p.y+p.bh/2],
    ["text",w/2+(label.textX||0),h/2+(label.textY||0)]
  ];
}

function editorSvg(label) {
  const g = config(), w = g.widthIn*PX, h = g.heightIn*PX;
  const handles = handlePositions(label).map(([id,x,y]) => `<circle class="edit-handle ${id==='text'?'text-handle':''}" data-handle="${id}" cx="${x}" cy="${y}" r="6"/>`).join("\n");
  return `<svg id="editSvg" xmlns="${NS}" viewBox="0 0 ${w} ${h}">${label.svg.replace(/<svg[^>]*>/,"").replace("</svg>","")}<path class="edit-outline" d="${outerPath(label.params)}"/>${handles}</svg>`;
}

function syncEditorInputs(label) {
  e.text.value = label.name || ""; e.fontSize.value = Math.round((label.textScale ?? 1) * 100); e.textX.value = Math.round(label.textX || 0); e.textY.value = Math.round(label.textY || 0); e.fontStyle.value = label.textStyle || config().textStyle;
  e.fontSizeValue.textContent = e.fontSize.value; e.textXValue.textContent = e.textX.value; e.textYValue.textContent = e.textY.value;
}

function renderEditor() {
  if (!state.draft) return;
  refreshSvg(state.draft); syncEditorInputs(state.draft); e.canvas.innerHTML = editorSvg(state.draft);
  const svg = $("editSvg");
  svg.querySelectorAll(".edit-handle").forEach(h => h.addEventListener("pointerdown", startDrag));
}

function openEditor() { const label = state.labels[state.selectedIndex]; if (!label) return; state.draft = clone(label); e.overlay.hidden = false; renderEditor(); }
function closeEditor() { state.draft = null; e.overlay.hidden = true; }
function saveEditor() { if (!state.draft) return; state.labels[state.selectedIndex] = clone(state.draft); state.labels[state.selectedIndex].index = state.selectedIndex; closeEditor(); render(); }
function resetSelected() { const g = config(), label = state.labels[state.selectedIndex]; if (!label) return; label.params = makeParams(g,label.index); label.textX=0; label.textY=0; label.textScale=1; label.textStyle=g.textStyle; refreshSvg(label); render(); }

function svgPoint(evt) {
  const svg = $("editSvg"), pt = svg.createSVGPoint(); pt.x = evt.clientX; pt.y = evt.clientY; return pt.matrixTransform(svg.getScreenCTM().inverse());
}
function startDrag(evt) { evt.preventDefault(); evt.target.setPointerCapture(evt.pointerId); state.drag = evt.target.dataset.handle; evt.target.addEventListener("pointermove", dragMove); evt.target.addEventListener("pointerup", endDrag); evt.target.addEventListener("pointercancel", endDrag); }
function endDrag(evt) { evt.target.releasePointerCapture?.(evt.pointerId); evt.target.removeEventListener("pointermove", dragMove); state.drag = null; renderEditor(); }
function dragMove(evt) {
  if (!state.draft || !state.drag) return;
  const q = svgPoint(evt), p = state.draft.params, minW = config().widthIn*PX*.35, minH = config().heightIn*PX*.35, maxAmpX = config().widthIn*PX*.18, maxAmpY = config().heightIn*PX*.24;
  if (state.drag === "text") { state.draft.textX = clamp(q.x - config().widthIn*PX/2, -80, 80); state.draft.textY = clamp(q.y - config().heightIn*PX/2, -60, 60); }
  if (state.drag === "top") p.topAmp = clamp(q.y - p.y, -maxAmpY, maxAmpY);
  if (state.drag === "bottom") p.bottomAmp = clamp(q.y - (p.y+p.bh), -maxAmpY, maxAmpY);
  if (state.drag === "left") p.leftAmp = clamp(p.x - q.x, -maxAmpX, maxAmpX);
  if (state.drag === "right") p.rightAmp = clamp(q.x - (p.x+p.bw), -maxAmpX, maxAmpX);
  if (state.drag === "tl") { const nx = clamp(q.x, 4, p.x+p.bw-minW), ny = clamp(q.y, 4, p.y+p.bh-minH); p.bw += p.x-nx; p.bh += p.y-ny; p.x = nx; p.y = ny; }
  if (state.drag === "tr") { const nr = clamp(q.x, p.x+minW, config().widthIn*PX-4), ny = clamp(q.y, 4, p.y+p.bh-minH); p.bw = nr-p.x; p.bh += p.y-ny; p.y = ny; }
  if (state.drag === "bl") { const nx = clamp(q.x, 4, p.x+p.bw-minW), nb = clamp(q.y, p.y+minH, config().heightIn*PX-4); p.bw += p.x-nx; p.x = nx; p.bh = nb-p.y; }
  if (state.drag === "br") { p.bw = clamp(q.x-p.x, minW, config().widthIn*PX-p.x-4); p.bh = clamp(q.y-p.y, minH, config().heightIn*PX-p.y-4); }
  refreshSvg(state.draft); e.canvas.innerHTML = editorSvg(state.draft); $("editSvg").querySelectorAll(".edit-handle").forEach(h => h.addEventListener("pointerdown", startDrag));
}

function editorInputChanged() { if (!state.draft) return; state.draft.name = e.text.value; state.draft.textScale = n(e.fontSize,100)/100; state.draft.textX = n(e.textX,0); state.draft.textY = n(e.textY,0); state.draft.textStyle = e.fontStyle.value; renderEditor(); }
function download(filename, mime, text) { const b = new Blob([text], {type:mime}), u = URL.createObjectURL(b), a = document.createElement("a"); a.href=u; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(u); }
function selectedSvg() { const l = state.labels[state.selectedIndex]; if (!l) return; refreshSvg(l); const safe = (l.name || `label-${l.index+1}`).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"") || "label"; download(`${safe}.svg`, "image/svg+xml", l.svg); }
function sheetSvg() { const g = config(), cols=3, gap=.2, margin=.35, rows=Math.ceil(state.labels.length/cols), W=8.5, H=Math.max(11, margin*2+rows*g.heightIn+Math.max(0,rows-1)*gap); const lw=g.widthIn*PX, lh=g.heightIn*PX, gp=gap*PX, start=(W*PX-(cols*lw+(cols-1)*gp))/2; const body=state.labels.map((l,i)=>{refreshSvg(l); return `<g transform="translate(${(start+(i%cols)*(lw+gp)).toFixed(2)} ${(margin*PX+Math.floor(i/cols)*(lh+gp)).toFixed(2)})">${l.svg.replace(/<svg[^>]*>/,"").replace("</svg>","")}</g>`}).join("\n"); return `<svg xmlns="${NS}" width="${W}in" height="${H}in" viewBox="0 0 ${W*PX} ${H*PX}"><rect width="100%" height="100%" fill="white"/>${body}</svg>`; }
function downloadSheet() { download("gaucho-salad-bar-label-sheet.svg", "image/svg+xml", sheetSvg()); }
function printSheet() { const g=config(); const html=`<!doctype html><html><head><title>Gaucho Labels</title><style>@page{size:letter;margin:.35in}body{margin:0}.sheet{display:grid;grid-template-columns:repeat(3,${g.widthIn}in);gap:.2in;justify-content:center}.label,svg{width:${g.widthIn}in;height:${g.heightIn}in;break-inside:avoid}</style></head><body><div class="sheet">${state.labels.map(l=>{refreshSvg(l); return `<div class="label">${l.svg}</div>`}).join("")}</div><script>window.onload=()=>setTimeout(()=>print(),150)<\/script></body></html>`; const win=window.open("","_blank"); if(!win) return alert("Popup blocked. Allow popups to open the print sheet."); win.document.write(html); win.document.close(); }
function bindRange(input, out) { const f=()=>out.textContent=input.value; input.addEventListener("input", f); f(); }
function setup() {
  $("generateBtn").onclick = generate; $("randomizeSeedBtn").onclick = () => { c.seed.value = `gaucho-${Math.floor(Math.random()*999999)}`; generate(); };
  $("downloadSelectedSvgBtn").onclick = selectedSvg; $("downloadSheetSvgBtn").onclick = downloadSheet; $("printSheetBtn").onclick = printSheet; $("editSelectedBtn").onclick = openEditor; $("resetEditBtn").onclick = resetSelected; $("saveEditBtn").onclick = saveEditor; $("cancelEditBtn").onclick = closeEditor; $("cancelEditBtn2").onclick = closeEditor;
  Object.values(c).forEach(el => { if (el && el !== c.fileInput && el !== c.itemsInput) el.addEventListener("change", generate); });
  [e.text,e.fontSize,e.textX,e.textY,e.fontStyle].forEach(el => el.addEventListener("input", editorInputChanged));
  c.fileInput.addEventListener("change", async ev => { const file=ev.target.files?.[0]; if(!file) return; const txt=await file.text(); c.itemsInput.value=txt.split(/\r?\n/).map(line=>line.split(",")[0]?.trim()||"").filter(Boolean).join("\n"); generate(); });
  bindRange(c.complexity, $("complexityValue")); bindRange(c.ornamentDensity, $("ornamentDensityValue")); bindRange(c.innerLineCount, $("innerLineCountValue")); bindRange(c.cornerRadius, $("cornerRadiusValue")); bindRange(e.fontSize, e.fontSizeValue); bindRange(e.textX, e.textXValue); bindRange(e.textY, e.textYValue);
  generate();
}
setup();
