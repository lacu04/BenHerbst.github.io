(function () {
  "use strict";

  /* ---------- Photo slots ----------
     Each .photo holds an <img>. If the file exists, show it and hide the
     placeholder caption. If not, hide the broken image and keep the placeholder. */
  document.querySelectorAll(".photo").forEach(function (fig) {
    var img = fig.querySelector("img");
    if (!img) return;
    function ok() { fig.classList.add("has-image"); fig.classList.remove("no-image"); }
    function bad() { fig.classList.add("no-image"); fig.classList.remove("has-image"); }
    img.addEventListener("load", ok);
    img.addEventListener("error", bad);
    if (img.complete) { img.naturalWidth > 0 ? ok() : bad(); }
  });

  /* ---------- Slew-and-follow tracking demo ----------
     A simulated mount (azimuth/elevation) acquires and follows a simulated
     satellite pass on a polar sky plot. Hovering the plot steers the target.
     This is an illustration, not telemetry from any real system. */
  var svg = document.getElementById("sky");
  if (!svg) return;

  var stage = document.getElementById("stage");
  var mountEl = document.getElementById("mount");
  var targetEl = document.getElementById("target");
  var trailEl = document.getElementById("trail");
  var passEl = document.getElementById("pass");
  var toggle = document.getElementById("toggle");
  var out = {
    az: document.getElementById("r-az"),
    el: document.getElementById("r-el"),
    err: document.getElementById("r-err"),
    status: document.getElementById("r-status")
  };
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var CX = 240, CY = 215, R = 190;          // plot center and horizon radius (svg units)
  var PASS_SECONDS = 16, GAP_SECONDS = 4;   // visible pass, then time below the horizon
  var MAX_RATE = 50;                        // mount slew limit, degrees per second
  var GAIN = 5;                             // proportional gain, 1/s
  var TRAIL_LEN = 90;
  var RAD = Math.PI / 180;

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  function wrap180(d) { d = (d + 180) % 360; if (d < 0) d += 360; return d - 180; }
  function wrap360(d) { d = d % 360; return d < 0 ? d + 360 : d; }

  function toXY(az, el) {
    var r = R * (90 - el) / 90;
    return { x: CX + r * Math.sin(az * RAD), y: CY - r * Math.cos(az * RAD) };
  }

  // Satellite pass: a great-circle arc from horizon to horizon whose peak is
  // 65 degrees up, 340 degrees azimuth (just west of north).
  var PEAK_AZ = 340, PEAK_EL = 65;
  function passAt(u) {                       // u in [0, 1]
    var a = PEAK_AZ * RAD, e = PEAK_EL * RAD, phi = (-90 + 180 * u) * RAD;
    var x = Math.cos(e) * Math.sin(a) * Math.cos(phi) + Math.cos(a) * Math.sin(phi);
    var y = Math.cos(e) * Math.cos(a) * Math.cos(phi) - Math.sin(a) * Math.sin(phi);
    var z = Math.sin(e) * Math.cos(phi);
    return { az: wrap360(Math.atan2(x, y) / RAD), el: Math.max(0, Math.asin(clamp(z, -1, 1)) / RAD) };
  }

  // Draw the pass track once.
  (function () {
    var d = "";
    for (var i = 0; i <= 60; i++) {
      var p = passAt(i / 60), xy = toXY(p.az, p.el);
      d += (i ? "L" : "M") + xy.x.toFixed(1) + " " + xy.y.toFixed(1);
    }
    passEl.setAttribute("d", d);
  })();

  // Great-circle separation between two az/el directions, in degrees.
  function separation(a, b) {
    var e1 = a.el * RAD, e2 = b.el * RAD, da = (a.az - b.az) * RAD;
    var c = Math.sin(e1) * Math.sin(e2) + Math.cos(e1) * Math.cos(e2) * Math.cos(da);
    return Math.acos(clamp(c, -1, 1)) / RAD;
  }

  var mount = { az: 250, el: 0 };
  var target = { az: 250, el: 0, visible: true };
  var trail = [];
  var mode = "pass";                         // pass | pointer
  var paused = reduceMotion;
  var clock = reduceMotion ? PASS_SECONDS * 0.4 : 0;
  var last = performance.now();
  var running = true;

  function passTarget(t) {
    var cycle = t % (PASS_SECONDS + GAP_SECONDS);
    if (cycle <= PASS_SECONDS) {
      var p = passAt(cycle / PASS_SECONDS);
      return { az: p.az, el: p.el, visible: true, cycle: cycle };
    }
    var s = passAt(0);                       // waiting at the next acquisition point
    return { az: s.az, el: s.el, visible: false, cycle: cycle };
  }

  function step(dt) {
    var feedAz = 0, feedEl = 0;
    if (mode === "pass") {
      if (!paused) clock += dt;
      var now = passTarget(clock);
      var ahead = passTarget(clock + 0.05);
      target.az = now.az; target.el = now.el; target.visible = now.visible;
      if (now.visible && ahead.visible) {    // feed-forward on the known path
        feedAz = wrap180(ahead.az - now.az) / 0.05;
        feedEl = (ahead.el - now.el) / 0.05;
      }
      if (paused) { feedAz = 0; feedEl = 0; }
    }

    var dAz = wrap180(target.az - mount.az);
    var dEl = target.el - mount.el;
    if (reduceMotion && mode === "pointer") {
      mount.az = target.az; mount.el = target.el;
    } else if (!(mode === "pass" && paused && reduceMotion)) {
      var vAz = clamp(dAz * GAIN + feedAz, -MAX_RATE, MAX_RATE);
      var vEl = clamp(dEl * GAIN + feedEl, -MAX_RATE, MAX_RATE);
      mount.az = wrap360(mount.az + vAz * dt);
      mount.el = clamp(mount.el + vEl * dt, 0, 90);
    }
  }

  function render() {
    var m = toXY(mount.az, mount.el);
    mountEl.setAttribute("transform", "translate(" + m.x.toFixed(1) + " " + m.y.toFixed(1) + ")");

    var t = toXY(target.az, target.el);
    targetEl.setAttribute("transform", "translate(" + t.x.toFixed(1) + " " + t.y.toFixed(1) + ")");
    targetEl.setAttribute("visibility", target.visible ? "visible" : "hidden");

    trail.push(m);
    if (trail.length > TRAIL_LEN) trail.shift();
    var d = "";
    for (var i = 0; i < trail.length; i++) {
      d += (i ? "L" : "M") + trail[i].x.toFixed(1) + " " + trail[i].y.toFixed(1);
    }
    trailEl.setAttribute("d", d);

    var err = target.visible ? separation(mount, target) : 0;
    out.az.textContent = Math.round(mount.az);
    out.el.textContent = Math.round(mount.el);
    out.err.textContent = target.visible ? err.toFixed(1) : "--";
    out.status.textContent = !target.visible ? "Next pass" : (err < 2 ? "Tracking" : "Slewing");
  }

  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    step(dt);
    render();
    if (running) requestAnimationFrame(frame);
  }

  function toAzEl(evt) {
    var pt = svg.createSVGPoint();
    pt.x = evt.clientX; pt.y = evt.clientY;
    var m = svg.getScreenCTM();
    var p = m ? pt.matrixTransform(m.inverse()) : pt;
    var dx = p.x - CX, dy = p.y - CY;
    var r = Math.min(R, Math.sqrt(dx * dx + dy * dy));
    return { az: wrap360(Math.atan2(dx, -dy) / RAD), el: 90 * (1 - r / R) };
  }

  stage.addEventListener("pointermove", function (e) {
    if (e.target.closest && e.target.closest("figcaption")) return;
    var p = toAzEl(e);
    target.az = p.az; target.el = p.el; target.visible = true;
    mode = "pointer";
  });

  stage.addEventListener("pointerleave", function () { mode = "pass"; });

  function setPaused(value) {
    paused = value;
    toggle.textContent = paused ? "Play demo" : "Pause demo";
    toggle.setAttribute("aria-pressed", paused ? "true" : "false");
  }
  toggle.addEventListener("click", function () { setPaused(!paused); });
  setPaused(paused);

  // Start in a believable state: already tracking partway through a pass.
  (function seed() {
    var s = passTarget(clock);
    mount.az = s.az; mount.el = s.el; target.az = s.az; target.el = s.el;
  })();

  // Stop animating while the hero is off screen.
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      var visible = entries[0].isIntersecting;
      if (visible && !running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
      if (!visible) running = false;
    }).observe(stage);
  }

  requestAnimationFrame(frame);
})();
