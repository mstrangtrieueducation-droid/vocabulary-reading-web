(function () {
  "use strict";

  var code = String(new URLSearchParams(window.location.search).get("code") || "").trim().toUpperCase();
  var route = null;

  if (/^VF1-U(?:0[1-9]|1[0-4])$/.test(code)) {
    route = ["https://docs.google.com/forms/d/e/1FAIpQLScOOy3NTX1aIuHk_tfVG-LGsOHFsyJdU0PLGlSFizR2CFWK0g/viewform", "1040067335"];
  } else if (/^VF2-U(?:0[1-9]|1[0-4])$/.test(code)) {
    route = ["https://docs.google.com/forms/d/e/1FAIpQLSfwQ-rVxYwumoYBkndLUsrakiFPv9LGm47d7pjRfAuoFZ9Rgg/viewform", "1040067335"];
  } else if (/^RI1-U(?:0[1-9]|1[0-2])$/.test(code)) {
    route = ["https://docs.google.com/forms/d/e/1FAIpQLScxFRLu_UYUFqD9iborLAr5n5EXi_tI9Hjb-8DdUN4QFL6FxQ/viewform", "1040067335"];
  } else if (/^RI2-U(?:0[1-9]|1[0-2])$/.test(code)) {
    route = ["https://docs.google.com/forms/d/e/1FAIpQLSfq_3Cv80fXEojG0TvwsxHReh3zUieo8lr5SoEBTkb3qL2Vhw/viewform", "1040067335"];
  } else if (/^RI1-C(?:0[1-9]|1[0-2])$/.test(code)) {
    route = ["https://docs.google.com/forms/d/e/1FAIpQLSd1hBw9Xm6kbx_ryIb3ivAsMKm-9I4ki_Qa60VXemmP-fh8kg/viewform", "1040067335"];
  } else if (/^RI2-C(?:0[1-9]|1[0-2])$/.test(code)) {
    route = ["https://docs.google.com/forms/d/e/1FAIpQLSfyuDFyxDjaBrLlwfqwwfCLB25tDDka2ZfyV48DaYapY8oaog/viewform", "1040067335"];
  } else if (/^GF1-U(?:0[1-9]|1[0-9]|20|04\.[12]|05\.[12]|09\.[12])-LT$/.test(code)) {
    route = ["https://docs.google.com/forms/d/e/1FAIpQLSfz3w5t6VffWL-OqNrrZJPE-DrR3L7RFt3u8Z-QsU9t6HW93g/viewform", "1104752903"];
  } else if (/^AP-B0[1-8]$/.test(code)) {
    route = ["https://docs.google.com/forms/d/e/1FAIpQLSeE7deH99J04Rq9LWAPS6moFYONABFpxfwq86vZ7G4_kkwe0Q/viewform", "982583688"];
  }

  if (!route) return;
  var destination = new URL(route[0]);
  destination.searchParams.set("usp", "pp_url");
  destination.searchParams.set("entry." + route[1], code);
  destination.searchParams.set("srd", "true");
  window.location.replace(destination.href);
})();
