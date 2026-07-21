import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync, cpSync } from "node:fs";
import { join, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Portable roots: the Blume project is the folder holding this script; the repo
// is its parent. Overridable via env for local experiments.
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = process.env.UDCSP_REPO || join(HERE, "..");
const OUT = join(HERE, "docs");
const PUBLIC_IMAGES = join(HERE, "public", "images");

// Base path the site is served from on GitHub Pages (project page /UDCSP/).
// Blume prefixes internal doc links with deployment.base automatically, but it
// treats /images/* as root public assets and does NOT prefix them, so we do it
// here. If the repo/Pages path changes, update this one constant.
const BASE = process.env.UDCSP_BASE ?? "/UDCSP";
const img = (p) => `${BASE}${p.startsWith("/") ? "" : "/"}${p}`;

// Wipe any previously generated section folders (keep index.mdx which we author separately)
for (const dir of ["business", "technical"]) {
  const p = join(OUT, dir);
  if (existsSync(p)) rmSync(p, { recursive: true, force: true });
  mkdirSync(p, { recursive: true });
}

// Copy the repo's images/ into public/images so the static build is self
// contained (CI has no pre-staged assets).
mkdirSync(PUBLIC_IMAGES, { recursive: true });
cpSync(join(REPO, "images"), PUBLIC_IMAGES, { recursive: true });

// Title-case a slug for nav labels
function titleFromSlug(slug) {
  return slug
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Tidy a title: drop markdown marks, the redundant "UDCSP — " prefix, and
// turn any remaining dash separator into a colon so labels read cleanly.
function cleanTitle(t) {
  t = t.replace(/[`*]/g, "").trim();
  t = t.replace(/UDCSP\s*[—–-]\s*/i, "");
  t = t.replace(/\s+[—–]\s+/g, ": ");
  return t.trim();
}

// A fallback emoji per slug so every sidebar entry carries an icon.
const ICONS = {
  architecture: "🏛️", agents: "🤖", aibrainetat: "🧠", data: "🗄️",
  network: "🌐", monitoring: "📊", installation: "🛠️", "runbook-dr": "🚑",
  inprogress: "🚧", plan: "🗺️", plan_post_audit: "🧭",
};

// Blume reads a leading emoji in the title as the sidebar icon. If a page's
// title has none, prepend one so the left nav is visually consistent.
function withIcon(title, slug) {
  if (/^\p{Extended_Pictographic}/u.test(title)) return title;
  return `${ICONS[slug] || "📄"} ${title}`;
}

// Prefer an existing frontmatter title, then the first H1, then the slug.
function extractTitle(md, fallback) {
  const fm = md.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (fm) {
    const tl = fm[1].match(/^title:\s*(.+)$/m);
    if (tl) return cleanTitle(tl[1].trim().replace(/^["']|["']$/g, ""));
  }
  const m = md.match(/^\s*#\s+(.+?)\s*$/m);
  if (m) return cleanTitle(m[1]);
  return fallback;
}

// Remove a leading YAML frontmatter block so we can prepend our own.
function stripFrontmatter(md) {
  const fm = md.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  return fm ? md.slice(fm[0].length) : md;
}

// Convert GitHub-style "> [!NOTE]" alerts into Blume ":::note" callouts.
function convertAlerts(md) {
  const map = { NOTE: "note", TIP: "tip", IMPORTANT: "info", WARNING: "warning", CAUTION: "danger" };
  const lines = md.split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(.*)$/i);
    if (!m) { out.push(lines[i]); continue; }
    const type = map[m[1].toUpperCase()] || "note";
    const body = [];
    if (m[2].trim()) body.push(m[2].trim());
    let j = i + 1;
    for (; j < lines.length; j++) {
      const bm = lines[j].match(/^>\s?(.*)$/);
      if (bm === null) break;
      body.push(bm[1]);
    }
    while (body.length && body[0].trim() === "") body.shift();
    while (body.length && body[body.length - 1].trim() === "") body.pop();
    out.push("", `:::${type}`, "", ...body, "", ":::", "");
    i = j - 1;
  }
  return out.join("\n");
}

// Rewrite intra-repo Markdown links (foo.md, ./foo.md, ../tech/foo.md, README.md)
// into Blume routes (/business/foo, /technical/foo, /business, ...).
function rewriteDocLinks(md, section) {
  return md.replace(/\]\(\s*([^)\s]+?\.md)(#[^)]*)?\s*\)/gi, (whole, path, anchor) => {
    anchor = anchor || "";
    let folder = section;
    let m;
    if ((m = path.match(/(?:^|\/)biz\/([^/]+)\.md$/i))) { folder = "business"; path = m[1]; }
    else if ((m = path.match(/(?:^|\/)tech\/([^/]+)\.md$/i))) { folder = "technical"; path = m[1]; }
    else if ((m = path.match(/([^/]+)\.md$/i))) { path = m[1]; }
    else return whole;
    const slug = path.toLowerCase();
    const route = slug === "readme" ? `/${folder}` : `/${folder}/${slug}`;
    return `](${route}${anchor})`;
  });
}

// Curated screenshots woven into the flagship pages so the docs actually show
// the product. Placed near the top of the page unless pos:"end".
const SHOTS = {
  web: {
    title: "📸 The portal in the browser",
    intro:
      "The same front door every citizen sees: a signed-in session with the Citizen Assistant open and the guided journeys in view.",
    imgs: Array.from({ length: 11 }, (_, i) => ({
      src: `/images/screen${i + 1}.png`,
      alt: `UDCSP web portal, view ${i + 1}`,
    })),
  },
  mobile: {
    title: "📸 The mobile app",
    intro: "The native mobile experience: the same identity, channels and AI brain, sized for a phone.",
    imgs: [{ src: "/images/mobile-patchwork.png", alt: "UDCSP mobile app screens" }],
  },
  guardian: {
    title: "📸 How Guardian looks",
    intro:
      "An envisioned Guardian surface layered into the signed-in portal: the proactive assistant reviewing a citizen's entitlements next to their case.",
    imgs: [{ src: "/images/guardian-portal.png", alt: "UDCSP Guardian inside the citizen portal" }],
  },
  personas: {
    title: "📸 The personas at a glance",
    intro: "The cast behind the demo journeys, one identity each across the three countries.",
    imgs: [{ src: "/images/UDCSPv3.png", alt: "UDCSP demo personas across Denmark, Sweden and Norway" }],
  },
  ai: {
    title: "📸 The AI brain, end to end",
    intro: "One entry point, one topic-router, the specialist agents behind it.",
    imgs: [{ src: "/images/ai-brain.png", alt: "UDCSP AI brain architecture" }],
  },
  agents: {
    title: "📸 How the swarm built it",
    intro: "The multi-agent build timeline that produced the platform.",
    imgs: [{ src: "/images/build-timeline.png", alt: "UDCSP multi-agent build timeline" }],
  },
  uses: {
    pos: "end",
    title: "📸 The real-world echo",
    intro:
      "After building all of this, one of us re-registered a car and had to change its plate on the actual French citizen portal. Without ever seeing it first, we had designed something very close to the real thing.",
    imgs: [
      { src: "/images/real1.png", alt: "French citizen portal, vehicle registration step 1" },
      { src: "/images/real2.png", alt: "French citizen portal, vehicle registration step 2" },
      { src: "/images/real3.png", alt: "French citizen portal, vehicle registration step 3" },
    ],
  },
};

// Build a Markdown gallery: a single image, or a 2-column table patchwork.
function gallery(spec) {
  const out = ["", `## ${spec.title}`, ""];
  if (spec.intro) out.push(spec.intro, "");
  const cell = (x) => (x ? `![${x.alt}](${img(x.src)})` : "");
  if (spec.imgs.length === 1) {
    out.push(cell(spec.imgs[0]), "");
  } else {
    out.push("|  |  |", "| --- | --- |");
    for (let i = 0; i < spec.imgs.length; i += 2) {
      out.push(`| ${cell(spec.imgs[i])} | ${cell(spec.imgs[i + 1])} |`);
    }
    out.push("");
  }
  return out.join("\n");
}

// Insert a gallery near the top of a page (right after the intro's horizontal
// rule) so screenshots are visible without scrolling, or at the end if asked.
function placeGallery(body, spec) {
  const g = "\n" + gallery(spec) + "\n";
  if (spec.pos === "end") return body.replace(/\s*$/, "") + "\n" + g + "\n";
  const m = body.match(/\n-{3,}\n/);
  if (m && m.index < 2500) {
    const at = m.index + m[0].length;
    return body.slice(0, at) + g + body.slice(at);
  }
  return g + body;
}// In sequence diagrams, ';' is a statement separator, so a semicolon used as
// prose punctuation inside a message or note silently breaks the whole diagram.
// Swap those for commas (leaving HTML entities like &nbsp; intact).
function sanitizeMermaid(md) {
  return md.replace(/```mermaid\r?\n([\s\S]*?)```/g, (whole, body) => {
    if (!/sequenceDiagram/.test(body)) return whole;
    const fixed = body.replace(/(&#?\w+)?;/g, (s, ent) => (ent ? s : ","));
    return "```mermaid\n" + fixed + "```";
  });
}

// Remove shields.io status badges. They read as noise in a docs-browsing
// experience and stack awkwardly. Drop both linked and bare badge images,
// then tidy any centered wrapper they leave empty.
function stripBadges(md) {
  let out = md;
  out = out.replace(/\[!\[[^\]]*\]\(https?:\/\/img\.shields\.io[^)]*\)\]\([^)]*\)/g, "");
  out = out.replace(/!\[[^\]]*\]\(https?:\/\/img\.shields\.io[^)]*\)/g, "");
  out = out.replace(/<div align="center">\s*<\/div>/g, "");
  out = out.replace(/\n{3,}/g, "\n\n");
  return out;
}

// Drop the "TL;DR" recap blockquotes. They repeat what the page then says at
// length and read as filler in a browse-first docs experience. A TL;DR is a
// blockquote group (optionally led by a > [!TYPE] marker) whose first content
// line starts with **TL;DR**. Remove the whole group, table and all.
function stripTldr(md) {
  const lines = md.split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^>\s?/.test(lines[i])) {
      let j = i;
      const group = [];
      while (j < lines.length && /^>\s?/.test(lines[j])) group.push(lines[j++]);
      const content = group.map((l) => l.replace(/^>\s?/, "").trim()).filter(Boolean);
      const isTldr = content.slice(0, 2).some((l) => /\*\*TL;DR/i.test(l));
      if (isTldr) {
        while (out.length && out[out.length - 1].trim() === "") out.pop();
      } else {
        out.push(...group);
      }
      i = j - 1;
      continue;
    }
    out.push(lines[i]);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n");
}

// Convert the frontmatter-hostile bits and produce MDX-safe content.
function transform(md, section) {
  let out = md;

  // 0) Drop the first Markdown H1 — the frontmatter title already renders it
  out = out.replace(/^#\s+.+$/m, "");

  // 0a) Drop shields.io badges
  out = stripBadges(out);

  // 0a-bis) Drop the TL;DR recap blockquotes
  out = stripTldr(out);

  // 0b) Repair sequence-diagram semicolons so Mermaid can parse them
  out = sanitizeMermaid(out);

  // 0c) GitHub alerts -> Blume callouts
  out = convertAlerts(out);

  // 0c) Intra-repo .md links -> Blume routes
  out = rewriteDocLinks(out, section);

  // 1) Rewrite image + link paths that point at the repo images/ folder to the based /images/
  out = out.replace(/\]\((?:\.\.\/)+images\//g, `](${BASE}/images/`);
  out = out.replace(/\]\(\.\/images\//g, `](${BASE}/images/`);
  out = out.replace(/\]\(images\//g, `](${BASE}/images/`);
  out = out.replace(/src="(?:\.\.\/)+images\//g, `src="${BASE}/images/`);
  out = out.replace(/src="\.\/images\//g, `src="${BASE}/images/`);
  out = out.replace(/src="images\//g, `src="${BASE}/images/`);

  // 2) Convert Markdown autolinks <https://…> into real links (MDX reads <… as JSX)
  out = out.replace(/<(https?:\/\/[^>\s]+)>/g, "[$1]($1)");

  // 3) Rewrite any remaining relative markdown image to the based /images/<basename>
  out = out.replace(/!\[([^\]]*)\]\((?!\/|https?:|data:|#)([^)]+)\)/g, (m, alt, p) => {
    const file = p.split(/[\\/]/).pop();
    return `![${alt}](${BASE}/images/${file})`;
  });

  // 4) Fix void HTML tags so MDX (JSX) accepts them
  out = out.replace(/<br\s*>/gi, "<br/>");
  out = out.replace(/<hr\s*>/gi, "<hr/>");
  // <img ...> without a closing slash -> add one (avoid already-closed ones)
  out = out.replace(/<img\b([^>]*?)(?<!\/)>/gi, "<img$1 />");

  return out;
}

function processFolder(srcDir, outDir, sectionLabel, order) {
  const section = outDir.endsWith("business") ? "business" : "technical";
  const files = readdirSync(srcDir).filter((f) => f.endsWith(".md"));
  const metaPages = [];
  for (const f of files) {
    const slug = basename(f, ".md").toLowerCase();
    const raw = readFileSync(join(srcDir, f), "utf8");
    const title = withIcon(extractTitle(raw, titleFromSlug(slug)), slug);
    let body = transform(stripFrontmatter(raw), section);
    if (SHOTS[slug]) body = placeGallery(body, SHOTS[slug]);
    const front = `---\ntitle: ${JSON.stringify(title)}\n---\n\n`;
    const outName = slug === "readme" ? "index.mdx" : `${slug}.mdx`;
    writeFileSync(join(outDir, outName), front + body, "utf8");
    metaPages.push(outName === "index.mdx" ? "index" : slug);
  }
  return metaPages;
}

const bizPages = processFolder(join(REPO, "docs/biz"), join(OUT, "business"), "Business", 1);
const techPages = processFolder(join(REPO, "docs/tech"), join(OUT, "technical"), "Technical", 2);

// Curated sidebar ordering + group metadata
const bizOrder = [
  "case-study-11", "uses", "personas", "recipe",
  "web", "mobile", "chat", "voice", "email", "sms", "caseworker",
  "ai", "guardian", "datacompliance", "cost", "auditsecu", "traceability",
];
const techOrder = [
  "architecture", "agents", "aibrainetat", "data", "network",
  "monitoring", "installation", "runbook-dr", "inprogress", "plan", "plan_post_audit",
];

function writeMeta(dir, title, icon, order, pages) {
  const body =
    `import { defineMeta } from "blume";\n\n` +
    `export default defineMeta({\n` +
    `  title: ${JSON.stringify(title)},\n` +
    `  icon: ${JSON.stringify(icon)},\n` +
    `  order: ${order},\n` +
    `  pages: ${JSON.stringify(pages)},\n` +
    `});\n`;
  writeFileSync(join(OUT, dir, "meta.ts"), body, "utf8");
}

writeMeta("business", "Business", "briefcase", 1, bizOrder);
writeMeta("technical", "Technical", "wrench", 2, techOrder);

console.log("business pages:", bizPages.length);
console.log("technical pages:", techPages.length);
