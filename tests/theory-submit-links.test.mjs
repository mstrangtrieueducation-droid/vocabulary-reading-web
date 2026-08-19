import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

const root = path.resolve(import.meta.dirname, "..");
const programs = [
  { prefix: "vf1", globalName: "VF1_UNITS", units: 14, formId: "1FAIpQLScOOy3NTX1aIuHk_tfVG-LGsOHFsyJdU0PLGlSFizR2CFWK0g" },
  { prefix: "vf2", globalName: "VF2_UNITS", units: 14, formId: "1FAIpQLSfwQ-rVxYwumoYBkndLUsrakiFPv9LGm47d7pjRfAuoFZ9Rgg" },
  { prefix: "ri1", globalName: "RI1_UNITS", units: 12, formId: "1FAIpQLScxFRLu_UYUFqD9iborLAr5n5EXi_tI9Hjb-8DdUN4QFL6FxQ" },
  { prefix: "ri2", globalName: "RI2_UNITS", units: 12, formId: "1FAIpQLSfq_3Cv80fXEojG0TvwsxHReh3zUieo8lr5SoEBTkb3qL2Vhw" },
];
const forbiddenHostPattern = /https?:\/\/(?:forms\.gle|[^/\s"']*chatgpt\.site)/i;
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
  const versionSource = sharedSource.match(/const SHARED_UPLOADER_VERSION = [^;]+;/)?.[0];
  assert.ok(versionSource, "Shared asset does not define SHARED_UPLOADER_VERSION");
  const sandbox = {
    URL,
    encodeURIComponent,
    window: { location: { href: pageUrl } },
    document: { documentElement: { dataset: { formEntryId: "1040067335" } } },
  };
  vm.runInNewContext(
    `${versionSource}\n${functionSource}\nresult = makeSubmitUrl({ code: ${JSON.stringify(code)} });`,
    sandbox,
  );
  return sandbox.result;
}

function evaluateLegacyRedirect(source, code) {
  let destination = "";
  const sandbox = {
    URL,
    URLSearchParams,
    document: { documentElement: { dataset: { apiEndpoint: "" } } },
    window: {
      location: {
        search: `?code=${encodeURIComponent(code)}`,
        replace(value) { destination = value; },
      },
    },
  };
  vm.runInNewContext(source, sandbox);
  return destination;
}

test("all 52 non-IELTS theory routes open their original Google Form with the exact code", () => {

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
      assert.doesNotMatch(html, forbiddenHostPattern, `${route} still exposes a deprecated host`);
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
      forbiddenHostPattern,
      `${referencedSharedAsset} still contains a deprecated host`,
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
        `https://docs.google.com/forms/d/e/${program.formId}/viewform?usp=pp_url&entry.1040067335=${code}`,
        `${route} resolves to the wrong original Form URL`,
      );
    }
  }
});

test("all aliases load the same cache-busted resilient uploader release", () => {
  const uploader = readUtf8("vocab-submit/index.html");
  assert.equal(readUtf8("vf2-submit/index.html"), uploader);
  assert.equal(readUtf8("notebook-submit/index.html"), uploader);

  const asset = extractAsset(
    uploader,
    /src=["']\.\.\/(vf2-submit\.[a-f0-9]{12}\.js)["']/,
    "vocab-submit",
  );
  const source = readUtf8(asset);
  assert.match(source, /maxChunkAttempts = 8/);
  assert.match(source, /postControlWithRetry/);
  assert.match(source, /maxAttempts = 6/);
  assert.match(source, /ATTEMPT_EXISTS/);
  assert.match(source, /setCreationDate\(stablePdfDate\)/);
  assert.match(source, /isSameOriginReturnBridge/);
  assert.match(source, /function originalFormForCode/);
  assert.match(source, /RI1_CORRECTION/);
  assert.match(source, /RI2_CORRECTION/);
  assert.match(source, /entry: "1104752903"/);
  assert.match(source, /entry: "982583688"/);
  assert.match(source, /window\.location\.replace\(originalFormDestination\)/);
  assert.doesNotMatch(
    source,
    /originalFormForCode\([^)]*IELTS-(?:READING|WRITING)/,
    "IELTS routes must stay on their dedicated web workflow",
  );
  assert.match(source, /w17-prompts\/w17-prompt-1\.png/);
  assert.match(source, /w17-prompts\/w17-prompt-2\.png/);
  assert.ok(fs.existsSync(path.join(root, "w17-prompts", "w17-prompt-1.png")));
  assert.ok(fs.existsSync(path.join(root, "w17-prompts", "w17-prompt-2.png")));
  assert.doesNotMatch(source, /renderWritingTimer|data-writing-timer|countdown/i);

  const formCases = [
    ["VF1-U14", "1FAIpQLScOOy3NTX1aIuHk_tfVG-LGsOHFsyJdU0PLGlSFizR2CFWK0g", "1040067335"],
    ["VF2-U01", "1FAIpQLSfwQ-rVxYwumoYBkndLUsrakiFPv9LGm47d7pjRfAuoFZ9Rgg", "1040067335"],
    ["RI1-U12", "1FAIpQLScxFRLu_UYUFqD9iborLAr5n5EXi_tI9Hjb-8DdUN4QFL6FxQ", "1040067335"],
    ["RI2-U01", "1FAIpQLSfq_3Cv80fXEojG0TvwsxHReh3zUieo8lr5SoEBTkb3qL2Vhw", "1040067335"],
    ["RI1-C01", "1FAIpQLSd1hBw9Xm6kbx_ryIb3ivAsMKm-9I4ki_Qa60VXemmP-fh8kg", "1040067335"],
    ["RI2-C12", "1FAIpQLSfyuDFyxDjaBrLlwfqwwfCLB25tDDka2ZfyV48DaYapY8oaog", "1040067335"],
    ["GF1-U04.2-LT", "1FAIpQLSfz3w5t6VffWL-OqNrrZJPE-DrR3L7RFt3u8Z-QsU9t6HW93g", "1104752903"],
    ["AP-B08", "1FAIpQLSeE7deH99J04Rq9LWAPS6moFYONABFpxfwq86vZ7G4_kkwe0Q", "982583688"],
  ];
  for (const [code, formId, entryId] of formCases) {
    assert.equal(
      evaluateLegacyRedirect(source, code),
      `https://docs.google.com/forms/d/e/${formId}/viewform?usp=pp_url&entry.${entryId}=${encodeURIComponent(code)}`,
      `${code} does not redirect to its original Form`,
    );
  }
  const bridge = readUtf8("bridge-return/index.html");
  assert.match(bridge, /add\(window\.parent\.parent\)/);
  assert.match(bridge, /add\(window\.top\)/);
});
