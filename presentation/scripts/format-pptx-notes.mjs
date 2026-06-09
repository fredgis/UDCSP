// Post-processes a Marp-generated .pptx so each speaker note renders as
// separate paragraphs (one sentence per line) instead of one wall of text.
//
// Marp keeps the newlines we author inside <a:t>, but PowerPoint ignores raw
// line-feeds inside a text run — readable line breaks require one <a:p>
// paragraph per line. This script rewrites every notesSlideN.xml accordingly.
//
// Usage: node scripts/format-pptx-notes.mjs dist/slides.pptx

import AdmZip from "adm-zip";

const file = process.argv[2] || "dist/slides.pptx";

// The single notes run Marp emits, e.g.
// <a:p><a:r><a:rPr lang="en-US" dirty="0"/><a:t>line1\nline2</a:t></a:r><a:endParaRPr lang="en-US" dirty="0"/></a:p>
const noteParaRe =
  /<a:p><a:r><a:rPr lang="en-US" dirty="0"\/><a:t>([\s\S]*?)<\/a:t><\/a:r><a:endParaRPr lang="en-US" dirty="0"\/><\/a:p>/;

const zip = new AdmZip(file);
let changed = 0;

for (const entry of zip.getEntries()) {
  if (!/ppt\/notesSlides\/notesSlide\d+\.xml$/.test(entry.entryName)) continue;

  let xml = zip.readAsText(entry);
  const match = xml.match(noteParaRe);
  if (!match) continue;

  const lines = match[1]
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (lines.length < 2) continue; // nothing to split

  const paras = lines
    .map(
      (l) =>
        `<a:p><a:r><a:rPr lang="en-US" dirty="0"/><a:t>${l}</a:t></a:r><a:endParaRPr lang="en-US" dirty="0"/></a:p>`,
    )
    .join("");

  xml = xml.replace(noteParaRe, paras);
  zip.updateFile(entry, Buffer.from(xml, "utf8"));
  changed++;
}

zip.writeZip(file);
console.log(`format-pptx-notes: split notes into paragraphs on ${changed} slides`);
