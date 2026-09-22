---
name: trackward-design
description: Use this skill to generate well-branded interfaces and assets for TrackWard, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for protoyping.
user-invocable: true
---

Read `DESIGN.md` first: it is the source of truth for colour, type, spacing, motion,
voice and iconography. Then read `README.md`, which explains how this system is wired
into the Esteira project and what the rules are for using it there.

Two things to know before writing any code against it:

- Every token is scoped to `[data-ds="trackward"]`, never to `:root`. The host app has
  its own visual language in `app/globals.css` and some token names collide on purpose
  kept apart (`--r-lg`, `--warn`, `--r-sm`). Anything you build must sit inside a node
  carrying that attribute.
- Import components from the `index.js` barrel, never from inside `components/`. The
  project's ESLint config enforces this, along with the per-component prop contracts in
  `aderencia.eslint.json`.

Each component ships `<Name>.d.ts` (props contract) and `<Name>.prompt.md` (when to use
it, how to word what goes in it). Read the `.prompt.md` files before composing screens.

If creating visual artifacts (slides, mocks, throwaway prototypes), copy assets out and
create static HTML files for the user to view; `referencia/` has working examples of
exactly that. If working on production code, read the rules here and use the barrel.
If the user invokes this skill without any other guidance, ask them what they want to
build or design, ask some questions, and act as an expert designer who outputs HTML
artifacts _or_ production code, depending on the need.
