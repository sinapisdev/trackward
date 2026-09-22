/* KitBoot(files) — loads a UI kit's screen .jsx files.

   Screens are plain top-level `function ScreenName(props) {}` declarations with no imports
   or exports: KitBoot resolves the design-system namespace through DSBoot(), destructures
   every component into scope, transpiles the screens together and hands them back by name.
   Works with the compiled _ds_bundle.js and, when that is absent, with the sources. */
(function () {
  function tok() {
    try { var t = new URL(location.href).searchParams.get("t"); return t ? "?t=" + t : ""; } catch (e) { return ""; }
  }
  window.KitBoot = function (files, dir) {
    dir = dir || "";
    return window.DSBoot().then(function (DS) {
      return Promise.all(files.map(function (n) {
        return fetch(dir + n + ".jsx" + tok(), { cache: "no-store" }).then(function (r) {
          if (!r.ok) throw new Error("kit-boot: cannot read " + n + ".jsx");
          return r.text();
        });
      })).then(function (sources) {
        var names = [];
        sources.forEach(function (src) {
          var m = src.match(/^function\s+([A-Z][A-Za-z0-9_]*)/gm) || [];
          m.forEach(function (d) { names.push(d.replace(/^function\s+/, "")); });
        });
        var pre = "const {" + Object.keys(DS).join(",") + "} = DS;\n";
        var code = pre + sources.join("\n\n");
        var out = Babel.transform(code, { presets: ["react"] }).code;
        out += "\nreturn {" + names.map(function (n) { return n + ":" + n; }).join(",") + "};";
        return new Function("React", "DS", out)(window.React, DS);
      });
    });
  };
})();
