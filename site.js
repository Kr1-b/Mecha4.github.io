// Mark the current page in the menu and open/close the menu on small screens.
(function () {
  var page = document.body.getAttribute("data-page");
  document.querySelectorAll("#site-nav a").forEach(function (a) {
    if (a.getAttribute("data-page") === page) a.setAttribute("aria-current", "page");
  });
  var btn = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  if (btn && nav) {
    btn.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }
  // Respect reduced motion: stop the 3D model's tail animation and looping videos.
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.querySelectorAll("model-viewer").forEach(function (mv) { mv.removeAttribute("autoplay"); });
    document.querySelectorAll("video[autoplay]").forEach(function (v) { v.removeAttribute("autoplay"); v.pause(); });
  }
})();
