# Design System — mdx.so-inspired (marketing homepage only)

Reference tokens extracted from [mdx.so](https://mdx.so/) by rendering the live site and reading
computed styles (not estimated from a screenshot or a text-only fetch — an initial text summary
of the page claimed a dark theme, which was wrong; the rendered site is light and airy).

This system applies **only** to the public marketing homepage
(`src/features/marketing/`). The authenticated app keeps its existing banknote-green /
Cairo-Aref Ruqaa system untouched. See "Scoping" below for how the two coexist in one codebase.

## Color

| Token | Value | Usage |
|---|---|---|
| Background | `#FFFFFF` | Page background (a very subtle warm-gray gradient wash sits behind the hero on the source site) |
| Primary text | `#131313` | Headlines, button labels — near-black, not pure black |
| Secondary text | `#8A8F8D` | Body copy, sub-text — desaturated gray-green |
| Accent | `#FF8200` | Used sparingly: a dot marker, a link-arrow icon. Never a large fill. |
| Dark chip fill | `#101820` | Solid CTA pill background, white text on top |
| Border | `#000000` at 1px; `rgba(0,0,0,.1)` for circular icon buttons | Pill outlines, nav circle |

## Type

| Role | Source font | Weight | Notes | Arabic substitute |
|---|---|---|---|---|
| Display (H1/H2) | Orlean | 500 | ~44–49px, `letter-spacing: ~1.95px` — wide, geometric, generously tracked | **Changa**, weight 800 |
| Body | Aventa | 400 | ~16–17px, line-height 20px, colored `#8A8F8D` | **Cairo**, weight 400 (already in the project) |

Orlean and Aventa have no Arabic glyphs — using them directly would silently fall back to a
system font for every Arabic character. The substitutes above were chosen for the same *felt*
character (wide/geometric display, clean grotesk body), not for sharing a name.

Type scale on the source site is fluid/viewport-relative — computed sizes land on odd fractional
px values, consistent with `clamp()`-based sizing rather than fixed breakpoint jumps.

## Shape & spacing

- **Radius:** full pill (`20px`+, effectively `9999px`) for buttons and tag chips; perfect circle
  for icon buttons and the small nav dot.
- **Buttons:** solid dark pill (`#101820` fill, white text) for primary actions; outlined pill
  (`1px solid #000`, transparent fill) for secondary tags/filters.
- **Layout:** asymmetric hero — headline + CTA pinned bottom-left, a large centered hero visual,
  short supporting copy + capability pills pinned bottom-right. Generous negative space. A thin
  1px hairline vertical divider sits next to the wordmark in the nav.
- **Nav:** minimal — wordmark, small circular dot icon, a single plain underlined link ("Let's
  talk"), a hairline hamburger. No visible traditional link list.

## Motion

- First-impression: a branded percentage-counter preloader before the page reveals — deliberate
  and unhurried, not instant.
- Below the fold: scroll-triggered reveals (standard for this tier of site; implemented here via
  the project's existing `motion/react` + `useReducedMotion()` pattern, unchanged from the
  original homepage build).

## Scoping — coexisting with the app's real design system

These tokens are **not** written to `:root` in `src/index.css` (that would re-theme the entire
authenticated app). They live under a `.theme-mdx` class applied to the homepage's root element,
using the same custom-property mechanism the project already uses for dark mode
(`@custom-variant dark (&:is(.dark *))`):

```css
.theme-mdx {
  --background: #ffffff;
  --foreground: #131313;
  --muted-foreground: #8a8f8d;
  --primary: #101820;
  --primary-foreground: #ffffff;
  --accent: #ff8200;
  --border: #000000;
  --radius: 9999px;
  --font-sans-value: 'Cairo', ui-sans-serif, system-ui, sans-serif;
  --font-brand-value: 'Changa', 'Cairo', sans-serif;
}
```

Every existing component reads color through Tailwind utilities that resolve to these same
custom-property names (`bg-background`, `text-foreground`, `text-muted-foreground`, `bg-primary`,
`rounded-full`, …), so scoping the override to `.theme-mdx` re-themes the whole subtree without
touching className logic elsewhere in the app.

**Gotcha — fonts need an extra indirection.** Tailwind v4's `@theme inline` bakes literal values
into generated utilities at *build time*; a value only stays reactive at runtime if it's itself a
`var()` reference. Every color token above is defined as `--color-x: var(--x)`, so it cascades
correctly. `--font-sans`/`--font-brand` were originally literal strings, so overriding them in
`.theme-mdx` silently did nothing — `.font-brand` kept using the build-time value. Fixed by adding
one more layer of indirection in `:root`: `--font-sans-value`/`--font-brand-value` hold the actual
font stack, and `@theme inline` points `--font-sans`/`--font-brand` at `var(--font-sans-value)` /
`var(--font-brand-value))`. `.theme-mdx` then overrides the `-value` variables, which *does*
propagate. Any future scoped-theme token needs the same var()-indirection pattern to actually work.
