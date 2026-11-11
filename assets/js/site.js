// Nút chép code, nhãn ngôn ngữ, thu gọn output dài, mục lục tự sinh, xem ảnh phóng to. Không phụ thuộc thư viện nào.
(function () {
  var prose = document.querySelector(".prose");
  if (!prose) return;

  // Code block: thêm thanh nhãn + nút chép
  prose.querySelectorAll("div.highlighter-rouge").forEach(function (box) {
    var pre = box.querySelector("pre");
    if (!pre) return;
    var m = box.className.match(/language-([\w+-]+)/);
    var lang = m ? m[1] : "";
    if (lang === "plaintext" || lang === "text") lang = "output";
    var bar = document.createElement("div");
    bar.className = "code-bar";
    var label = document.createElement("span");
    label.textContent = lang;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Chép";
    btn.addEventListener("click", function () {
      var text = pre.innerText.replace(/\n$/, "");
      navigator.clipboard.writeText(text).then(function () {
        btn.textContent = "Đã chép";
        btn.setAttribute("data-done", "");
        setTimeout(function () { btn.textContent = "Chép"; btn.removeAttribute("data-done"); }, 1600);
      }, function () {
        btn.textContent = "Không chép được";
      });
    });
    bar.appendChild(label);
    bar.appendChild(btn);
    box.insertBefore(bar, box.firstChild);

    // Output dài: thu gọn còn FOLD_SHOW dòng, có nút mở ra. Thêm {: .no-fold} dưới khối code để tắt.
    var FOLD_AT = 30, FOLD_SHOW = 20;
    var lines = pre.textContent.replace(/\n$/, "").split("\n").length;
    if (lines <= FOLD_AT || box.classList.contains("no-fold")) return;
    var hidden = lines - FOLD_SHOW;
    box.classList.add("is-folded");
    box.style.setProperty("--fold-lines", FOLD_SHOW);
    label.textContent = (lang ? lang + ", " : "") + lines + " dòng";
    var more = document.createElement("button");
    more.type = "button";
    more.className = "code-more";
    more.setAttribute("aria-expanded", "false");
    var setText = function (open) {
      more.textContent = open ? "Thu gọn" : "Hiện thêm " + hidden + " dòng";
    };
    setText(false);
    more.addEventListener("click", function () {
      var open = box.classList.toggle("is-folded") === false;
      more.setAttribute("aria-expanded", String(open));
      setText(open);
      if (!open && box.getBoundingClientRect().top < 0) box.scrollIntoView({ block: "start" });
    });
    box.appendChild(more);
  });

  // Ctrl+F: mở hết các khối đang thu gọn để trình duyệt tìm được chữ bên trong
  document.addEventListener("keydown", function (e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === "f" || e.key === "F")) {
      prose.querySelectorAll(".is-folded .code-more").forEach(function (b) { b.click(); });
    }
  });

  // Mục lục: chỉ hiện khi bài có từ 3 tiêu đề h2 trở lên
  var toc = document.querySelector(".toc");
  var heads = prose.querySelectorAll("h2[id]");
  if (!toc || heads.length < 3) return;
  var title = document.createElement("p");
  title.textContent = "Trong bài này";
  var ol = document.createElement("ol");
  var links = [];
  heads.forEach(function (h) {
    var li = document.createElement("li");
    var a = document.createElement("a");
    a.href = "#" + h.id;
    a.textContent = h.textContent;
    li.appendChild(a);
    ol.appendChild(li);
    links.push(a);
  });
  toc.appendChild(title);
  toc.appendChild(ol);
  toc.hidden = false;

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) { a.removeAttribute("aria-current"); });
        var hit = links.find(function (a) { return a.hash === "#" + e.target.id; });
        if (hit) hit.setAttribute("aria-current", "true");
      });
    }, { rootMargin: "0px 0px -70% 0px" });
    heads.forEach(function (h) { io.observe(h); });
  }
})();

// Xem ảnh: bấm vào ảnh trong bài để mở to, cuộn/chụm 2 ngón để zoom, kéo để di chuyển.
(function () {
  var imgs = document.querySelectorAll(".prose img");
  if (!imgs.length) return;

  var MIN = 0.2, MAX = 8;
  var box = document.createElement("div");
  box.className = "lb";
  box.hidden = true;
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-modal", "true");
  box.setAttribute("aria-label", "Xem ảnh");
  box.innerHTML =
    '<img class="lb__img" alt="" draggable="false">' +
    '<div class="lb__bar">' +
      '<button type="button" data-act="out" aria-label="Thu nhỏ">−</button>' +
      '<span class="lb__pct" aria-live="polite">100%</span>' +
      '<button type="button" data-act="in" aria-label="Phóng to">+</button>' +
      '<button type="button" data-act="fit">Vừa màn hình</button>' +
      '<button type="button" data-act="real">Kích thước gốc</button>' +
      '<button type="button" data-act="close" class="lb__close">Đóng</button>' +
    '</div>' +
    '<p class="lb__hint">Cuộn chuột để phóng to, kéo để di chuyển, Esc để đóng</p>';
  document.body.appendChild(box);

  var view = box.querySelector(".lb__img");
  var pct = box.querySelector(".lb__pct");
  var s = 1, x = 0, y = 0, fit = 1, lastFocus = null;

  function apply() {
    view.style.transform = "translate(-50%, -50%) translate(" + x + "px," + y + "px) scale(" + s + ")";
    pct.textContent = Math.round(s * 100) + "%";
  }
  function fitScale() {
    var w = view.naturalWidth || 1, h = view.naturalHeight || 1;
    return Math.min(1, (innerWidth * 0.94) / w, (innerHeight - 110) / h);
  }
  // Zoom quanh điểm (cx, cy) tính từ tâm màn hình, để chỗ đang trỏ chuột đứng yên
  function zoomTo(ns, cx, cy) {
    ns = Math.min(MAX, Math.max(MIN, ns));
    cx = cx || 0; cy = cy || 0;
    x = cx - (cx - x) * (ns / s);
    y = cy - (cy - y) * (ns / s);
    s = ns;
    apply();
  }
  function reset(to) { s = to; x = 0; y = 0; apply(); }

  function open(img) {
    lastFocus = document.activeElement;
    view.src = img.currentSrc || img.src;
    view.alt = img.alt;
    box.hidden = false;
    document.documentElement.style.overflow = "hidden";
    var ready = function () { fit = fitScale(); reset(fit); };
    view.complete ? ready() : (view.onload = ready);
    box.querySelector(".lb__close").focus();
  }
  function close() {
    box.hidden = true;
    document.documentElement.style.overflow = "";
    view.removeAttribute("src");
    if (lastFocus) lastFocus.focus();
  }

  imgs.forEach(function (img) {
    if (img.closest("a")) return; // ảnh đã có link thì để link hoạt động
    img.classList.add("zoomable");
    img.tabIndex = 0;
    img.setAttribute("role", "button");
    img.setAttribute("aria-label", "Phóng to ảnh" + (img.alt ? ": " + img.alt : ""));
    img.addEventListener("click", function () { open(img); });
    img.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(img); }
    });
  });

  box.addEventListener("click", function (e) {
    var act = e.target.getAttribute && e.target.getAttribute("data-act");
    if (act === "in") zoomTo(s * 1.4);
    else if (act === "out") zoomTo(s / 1.4);
    else if (act === "fit") reset(fit);
    else if (act === "real") reset(1);
    else if (act === "close" || e.target === box) close();
  });

  document.addEventListener("keydown", function (e) {
    if (box.hidden) return;
    if (e.key === "Escape") close();
    else if (e.key === "+" || e.key === "=") zoomTo(s * 1.25);
    else if (e.key === "-") zoomTo(s / 1.25);
    else if (e.key === "0") reset(fit);
    else if (e.key === "Tab") { // giữ focus trong hộp xem ảnh
      var f = box.querySelectorAll("button"), first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  box.addEventListener("wheel", function (e) {
    e.preventDefault();
    var k = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
    zoomTo(s * k, e.clientX - innerWidth / 2, e.clientY - innerHeight / 2);
  }, { passive: false });

  view.addEventListener("dblclick", function (e) {
    var target = Math.abs(s - fit) < 0.01 ? Math.max(1, fit * 2.5) : fit;
    if (target === fit) reset(fit);
    else zoomTo(target, e.clientX - innerWidth / 2, e.clientY - innerHeight / 2);
  });

  // Kéo bằng chuột, chụm 2 ngón trên điện thoại
  var pts = new Map(), startDist = 0, startScale = 1, moved = false;
  view.addEventListener("pointerdown", function (e) {
    view.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved = false;
    if (pts.size === 2) {
      var p = Array.from(pts.values());
      startDist = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
      startScale = s;
    }
  });
  view.addEventListener("pointermove", function (e) {
    var prev = pts.get(e.pointerId);
    if (!prev) return;
    var cur = { x: e.clientX, y: e.clientY };
    pts.set(e.pointerId, cur);
    if (pts.size === 1) {
      x += cur.x - prev.x; y += cur.y - prev.y; moved = true; apply();
    } else if (pts.size === 2 && startDist) {
      var p = Array.from(pts.values());
      var d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
      var mx = (p[0].x + p[1].x) / 2 - innerWidth / 2, my = (p[0].y + p[1].y) / 2 - innerHeight / 2;
      zoomTo(startScale * d / startDist, mx, my);
      moved = true;
    }
  });
  function up(e) { pts.delete(e.pointerId); if (pts.size < 2) startDist = 0; }
  view.addEventListener("pointerup", up);
  view.addEventListener("pointercancel", up);
  addEventListener("resize", function () { if (!box.hidden) { fit = fitScale(); } });
})();
