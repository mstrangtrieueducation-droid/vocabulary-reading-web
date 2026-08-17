import fs from "node:fs";
import path from "node:path";

const sourceRoot = path.resolve(process.argv[2] || "");
const targetRoot = path.resolve(process.cwd());

if (!sourceRoot || !fs.existsSync(sourceRoot)) {
  throw new Error("Pass the generated dist/client directory as the first argument.");
}

const ranges = [
  ["vf1", 14],
  ["vf2", 14],
  ["ri1", 12],
  ["ri2", 12],
];
const routes = ranges.flatMap(([prefix, count]) =>
  Array.from({ length: count }, (_, index) => `${prefix}-u${String(index + 1).padStart(2, "0")}-live`),
);
routes.push("vocab-submit", "vf2-submit");

for (const route of routes) {
  const source = path.join(sourceRoot, route, "index.html");
  const target = path.join(targetRoot, route, "index.html");
  let html = fs.readFileSync(source, "utf8").replace(/\r\n/g, "\n");
  html = html
    .replaceAll('href="/android-video-controls.css"', 'href="../android-video-controls.css"')
    .replaceAll('src="/android-video-controls.js"', 'src="../android-video-controls.js"');
  fs.writeFileSync(target, html, "utf8");
}

const requiredCopy = [
  ["vf2-u01-live/index.html", "Nộp bài"],
  ["vocab-submit/index.html", "NỘP SỔ TỪ VỰNG + VIDEO TRẢ TỪ"],
  ["vocab-submit/index.html", "01 PDF có sẵn"],
  ["ri1-u01-live/index.html", "Từ vựng"],
];
for (const [file, text] of requiredCopy) {
  const html = fs.readFileSync(path.join(targetRoot, file), "utf8");
  if (!html.includes(text)) throw new Error(`UTF-8 check failed: ${file} -> ${text}`);
}

// Do not flag the legitimate Vietnamese letters Ã and Â by themselves.
const mojibakePattern = /á»|áº|Ä‘|Æ°|Ná»|Chá»|Tráº|Tá»|Ã©|Ã¨|Ã¡|Ã¢|Ãô|Ãê|Ãí|Ãó|Ãú|Ãý|Â·|â€|â€™|ï¿½|�/;
const broken = routes.filter((route) =>
  mojibakePattern.test(fs.readFileSync(path.join(targetRoot, route, "index.html"), "utf8")),
);
if (broken.length) throw new Error(`Mojibake remains in: ${broken.join(", ")}`);

console.log(`Synced and verified ${routes.length} UTF-8 pages.`);
