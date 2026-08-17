import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

const root = path.resolve(import.meta.dirname, "..");
const programs = [
  { prefix: "vf1", globalName: "VF1_UNITS", units: 14 },
  { prefix: "vf2", globalName: "VF2_UNITS", units: 14 },
  { prefix: "ri1", globalName: "RI1_UNITS", units: 12 },
  { prefix: "ri2", globalName: "RI2_UNITS", units: 12 },
];
const legacyHostPattern = /https?:\/\/(?:docs\.google\.com\/forms|forms\.gle|[^/\s"']*chatgpt\.site)/i;
const mojibakePattern = /á»|áº|Ä‘|Æ°|Ná»|Chá»|Tráº|Tá»|Ã©|Ã¨|Ã¡|Ã¢|Ãô|Ãê|Ãí|Ãó|Ãú|Ãý|Â·|â€|â€™|ï¿½|�/;

function readUtf8(relativePath) {
  const source = fs.readFileSync(path.join(root, relativePath), "utf8");
  assert.doesNotMatch(source, /\uFFFD/, `${relativePath} contains an invalid UTF-8 replacement character`);
  assert.doesNotMatch(source, mojibakePattern, `${relativePath} contains mojibake`);
  return source;
}

function extractAsset(html, pattern, route) {
  const match = html.match(pattern);
  assert.ok(match, `${route} does not load the expected shared asset`);
  return match[1];
}

function loadUnits(asset, globalName) {
  const sandbox = { window: {} };
  vm.runInNewContext(readUtf8(asset), sandbox, { filename: asset });
  assert.ok(sandbox.window[globalName], `${asset} does not define window.${globalName}`);
  return sandbox.window[globalName];
}

function evaluateSubmitUrl(sharedSource, pageUrl, code) {
  const functionSource = sharedSource.match(/function makeSubmitUrl\(unit\) \{[\s\S]*?\n\}/)?.[0];
  assert.ok(functionSource, "Shared asset does not define makeSubmitUrl(unit)");
  const sandbox = {
    URL,
    encodeURIComponent,
    window: { location: { href: pageUrl } },
  };
  vm.runInNewContext(
    `${functionSource}\nresult = makeSubmitUrl({ code: ${JSON.stringify(code)} });`,
    sandbox,
  );
  return sandbox.result;
}

test("all 52 theory routes open the shared uploader with their exact code", () => {
  assert.ok(fs.existsSync(path.join(root, "vocab-submit", "index.html")), "Shared uploader route is missing");

  const actualRoutes = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^(?:vf1|vf2|ri1|ri2)-u\d{2}-live$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
  const expectedRoutes = programs
    .flatMap(({ prefix, units }) =>
      Array.from(
        { length: units },
        (_, index) => `${prefix}-u${String(index + 1).padStart(2, "0")}-live`,
      ),
    )
    .sort();
  assert.deepEqual(actualRoutes, expectedRoutes);

  for (const program of programs) {
    let referencedSharedAsset = "";
    let referencedUnitsAsset = "";

    for (let unit = 1; unit <= program.units; unit += 1) {
      const paddedUnit = String(unit).padStart(2, "0");
      const route = `${program.prefix}-u${paddedUnit}-live`;
      const html = readUtf8(`${route}/index.html`);
      assert.doesNotMatch(html, legacyHostPattern, `${route} still exposes a Form or ChatGPT URL`);
      assert.match(html, new RegExp(`data-unit=["']${unit}["']`), `${route} has the wrong unit number`);

      const formLinks = html.match(/<a\b[^>]*\bform-link\b[^>]*>/gi) || [];
      assert.equal(formLinks.length, 2, `${route} must expose both uploader buttons`);

      const sharedAsset = extractAsset(
        html,
        new RegExp(`src=["']\\.\\./(${program.prefix}-shared(?:\\.[a-f0-9]{12})?\\.js)["']`),
        route,
      );
      const unitsAsset = extractAsset(
        html,
        new RegExp(`src=["']\\.\\./(${program.prefix}-units(?:\\.[a-f0-9]{12})?\\.js)["']`),
        route,
      );
      referencedSharedAsset ||= sharedAsset;
      referencedUnitsAsset ||= unitsAsset;
      assert.equal(sharedAsset, referencedSharedAsset, `${route} loads a different shared asset`);
      assert.equal(unitsAsset, referencedUnitsAsset, `${route} loads a different units asset`);
    }

    const sharedSource = readUtf8(referencedSharedAsset);
    assert.doesNotMatch(
      sharedSource,
      legacyHostPattern,
      `${referencedSharedAsset} still contains a Form or ChatGPT URL`,
    );
    assert.equal(
      readUtf8(`${program.prefix}-shared.js`),
      sharedSource,
      `${program.prefix} hashed and unversioned shared assets have drifted`,
    );

    const units = loadUnits(referencedUnitsAsset, program.globalName);
    assert.equal(Object.keys(units).length, program.units, `${referencedUnitsAsset} has the wrong unit count`);

    for (let unit = 1; unit <= program.units; unit += 1) {
      const paddedUnit = String(unit).padStart(2, "0");
      const code = `${program.prefix.toUpperCase()}-U${paddedUnit}`;
      const route = `${program.prefix}-u${paddedUnit}-live`;
      assert.equal(units[unit]?.code, code, `${referencedUnitsAsset} has the wrong code for Unit ${unit}`);

      const pageUrl = `https://mstrangtrieueducation-droid.github.io/vocabulary-reading-web/${route}/`;
      assert.equal(
        evaluateSubmitUrl(sharedSource, pageUrl, code),
        `https://mstrangtrieueducation-droid.github.io/vocabulary-reading-web/vocab-submit/?code=${code}`,
        `${route} resolves to the wrong uploader URL`,
      );
    }
  }
});
