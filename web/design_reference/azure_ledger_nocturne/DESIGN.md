# Design System Document: The Architectural Ledger

## 1. Overview & Creative North Star
### North Star: "The Financial Observatory"
This design system moves away from the "spreadsheet" aesthetic of traditional finance and toward a high-end, editorial "Observatory" experience. The goal is to provide a sense of immense depth and crystalline clarity. We treat financial data not as static text, but as a living landscape.

By leveraging **intentional asymmetry**, we break the rigid, boxed-in feel of legacy banking apps. We use **Glassmorphism** and **Tonal Layering** to create a UI that feels like a series of sophisticated lenses overlaid on a deep, infinite void. The result is a professional environment that feels authoritative yet breathable.

---

## 2. Colors & Surface Architecture
The palette is rooted in the deep navy of the night sky, using vibrant, bioluminescent blues to guide the eye toward action.

### The "No-Line" Rule
**Borders are a failure of hierarchy.** In this system, 1px solid borders for sectioning are strictly prohibited. Boundaries must be defined solely through background color shifts.
*   *Implementation:* Use `surface-container-low` for large section backgrounds sitting on the base `surface`. Use `surface-container-high` for interactive elements within those sections.

### Surface Hierarchy & Nesting
Treat the UI as physical layers of frosted obsidian. 
*   **Base Layer:** `surface` (#0e141a) – The infinite foundation.
*   **Section Layer:** `surface-container-low` (#161c22) – Large grouped areas.
*   **Object Layer:** `surface-container-high` (#252b31) – Individual cards or interactive units.
*   **Active/Float Layer:** `surface-container-highest` (#2f353c) – Popovers and active selection states.

### The "Glass & Gradient" Rule
To achieve the "premium" feel, floating cards must utilize backdrop-blur (12px–20px) with a semi-transparent `surface-variant`.
*   **Signature Textures:** Main CTAs should not be flat. Apply a subtle linear gradient from `primary` (#aac7ff) to `primary_container` (#0066cc) at a 135° angle to provide a "lit from within" glow.

---

## 3. Typography
We use a dual-font strategy to balance editorial authority with functional precision.

*   **Display & Headlines (Manrope):** This is our "Editorial Voice." Manrope’s geometric yet warm proportions convey modern stability. Use `display-lg` for portfolio totals to make the numbers feel like a statement, not just a value.
*   **Body & Labels (Inter):** This is our "Functional Voice." Inter provides maximum legibility for dense financial data. Use `label-md` for metadata and `body-md` for standard descriptions.

**Hierarchy Note:** Always lead with high contrast. Use `on_surface` (#dde3ec) for primary information and drop significantly to `on_surface_variant` (#c1c6d5) for secondary labels to create immediate visual scannability.

---

## 4. Elevation & Depth
### The Layering Principle
Depth is achieved by stacking tones. For example:
1.  **Dashboard Background:** `surface`
2.  **Portfolio Module:** `surface-container-low` (Asymmetric placement, perhaps bleeding off the left edge)
3.  **Transaction Card:** `surface-container-high` (Nested within the module)

### Ambient Shadows
Avoid black shadows. Use "Atmospheric Shadows":
*   **Color:** 8% opacity of `on_secondary_fixed_variant`.
*   **Blur:** 24px–40px for a soft, natural lift that mimics a diffused light source.

### The "Ghost Border" Fallback
If contrast testing requires a container edge, use a "Ghost Border":
*   `outline_variant` (#414753) at **15% opacity**. It should be felt, not seen.

---

## 5. Components

### Cards & Lists
*   **The Divider Ban:** Never use lines to separate list items. Use 12px–16px of vertical white space or a subtle shift to `surface-container-lowest` on hover.
*   **Glass Cards:** Use for high-level summaries (e.g., Total Balance). Apply 20% opacity to `surface_bright` with a 16px backdrop blur.

### Buttons
*   **Primary:** Gradient fill (`primary` to `primary_container`). `rounded-md` (0.375rem). No shadow, but a 2px "inner glow" using a lighter blue stroke at 20% opacity.
*   **Secondary:** Ghost style. Transparent background with a `Ghost Border`. Text color: `primary`.
*   **Tertiary:** Text-only, `label-md`, all-caps with 0.05em letter spacing for an architectural feel.

### Input Fields
*   **Structure:** No bottom line. Use a solid `surface-container-highest` background.
*   **Focus State:** The background remains the same, but a 1px `primary` border appears with a soft `primary` outer glow (4px blur, 10% opacity).

### Specialized Financial Components
*   **Trend Sparklines:** Use `primary` for growth and `error` (#ffb4ab) for decline. Sparklines should have a subtle gradient fill below the line, fading to 0% opacity.
*   **Value Chips:** For "Profit/Loss" indicators. Use `tertiary_container` for positive "accent" moments to break the sea of blue.

---

## 6. Do’s and Don’ts

### Do
*   **Do** use asymmetrical layouts. A sidebar that doesn't reach the bottom or a header that overlaps a card adds a "custom-built" feel.
*   **Do** use `surface_bright` sparingly for "Flash" moments—areas that need to pull the user's eye immediately upon entry.
*   **Do** prioritize Manrope for any text larger than 1.5rem to maintain the brand's sophisticated character.

### Don't
*   **Don't** use pure black (#000000). It kills the depth. Always use the specified `surface` (#0e141a).
*   **Don't** use 100% opaque borders. They create "visual noise" that makes a professional app feel cluttered.
*   **Don't** use standard "Drop Shadows." They look dated. Use the "Atmospheric Shadow" or "Tonal Layering" instead.