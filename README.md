pgu.github.io
=============

[:octocat: page](http://pgu.github.io/)...

![](pgu-io.gif)

## Experimental: "Canvas timeline" and HTML-in-Canvas

The last tab of the home page (`#canvas`, code in [js/canvas.js](js/canvas.js)) is a dock-style timeline built on the
[HTML-in-Canvas](https://github.com/WICG/html-in-canvas) proposal (WICG). It only runs in Chromium with the feature
switched on; other browsers get a fallback panel with instructions.

### Enabling it

1. Chrome 147 or newer (developed against Chrome 155).
2. Open `chrome://flags/#canvas-draw-element`, set **Enable the new drawElement API for Canvas** to *Enabled*, relaunch.

No WebGL and no other flag is needed: everything uses the plain 2D canvas context.

### The API surface used

| Piece | Used for |
| --- | --- |
| `<canvas layoutsubtree>` | Opts the canvas's child elements into layout, so the 15 dock cards and the detail panel are real, styled DOM (CSS, fonts, chips, buttons) that is not painted by the browser. (The newest spec draft spells it `content="drawable"`; both attributes are set.) |
| `ctx.drawElementImage(el, x, y, w, h)` | Paints a child element into the canvas at any position and size. Dock cards are drawn at their magnified size every frame; the destination size is passed explicitly because the snapshot is device-pixel sized. |
| `canvas.onpaint` / `event.changedElements` | The render loop. `paint` fires after the DOM changed or after `requestPaint()`; the code redraws the whole scene there, and uses `changedElements` to know when the detail panel's content changed. |
| `canvas.requestPaint()` | Keeps the animation going while something is still moving (hover magnification, genie), and stops when idle. |
| Return value of `drawElementImage` | A `DOMMatrix`; assigning it to the element's `style.transform` keeps the live DOM aligned with what is drawn. |

### How the effects are built

- **Dock magnification.** Each frame the card's scale follows a Gaussian of its distance to the cursor, and card widths are summed so neighbours push apart. The layout is pinned so the item under the pointer stays under it. Each card is one `drawElementImage` call.
- **Genie expand / collapse.** The detail panel (a normal DOM element holding the role, blurb, tech chips and a Close button) is warped like the macOS minimize effect:
  1. Once per content change, the panel is drawn at full size at the canvas origin and copied into a plain offscreen bitmap (`drawImage(canvas, …)`) before the background paints over it.
  2. During the animation that bitmap is cut into 140 horizontal strips with `drawImage`. Each strip gets its own width, centre and y position: strips near the top start moving earlier (`GENIE_LAG`) and spread wide, strips near the bottom stay pinched to the dock card, which produces the funnel / S-curve. Progress is eased per strip.
  3. When the animation settles, the panel is drawn once with `drawElementImage` as the real live element, so its chips and Close button are usable.
- **Why the bitmap copy.** The first version called `drawElementImage` with its source-rect overload (source in CSS px) for each of the 140 strips, which makes the browser re-render the panel 140 times per frame and was visibly jerky. Rendering once and slicing a bitmap fixed it. JavaScript time was about 1 ms per frame either way; the cost was in rasterization.

### Gotchas found while building it

- Snapshots are device-pixel sized: with `ctx.scale(devicePixelRatio)` an element drawn with just `(el, x, y)` appears `dpr` times too large. Always pass a destination width and height.
- In Chrome 155 hit testing does not reach the canvas's children (`elementFromPoint` and click targets are the `<canvas>`), even though `getBoundingClientRect()` on a child reflects the synced transform. Clicks on the detail panel's buttons are therefore routed by hand from the buttons' bounding rects.
- Combining the feature flag with `--enable-experimental-web-platform-features` on the command line made the API disappear in Chrome 155 (observed only on the command line).
- The proposal is still changing between Chrome versions (attribute names, geometry sync). The view feature-detects `drawElementImage` and `requestPaint`, and any exception while drawing falls back to the instructions panel with the error text.
- Scrolling inside a drawn element works: the panel body is a normal `overflow-y: auto` element, and changing its `scrollTop` (from the `wheel` handler, or Up/Down/PageUp/PageDown) plus `requestPaint()` redraws it. The wheel is only captured while the panel can still scroll in that direction, otherwise the page scrolls. The scrollbar is styled with `::-webkit-scrollbar` because overlay scrollbars would not show in the snapshot.
- Interaction: arrow keys browse, `Enter` opens the latest entry, `Esc` closes; users with `prefers-reduced-motion` get no animation.
