(function () {
  "use strict";

  var unit = Number(document.documentElement.dataset.unit || 0);
  if (unit !== 1) return;

  var code = "VF2-U" + String(unit).padStart(2, "0");
  var destination = new URL(
    "../vocab-submit/?code=" + encodeURIComponent(code) + "&v=20260818-3",
    window.location.href,
  ).href;
  document.querySelectorAll(".form-link").forEach(function (link) {
    // The shared mobile helper remembers the former Google Form URL in this
    // data attribute. Replace it as well so Android/iOS cannot navigate back
    // to the retired Form after the visible href has changed.
    link.dataset.googleFormUrl = destination;
    link.href = destination;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  });
})();
