# Design System Strategy: The Architectural Ledger

## 1. Overview & Creative North Star
**Creative North Star: The Architectural Ledger**
In the world of high-end finance, trust isn't built with loud colors; it’s built through precision, breathing room, and structural integrity. This design system moves away from the "app-like" clutter of typical fintech and moves toward an **Editorial Authority** aesthetic. 

The goal is to treat financial data as a curated exhibition. We break the traditional "boxed-in" grid by utilizing intentional asymmetry, expansive white space, and a sophisticated layering of surfaces. By prioritizing typography and tonal depth over structural lines, we create a digital environment that feels as stable as a stone-and-glass bank vault but as fluid as modern wealth.

---

## 2. Colors & Surface Philosophy
This system uses a palette of deep mineral blues and oceanic teals to evoke calm and stability. 

### The "No-Line" Rule
**Lines are a failure of layout.** To maintain a premium feel, designers are prohibited from using 1px solid borders for sectioning or containment. Boundaries must be defined through background shifts. For example:
*   A main content area using `surface` (#f7f9fb).
*   A navigation or sidebar using `surface-container-low` (#f2f4f6).
*   Functional widgets using `surface-container-lowest` (#ffffff).

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Use the `surface-container` tiers (Lowest to Highest) to define importance.
*   **Base:** `surface` (#f7f9fb)
*   **Subtle Recess:** `surface-container-low` (#f2f4f6) for background sections.
*   **Elevation:** `surface-container-lowest` (#ffffff) for the primary interactive cards.
*   **Emphasis:** `surface-container-high` (#e6e8ea) for secondary "tray" elements.

### The "Glass & Gradient" Rule
To avoid a "flat" or "bootstrap" appearance, floating elements (like modals or high-level navigation) should use **Glassmorphism**. Apply a semi-transparent `surface` color with a 20px backdrop-blur. 
*   **Signature Textures:** For primary CTAs or data hero sections, use a subtle linear gradient from `primary` (#003544) to `primary_container` (#004d61) at a 135-degree angle. This adds "soul" and depth that a flat fill cannot provide.

---

## 3. Typography: The Authority of Scale
We pair **Manrope** (Display/Headlines) with **Inter** (Body/UI) to balance editorial character with functional precision.

*   **Display & Headline (Manrope):** Use high-contrast scales. Large `display-lg` (3.5rem) should feel like a headline in an investment journal. It conveys confidence.
*   **Body & Title (Inter):** Used for all data points and interactive labels. The tight tracking and high x-height of Inter ensure that financial figures are legible even at small `label-sm` sizes.
*   **Intentional Weight:** Use `title-lg` (1.375rem) in Medium weight for account balances, ensuring the numbers feel "heavy" and significant.

---

## 4. Elevation & Depth: Tonal Layering
Traditional shadows and borders create visual "noise." We achieve hierarchy through **Tonal Layering**.

*   **The Layering Principle:** Instead of a shadow, place a `surface-container-lowest` card on a `surface-container-low` background. The shift in hex value provides a soft, natural lift.
*   **Ambient Shadows:** If an element must "float" (e.g., a bottom sheet or a primary action button), use an extra-diffused shadow. 
    *   *Formula:* `0px 12px 32px rgba(25, 28, 30, 0.06)`. The shadow color is a 6% opacity version of the `on-surface` token, creating an ambient light effect rather than a "drop shadow."
*   **The Ghost Border:** If a boundary is required for accessibility, use a "Ghost Border"—the `outline-variant` (#c0c8cc) at 15% opacity. Never use 100% opaque borders.

---

## 5. Components

### Buttons
*   **Primary:** `primary_container` background with `on_primary_container` text. Use a `md` (0.75rem) corner radius. Add a subtle inner-glow (1px white top border at 10% opacity) to catch the light.
*   **Secondary:** `surface-container-highest` background. No border. Text in `primary`.
*   **Tertiary:** Transparent background. Text in `primary`. Use for low-priority actions like "Cancel" or "Learn More."

### Input Fields
*   **Base State:** `surface-container-low` background with a `sm` (0.25rem) corner radius. 
*   **Active State:** Soft transition to `surface-container-lowest` with a "Ghost Border" of `primary` at 20% opacity.
*   **Error State:** Background shifts to `error_container` (#ffdad6) with text in `error`.

### Cards & Lists
*   **Cards:** Forbid the use of divider lines. Separate content using the Spacing Scale (24px or 32px). 
*   **Lists:** Use a `surface-container-low` hover state to indicate interactivity. Use `on_surface_variant` (#40484c) for metadata labels to create a clear information hierarchy.
*   **Trend Indicators:** 
    *   **Gains:** `tertiary` (#003909) text on a `tertiary_fixed` (#a3f69c) soft-rounded chip.
    *   **Expenses:** `error` (#ba1a1a) text on a `error_container` (#ffdad6) soft-rounded chip.

### Financial Performance Chips
A custom component for this system. Use a stroke-based icon (up/down arrow) paired with `body-sm` typography, encased in a pill-shaped container with `full` (9999px) roundness.

---

## 6. Do’s and Don’ts

### Do
*   **Do** use extreme whitespace (32px, 48px, 64px) to separate major financial categories.
*   **Do** use `secondary` (#046b5e) for "success-adjacent" actions like "Save" or "Invest."
*   **Do** use `manrope` for any text that is meant to be "read" (headlines), and `inter` for any text meant to be "processed" (data).

### Don't
*   **Don't** use 1px dividers to separate list items. Use 16px of vertical padding instead.
*   **Don't** use pure black (#000000). Use `on_background` (#191c1e) for all text to maintain a softer, high-end feel.
*   **Don't** use "default" blue. Always use the specified `primary` (#003544) to ensure the brand feels premium and architectural.
*   **Don't** crowd the edges. Keep a minimum 24px "Safe Zone" around all container edges.