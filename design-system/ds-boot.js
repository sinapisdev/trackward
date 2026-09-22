/* DSBoot() — resolves the TrackWard component namespace for a preview page.

   It returns window.TrackWardDesignSystem_3f3083 as soon as the compiled _ds_bundle.js is
   on the page. When the bundle is absent (a freshly edited system) it compiles the component
   sources in the browser instead, so every card and UI kit still renders. It also re-injects
   styles.css with its @import chain flattened when the page is served from a token-scoped
   sandbox URL, where relative subresources are not authorised.

   Requires React + @babel/standalone on the page. */
(function () {
  var NS = "TrackWardDesignSystem_3f3083";
  var FILES = ["core/Icon","core/Logo","core/Badge","core/Button","core/IconButton","core/Chip","core/Avatar","core/TextLink","core/Kbd","core/Divider","forms/Field","forms/Input","forms/Textarea","forms/Select","forms/Checkbox","forms/Radio","forms/RadioCard","forms/Switch","status/StatusDot","status/StatusPill","status/ProgressBar","status/ProgressRing","status/MetricStat","status/CheckpointTrail","surfaces/FolderCard","surfaces/FolderStack","surfaces/PageHeader","surfaces/SectionHeader","surfaces/Panel","surfaces/DataTable","surfaces/ListRow","surfaces/InfoRow","nav/TopNav","nav/Tabs","nav/SegmentedControl","nav/Breadcrumbs","nav/SideRail","nav/AppFooter","nav/MobileTabBar","nav/MobileHeader","work/TaskRow","work/ActivityItem","work/ChatMessage","work/Composer","work/AiBanner","work/ProposalItem","work/ProposalDiff","agenda/WeekGrid"];
  var cache = null, styled = null;

  function tok() {
    try { var t = new URL(location.href).searchParams.get("t"); return t ? "?t=" + t : ""; } catch (e) { return ""; }
  }
  function base() {
    var s = document.querySelector('script[src*="ds-boot.js"]');
    var src = s ? s.getAttribute("src") : "ds-boot.js";
    return src.replace(/ds-boot\.js.*$/, "");
  }
  function dir(url) { return url.replace(/[^/]*$/, ""); }

  function css(url) {
    return fetch(url + tok(), { cache: "no-store" }).then(function (r) { return r.ok ? r.text() : ""; }).then(function (text) {
      var jobs = [], remote = [];
      text = text.replace(/@import\s+url\(["']?([^"')]+)["']?\)\s*;?/g, function (m, href) {
        if (/^https?:/.test(href)) { remote.push(m); return ""; }
        var key = "/*__i" + jobs.length + "__*/";
        jobs.push(css(dir(url) + href).then(function (t) { return { key: key, text: t }; }));
        return key;
      });
      return Promise.all(jobs).then(function (parts) {
        parts.forEach(function (p) { text = text.replace(p.key, p.text); });
        return remote.join("\n") + "\n" + text;
      });
    });
  }

  /* Flatten + inject styles.css. Only needed inside the token-scoped sandbox. */
  window.DSStyles = function () {
    if (!tok()) return Promise.resolve();
    if (styled) return styled;
    styled = css(base() + "styles.css").then(function (text) {
      var el = document.createElement("style");
      el.setAttribute("data-ds-styles", "");
      el.textContent = text;
      document.head.appendChild(el);
    });
    return styled;
  };

  window.DSBoot = function () {
    var styles = window.DSStyles();
    if (window[NS] && Object.keys(window[NS]).length) return styles.then(function () { return window[NS]; });
    if (cache) return cache;
    var root = base();
    cache = Promise.all(FILES.map(function (f) {
      return fetch(root + "components/" + f + ".jsx" + tok(), { cache: "no-store" }).then(function (r) {
        if (!r.ok) throw new Error("ds-boot: cannot read components/" + f + ".jsx");
        return r.text();
      });
    })).then(function (sources) {
      var names = [];
      var code = sources.map(function (src) {
        src = src.replace(/^\s*import[\s\S]*?from\s+"[^"]*";?\s*$/gm, "");
        src = src.replace(/export\s+(function|const|class)\s+([A-Za-z0-9_]+)/g, function (m, kw, name) {
          names.push(name); return kw + " " + name;
        });
        return src;
      }).join("\n");
      var out = Babel.transform(code, { presets: ["react"] }).code;
      out += "\nreturn {" + names.map(function (n) { return n + ":" + n; }).join(",") + "};";
      window[NS] = new Function("React", out)(window.React);
      return styles.then(function () { return window[NS]; });
    });
    return cache;
  };
})();
