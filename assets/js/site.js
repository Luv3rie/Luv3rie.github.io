// Nút chép code, nhãn ngôn ngữ, mục lục tự sinh. Không phụ thuộc thư viện nào.
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
