const $ = (id) => document.getElementById(id);
const PX = 96;
const NS = "http://www.w3.org/2000/svg";
const state = { labels: [], selectedIndex: 0 };

const c = {
  labelWidth: $("labelWidth"), labelHeight: $("labelHeight"), quantity: $("quantity"), seed: $("seed"),
  complexity: $("complexity"), ornamentDensity: $("ornamentDensity"), innerLineCount: $("innerLineCount"), cornerRadius: $("cornerRadius"),
  cornerStyle: $("cornerStyle"), symmetry: $("symmetry"), sideFeature: $("sideFeature"), textStyle: $("textStyle"),
  fillColor: $("fillColor"), strokeColor: $("strokeColor"), accentColor: $("accentColor"), strokeWeight: $("strokeWeight"),
  itemsInput: $("itemsInput"), fileInput: $("fileInput"), showNames: $("showNames"),
};

function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { return () => { let t = seed += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function pick(r, a) { return a[Math.floor(r() * a.length)]; }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function n(el, d) { const v = Number(el.value); return Number.isFinite(v) ? v : d; }
function esc(s) { return String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;"); }

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
function cham(x, y, w, h, z) { z = clamp(z, 0, Math.min(w,h)/2.2); return `M ${x+z} ${y} H ${x+w-z} L ${x+w} ${y+z} V ${y+h-z} L ${x+w-z} ${y+h} H ${x+z} L ${x} ${y+h-z} V ${y+z} Z`; }

function sideSegment(k, side, x, y, bw, bh, amp, detail) {
  const right = side === "r", sx = right ? x + bw : x, sign = right ? 1 : -1;
  const y1 = y + bh * .32, y2 = y + bh * .68, mid = y + bh / 2;
  if (k === "none") return right ? `V ${y+bh*.9}` : `V ${y+bh*.1}`;
  if (k === "tabs") return right ? `V ${y1} Q ${sx+sign*amp} ${mid} ${sx} ${y2} V ${y+bh*.9}` : `V ${y2} Q ${sx+sign*amp} ${mid} ${sx} ${y1} V ${y+bh*.1}`;
  if (k === "notches") return right ? `V ${y1} Q ${sx-sign*amp*.85} ${mid} ${sx} ${y2} V ${y+bh*.9}` : `V ${y2} Q ${sx-sign*amp*.85} ${mid} ${sx} ${y1} V ${y+bh*.1}`;
  if (k === "points") return right ? `V ${mid-amp*.45} L ${sx+sign*amp} ${mid} L ${sx} ${mid+amp*.45} V ${y+bh*.9}` : `V ${mid+amp*.45} L ${sx+sign*amp} ${mid} L ${sx} ${mid-amp*.45} V ${y+bh*.1}`;
  const count = 2 + Math.round(detail * 5);
  let out = right ? `V ${y1}` : `V ${y2}`;
  for (let i = 0; i < count; i++) {
    const a = y1 + (right ? i : count-i) * (y2-y1)/count;
    const b = y1 + (right ? i+1 : count-i-1) * (y2-y1)/count;
    out += ` Q ${sx+sign*amp*.55} ${(a+b)/2} ${sx} ${b}`;
  }
  return out + (right ? ` V ${y+bh*.9}` : ` V ${y+bh*.1}`);
}

function outerPath(g, i) {
  const r = rng(hash(`${g.seed}:${i}:shape`)), w = g.widthIn*PX, h = g.heightIn*PX;
  const m = Math.min(w,h)*.085, x=m, y=m, bw=w-2*m, bh=h-2*m;
  const cr = Math.min(bw,bh)*(.07 + g.cornerRadius*.34), amp = Math.min(w,h)*(.035 + g.complexity*.10);
  const style = g.cornerStyle === "mixed" ? pick(r,["rounded","rounded","chamfered"]) : g.cornerStyle;
  const family = g.sideFeature === "mixed" ? pick(r,["none","tabs","notches","scallops","points","tabs","notches"]) : g.sideFeature;
  const top = r() < g.complexity*.9, bottom = g.symmetry === "both" ? top : r() < g.complexity*.55;
  const topMode = pick(r,["arch","dip","peak","double"]), midX = x + bw/2;
  const topSeg = () => {
    if (!top) return `H ${x+bw-cr}`;
    const tw = bw*(.13 + r()*.20), a = amp*(topMode === "dip" ? 1 : -1);
    if (topMode === "peak") return `H ${midX-tw/2} L ${midX} ${y+a} L ${midX+tw/2} ${y} H ${x+bw-cr}`;
    if (topMode === "double") return `H ${midX-tw/2} Q ${midX-tw*.28} ${y+a} ${midX} ${y} Q ${midX+tw*.28} ${y+a} ${midX+tw/2} ${y} H ${x+bw-cr}`;
    return `H ${midX-tw/2} Q ${midX} ${y+a} ${midX+tw/2} ${y} H ${x+bw-cr}`;
  };
  const botSeg = () => bottom ? topSeg().replaceAll(`${y}`, `${y+bh}`).replace(`H ${midX-tw/2}`, "") : `H ${x+cr}`;
  if (style === "chamfered") return `M ${x+cr} ${y} ${topSeg()} L ${x+bw} ${y+cr} ${sideSegment(family,"r",x,y,bw,bh,amp,g.detail)} L ${x+bw-cr} ${y+bh} H ${x+cr} L ${x} ${y+bh-cr} ${sideSegment(family,"l",x,y,bw,bh,amp,g.detail)} L ${x+cr} ${y} Z`;
  return `M ${x+cr} ${y} ${topSeg()} Q ${x+bw} ${y} ${x+bw} ${y+cr} ${sideSegment(family,"r",x,y,bw,bh,amp,g.detail)} Q ${x+bw} ${y+bh} ${x+bw-cr} ${y+bh} H ${x+cr} Q ${x} ${y+bh} ${x} ${y+bh-cr} ${sideSegment(family,"l",x,y,bw,bh,amp,g.detail)} Q ${x} ${y} ${x+cr} ${y} Z`;
}

function borderDetails(g, i, w, h) {
  const r = rng(hash(`${g.seed}:${i}:detail`)), d = [], levels = Math.round(g.detail * 5);
  const sw = Math.max(.7, g.strokeWeight*.35);
  for (let j = 0; j < levels; j++) {
    const inset = Math.min(w,h)*(.105 + j*.055);
    const rad = Math.min(w,h)*(.045 + g.cornerRadius*.12);
    const stroke = j % 2 ? g.accentColor : g.strokeColor;
    const dash = r() < g.detail*.35 ? ` stroke-dasharray="${(2+j).toFixed(1)} ${(3+j).toFixed(1)}"` : "";
    d.push(`<path d="${rr(inset,inset,w-2*inset,h-2*inset,rad)}" fill="none" stroke="${stroke}" stroke-width="${sw}" opacity="${(.72-j*.09).toFixed(2)}"${dash}/>`);
  }
  if (g.detail > .45) {
    const inset = Math.min(w,h)*.18, len = Math.min(w,h)*(.08 + g.detail*.06);
    [[inset,inset,1,1],[w-inset,inset,-1,1],[inset,h-inset,1,-1],[w-inset,h-inset,-1,-1]].forEach(([x,y,sx,sy]) => {
      d.push(`<path d="M ${x} ${y+sy*len} Q ${x} ${y} ${x+sx*len} ${y}" fill="none" stroke="${g.strokeColor}" stroke-width="${sw*1.4}" stroke-linecap="round"/>`);
    });
  }
  return d.join("\n");
}

function labelText(g, text, w, h) {
  if (!g.showNames || !text) return "";
  const words = text.split(/\s+/), lines = [];
  let cur = "";
  words.forEach(word => { const next = cur ? `${cur} ${word}` : word; if (next.length > 16 && cur) { lines.push(cur); cur = word; } else cur = next; });
  if (cur) lines.push(cur);
  const out = lines.length > 3 ? [words.slice(0, Math.ceil(words.length/2)).join(" "), words.slice(Math.ceil(words.length/2)).join(" ")] : lines;
  const fonts = { classic:["Georgia, 'Times New Roman', serif",600,s=>s], bold:["Georgia, 'Times New Roman', serif",800,s=>s], smallcaps:["Georgia, 'Times New Roman', serif",600,s=>s.toUpperCase()], sans:["Arial, Helvetica, sans-serif",750,s=>s] };
  const [fam, weight, tx] = fonts[g.textStyle] || fonts.classic, display = out.map(tx);
  const longest = Math.max(1, ...display.map(s => s.length));
  const fs = clamp((w*.58)/(longest*.48), h*.13, h*.245);
  const lh = fs*1.08, y0 = h/2 - (display.length-1)*lh/2 + fs*.34;
  return `<text x="${w/2}" y="${y0}" text-anchor="middle" font-family="${fam}" font-weight="${weight}" font-size="${fs.toFixed(2)}" fill="#111">${display.map((line,j)=>`<tspan x="${w/2}" dy="${j?lh.toFixed(2):0}">${esc(line)}</tspan>`).join("")}</text>`;
}

function makeSvg(g, i, name="") {
  const w = g.widthIn*PX, h = g.heightIn*PX;
  return `<svg xmlns="${NS}" width="${g.widthIn}in" height="${g.heightIn}in" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(name || `Label ${i+1}`)}">
<rect width="100%" height="100%" fill="white" opacity="0"/>
<path d="${outerPath(g,i)}" fill="${g.fillColor}" stroke="${g.strokeColor}" stroke-width="${g.strokeWeight}"/>
${borderDetails(g,i,w,h)}
${labelText(g,name,w,h)}
</svg>`;
}

function generate() {
  const g = config(), list = items(), names = list.length ? list : [""];
  state.labels = Array.from({length:g.quantity}, (_,i)=>({index:i, name:names[i%names.length], svg:makeSvg(g,i,names[i%names.length])}));
  state.selectedIndex = clamp(state.selectedIndex, 0, state.labels.length-1);
  render();
}

function render() {
  const grid = $("previewGrid"), tpl = $("labelCardTemplate"); grid.innerHTML = "";
  state.labels.forEach(label => {
    const node = tpl.content.firstElementChild.cloneNode(true);
    node.classList.toggle("selected", label.index === state.selectedIndex);
    node.querySelector(".label-meta").innerHTML = `<span>S${String(label.index+1).padStart(2,"0")}</span><span>${esc(label.name||"Blank sample")}</span>`;
    node.querySelector(".label-svg-wrap").innerHTML = label.svg;
    node.onclick = () => { state.selectedIndex = label.index; render(); };
    grid.appendChild(node);
  });
  const first = state.labels[state.selectedIndex];
  const live = $("liveSample");
  if (live && first) live.innerHTML = first.svg;
  $("statusText").textContent = `${state.labels.length} labels generated. Selected S${String(state.selectedIndex+1).padStart(2,"0")}.`;
}

function download(filename, mime, text) { const b = new Blob([text], {type:mime}), u = URL.createObjectURL(b), a = document.createElement("a"); a.href=u; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(u); }
function selectedSvg() { const l = state.labels[state.selectedIndex]; if (!l) return; const safe = (l.name || `label-${l.index+1}`).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"") || "label"; download(`${safe}.svg`, "image/svg+xml", l.svg); }
function sheetSvg() { const g = config(), cols=3, gap=.2, margin=.35, rows=Math.ceil(state.labels.length/cols), W=8.5, H=Math.max(11, margin*2+rows*g.heightIn+Math.max(0,rows-1)*gap); const lw=g.widthIn*PX, lh=g.heightIn*PX, gp=gap*PX, start=(W*PX-(cols*lw+(cols-1)*gp))/2; const body=state.labels.map((l,i)=>`<g transform="translate(${(start+(i%cols)*(lw+gp)).toFixed(2)} ${(margin*PX+Math.floor(i/cols)*(lh+gp)).toFixed(2)})">${l.svg.replace(/<svg[^>]*>/,"").replace("</svg>","")}</g>`).join("\n"); return `<svg xmlns="${NS}" width="${W}in" height="${H}in" viewBox="0 0 ${W*PX} ${H*PX}"><rect width="100%" height="100%" fill="white"/>${body}</svg>`; }
function downloadSheet() { download("gaucho-salad-bar-label-sheet.svg", "image/svg+xml", sheetSvg()); }
function printSheet() { const g=config(); const html=`<!doctype html><html><head><title>Gaucho Labels</title><style>@page{size:letter;margin:.35in}body{margin:0}.sheet{display:grid;grid-template-columns:repeat(3,${g.widthIn}in);gap:.2in;justify-content:center}.label,svg{width:${g.widthIn}in;height:${g.heightIn}in;break-inside:avoid}</style></head><body><div class="sheet">${state.labels.map(l=>`<div class="label">${l.svg}</div>`).join("")}</div><script>window.onload=()=>setTimeout(()=>print(),150)<\/script></body></html>`; const win=window.open("","_blank"); if(!win) return alert("Popup blocked. Allow popups to open the print sheet."); win.document.write(html); win.document.close(); }

function bindRange(input, out) { const f=()=>out.textContent=input.value; input.addEventListener("input", f); f(); }
function setup() {
  $("generateBtn").onclick = generate;
  $("randomizeSeedBtn").onclick = () => { c.seed.value = `gaucho-${Math.floor(Math.random()*999999)}`; generate(); };
  $("downloadSelectedSvgBtn").onclick = selectedSvg; $("downloadSheetSvgBtn").onclick = downloadSheet; $("printSheetBtn").onclick = printSheet;
  Object.values(c).forEach(el => { if (el && el !== c.fileInput && el !== c.itemsInput) el.addEventListener("change", generate); });
  c.fileInput.addEventListener("change", async e => { const file=e.target.files?.[0]; if(!file) return; const txt=await file.text(); c.itemsInput.value=txt.split(/\r?\n/).map(line=>line.split(",")[0]?.trim()||"").filter(Boolean).join("\n"); generate(); });
  bindRange(c.complexity, $("complexityValue")); bindRange(c.ornamentDensity, $("ornamentDensityValue")); bindRange(c.innerLineCount, $("innerLineCountValue")); bindRange(c.cornerRadius, $("cornerRadiusValue"));
  generate();
}
setup();
