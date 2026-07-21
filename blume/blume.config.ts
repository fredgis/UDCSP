import { defineConfig } from "blume";

export default defineConfig({
  title: "UDCSP",
  description:
    "Unified Digital Citizen Services Platform — one portal, one AI brain, federated across Denmark, Sweden and Norway. Documentation rendered with Blume.",

  logo: {
    text: "UDCSP",
    href: "/",
  },

  content: {
    root: "docs",
  },

  deployment: {
    site: "https://fredgis.github.io",
    base: "/UDCSP",
  },

  theme: {
    accent: "blue",
    radius: "md",
    mode: "system",
  },

  search: {
    provider: "orama",
  },

  markdown: {
    imageZoom: true,
  },

  // Blume exposes no global-CSS hook, so inject one small stylesheet via a
  // global inline script. It fixes Mermaid diagrams, which ship as
  // width="100%" inside a flex container and otherwise collapse to the SVG
  // default of 300px. This makes every diagram fill the content column.
  analytics: {
    scripts: [
      {
        content:
          '(function(){var c=".blume-mermaid,blume-mermaid{display:block!important;width:100%!important;text-align:center;overflow-x:auto}blume-mermaid svg{width:100%!important;height:auto!important;max-height:none!important}";var s=document.createElement("style");s.setAttribute("data-udcsp","mermaid-fix");s.textContent=c;document.head.appendChild(s);})();',
      },
    ],
  },
});
