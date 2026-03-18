# TheLo!. — Brand & Style Guide

> For the marketing & creative team. Everything you need to stay on-brand across ads, social, decks, and landing pages.

---

## 1. Logo / Wordmark

The TheLo! logo is a **text-based wordmark**.

- **Font:** Oswald (display, weight 700)
- **Primary mark color:** `--ink` (`#ffffff` — pure white on dark backgrounds; near-black `#050505` on light)
- **Signature element:** The app name renders as **"THE LO"** in all-caps Oswald. Always uppercase. Never use mixed case.
- **Sizing:** 30px (text-3xl) in the nav header; scale proportionally for other uses.

### Usage Rules

| Do | Don't |
|----|-------|
| Always render in all-caps Oswald | Use any other typeface for the wordmark |
| Use white `#ffffff` on dark backgrounds | Place on backgrounds lighter than `#1c1c1e` without a dark backing container |
| Keep tight letter-spacing (`tracking-tight`) | Add extra letter-spacing or tracking |
| Place on `#050505` or `#0a0a0a` backgrounds | Place on busy photos or colored backgrounds without a dark overlay |

### Wordmark on Dark Backgrounds

The wordmark is always white `#ffffff` on dark. The brand lives natively on near-black — there is no "light mode" variant. Do not invert to a dark wordmark unless placing on a white card component, and even then, prefer keeping the dark container.

---

## 2. Color Palette

| Name | Variable | Hex | RGB | Use |
|------|----------|-----|-----|-----|
| **Ink** | `--ink` | `#050505` | 5, 5, 5 | Primary background, deepest surfaces |
| **Surface** | `--card` | `#1c1c1e` | 28, 28, 30 | Cards, input backgrounds, inactive pills |
| **Surface Hover** | — | `#2c2c2e` | 44, 44, 46 | Hover state for cards and inputs |
| **Sheet** | `--sheet` | `#0a0a0a` | 10, 10, 10 | Bottom sheet, overlays |
| **Dark Card** | — | `#161616` | 22, 22, 22 | List item cards inside the sheet |
| **White** | `--bg-inverse` | `#ffffff` | 255, 255, 255 | Primary text, active map markers, active pills, FAB |
| **Accent Blue** | `--accent` | `#38bdf8` | 56, 189, 248 | Active nav state (Map tab), highlighted UI states |
| **Accent Amber** | `--accent-alt` | `#fbbf24` | 251, 191, 36 | Settings/utility icon tint |
| **Border** | `--border` | `rgba(255,255,255,0.05)` | — | Dividers, card borders, subtle outlines |

### Status / Semantic Colors

| Status | Hex | Use |
|--------|-----|-----|
| **Active / Live** | `#9ca3af` (gray-400) | Live status dot on active event cards |
| **Inactive** | `#4b5563` (gray-600) | Status dot on lower-energy events |
| **Muted Text** | `#6b7280` (gray-500) | Secondary metadata, addresses, distances |
| **Ghost Text** | `#374151` (gray-700) | Tertiary labels like `LIVE_DATA` decorators |

---

## 3. Typography

| Role | Font Family | Weight | Size (Desktop) |
|------|-------------|--------|-----------------|
| **Headings / Display** | Oswald | 500, 700 | H1: 30px, Map Markers: 24px large / 18px small |
| **Body / UI** | Inter | 400, 500, 600, 700 | 15px (list titles), 11px (meta), 10px (labels) |
| **Code / Terminal / Labels** | JetBrains Mono | 400, 500 | 10–11px |

### Font Import

```
https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Oswald:wght@500;700&family=JetBrains+Mono:wght@400;500&display=swap
```

### Typography Rules

- Display text always uses **Oswald** — always `text-transform: uppercase`. Never use lowercase or sentence case.
- Map marker numbers, the app wordmark, event count scores, and all large numeric readouts use **Oswald 700**.
- Body copy and UI labels use **Inter** — clean, neutral, modern.
- System metadata (addresses, distances, live indicators, nav labels) uses **JetBrains Mono** — this reinforces the data/tech aesthetic.
- Line height: headings `1.1`, body `1.5–1.6`
- Letter spacing on large display text: `tracking-tight` (approximately `-0.025em`)
- Label tracking: `tracking-[0.2em]` for section headers in mono; `tracking-widest` for nav labels

---

## 4. Button Styles

### Primary CTA / Active Filter Pill

```css
background: #ffffff;
color: #000000;
font-family: 'Inter', sans-serif;
font-size: 12px;
font-weight: 700;
padding: 8px 24px;
border-radius: 9999px; /* full pill */
box-shadow: 0 1px 3px rgba(0,0,0,0.3);
transition: transform 0.15s ease;
```

Hover: `transform: scale(1.05)`

### Inactive Filter Pill

```css
background: #1c1c1e;
color: #9ca3af;
font-size: 12px;
font-weight: 700;
padding: 8px 24px;
border-radius: 9999px;
border: 1px solid transparent;
transition: all 0.15s ease;
```

Hover: `color: #ffffff; background: #2c2c2e`

### FAB — Floating Action Button (Drop)

```css
width: 64px;
height: 64px;
border-radius: 9999px;
background: #ffffff;
border: 5px solid #000000;
box-shadow: 0 0 25px rgba(255,255,255,0.3);
transition: transform 0.15s ease;
```

Hover: `transform: scale(1.05)`

### Icon Button (Settings / Add)

```css
width: 44px;
height: 44px;
border-radius: 9999px;
background: #1c1c1e;
color: #fbbf24; /* settings */ /* or #000000 for Add */
transition: background 0.15s ease;
```

Hover: `background: #2c2c2e`

---

## 5. Spacing & Layout

- **Max content width:** Full-bleed mobile-first layout (no fixed max-width container)
- **Page padding:** 20px horizontal (`px-5`)
- **Header top padding:** 48px (`pt-12`) to clear status bar
- **Section padding:** 16–32px vertical
- **Grid gaps:** 12px between filter pills, 12px between list cards (`mb-3`)
- **Border radius:** `9999px` (pills/buttons), `8px` (tooltips/tags), `16px` (list cards / `rounded-2xl`), `32px` (bottom sheet top corners / `rounded-t-[32px]`)
- **Mobile breakpoint:** Designed mobile-first; primary breakpoint `640px`
- **Bottom nav height:** 72px (fixed, always above content)
- **Bottom sheet height:** ~52% of viewport

---

## 6. Key UI Components

### Navigation Bar (Bottom)

- Position: Fixed bottom, full-width, `z-50`
- Background: `#000000`
- Border: `border-t: 1px solid rgba(255,255,255,0.05)`
- Shadow: `box-shadow: 0 -10px 40px rgba(0,0,0,0.95)` (nav-shadow)
- Height: 72px
- Active tab color: `#38bdf8` (accent blue) for icon and label
- Inactive tab color: `#6b7280` → hover `#ffffff`
- Labels: JetBrains Mono, 8px, `font-bold`, `tracking-widest`, uppercase
- Center "Drop" button floats 32px above the nav bar baseline

### Top Header

- Background: `#050505`
- Padding: `px-5 pt-12 pb-4`
- Contains: Wordmark (left), Search bar (center, flex-1), Settings icon button (right)
- Below header: Horizontally scrollable filter pills, no visible scrollbar

### Search Bar

- Background: `#1c1c1e`
- Height: 44px (`h-11`)
- Border radius: `9999px`
- Placeholder text color: `#6b7280`
- Focus state: `background: #2c2c2e`
- Placeholder text: `SEARCH_NODES...` — always uppercase, mono feel

### Map Area

- Background: `#020202`
- Grid overlay: `linear-gradient(#2a2a2a 1.5px, transparent 1.5px)` at 50×50px, opacity 0.8
- Street lines: `stroke: #333`, `stroke-width: 2.5px`, `filter: drop-shadow(0 0 2px rgba(255,255,255,0.15))`
- Map fills the entire space between header and bottom sheet

### Map Markers

**Primary (large, featured venue):**
- Circle: 64×64px, `background: #ffffff`, `border-radius: 50%`
- Shadow: `0 0 30px rgba(255,255,255,0.25)`
- Pulse ring: 1px solid `rgba(255,255,255,0.3)`, animates scale 0.8→1.5, opacity 0.5→0, 3s infinite
- Outer halo ring: 112×112px, `border: 1px solid rgba(255,255,255,0.05)`
- Number: Oswald 700, 24px, `#000000`
- Label tooltip: `background: rgba(0,0,0,0.9)`, `backdrop-filter: blur(12px)`, `border: 1px solid rgba(255,255,255,0.15)`, `border-radius: 8px`, Inter bold 10px white

**Secondary (smaller venues):**
- Circle: 48×48px, `background: #ffffff`
- Shadow: `0 0 15px rgba(255,255,255,0.1)`
- Number: Oswald 700, 18px, `#000000`
- Label tooltip: same as primary but `border-radius: 6px`, 9px text, `#e5e7eb`

### Bottom Sheet

- Background: `#0a0a0a`
- Border radius: `32px 32px 0 0` (top corners only)
- Border top: `1px solid rgba(255,255,255,0.05)`
- Shadow: `0 -10px 40px rgba(0,0,0,0.7)`
- Handle bar: 96×6px, `border-radius: 9999px`, frosted gradient `linear-gradient(90deg, rgba(255,255,255,0.05), rgba(255,255,255,0.2), rgba(255,255,255,0.05))`, `backdrop-filter: blur(4px)`
- Section label: JetBrains Mono, 10px, `#6b7280`, `tracking-[0.2em]`, uppercase
- Live indicator label: JetBrains Mono, 8px, `#374151`

### Event List Cards

- Background: `#161616`
- Border radius: `16px` (`rounded-2xl`)
- Border: `1px solid rgba(255,255,255,0.05)` → hover `rgba(255,255,255,0.10)`
- Padding: 16px (`p-4`)
- Margin bottom: 12px (`mb-3`)
- Left: status dot (8×8px circle) + event name (Inter 700, 15px) + metadata row (JetBrains Mono, 11px, `#6b7280`)
- Right: score number (Oswald 700, 24px, white) + "Active" label (JetBrains Mono, 9px, `#4b5563`, uppercase)
- Metadata separator: `::` in `#374151`, 8px

### Shadow System

- **Large (map markers / hero):** `0 0 30px rgba(255,255,255,0.25)` (white glow)
- **Medium (bottom sheet):** `0 -10px 40px rgba(0,0,0,0.7)`
- **Small (nav):** `0 -10px 40px rgba(0,0,0,0.95)`
- **FAB Drop button:** `0 0 25px rgba(255,255,255,0.3)`
- **Tooltip/modal:** `box-shadow: 0 4px 20px rgba(0,0,0,0.5)`

---

## 7. Brand Voice & Copy Patterns

### Headline Formula

Short, uppercase, punchy. Reads like a terminal command or a broadcast signal. Ends without punctuation unless a period lands as a brand beat.

Examples:
- "FIND YOUR LO."
- "DROP YOUR PIN."
- "SEE WHO'S OUT."

### Tagline

> "Know the Lo."

### CTA Copy

- **"DROP IT"** (primary action — posting/sharing location)
- **"SEE MORE"** (lower-commitment browse action)
- **"FIND THE LO"** (onboarding / discovery)

### Tone

- Terse and self-assured — says a lot with very little
- Real-time and urgent without being anxious; like a friend who always knows what's happening
- Technical aesthetic (mono labels, data readouts) without being cold — the warmth is in the community
- Never promotional or hype-y; avoids exclamation points
- No corporate speak, no lifestyle platitudes — the product speaks through action

### Key Messaging Pillars

1. **Proximity** — Everything is nearby, live, and local. The Lo is your neighborhood's pulse.
2. **Real-Time** — Data is live. The map breathes. Nothing is stale.
3. **Community Signal** — Numbers represent real people. High scores mean high energy.
4. **Discovery** — Every session reveals something you didn't know was happening.

---

## 8. Animation & Motion

- **Scroll reveal:** Not applicable (fixed-layout mobile app). Sheet content fades in naturally.
- **Pulse ring (map marker):** Scale 0.8→1.5, opacity 0.5→0, `cubic-bezier(0.215, 0.61, 0.355, 1)`, 3s infinite — applied to primary (featured) venue marker only
- **Filter pill scale:** `transform: scale(1.05)` on hover, `transition: transform 0.15s ease`
- **FAB button scale:** `transform: scale(1.05)` on hover, `transition: transform 0.15s ease`
- **Card border:** `border-color` transition, `0.15s ease`
- **Nav icon color:** `color` transition, `0.15s ease` (`transition-colors`)
- **Search focus:** `background-color` transition on focus-within, `0.15s ease`
- **Philosophy:** Minimal and purposeful. Motion exists to confirm interaction or signal life — the pulse ring is the only ambient animation. Everything else responds only to user action.

---

## 9. Quick-Reference: Ad Creative Checklist

- [ ] Wordmark is **Oswald 700, all-caps** — "THE LO" with tight tracking
- [ ] Background uses approved dark color — `#050505` or `#0a0a0a` only
- [ ] Active CTA button is `#ffffff` with `#000000` text, full pill radius
- [ ] Headlines follow the **short, uppercase, imperative** pattern — no exclamation points
- [ ] Body/UI text uses **Inter**
- [ ] Metadata and system labels use **JetBrains Mono**
- [ ] Tone is terse and self-assured — no hype, no corporate speak
- [ ] Real-time / proximity angle mentioned where relevant
- [ ] Accent blue `#38bdf8` used only for active/highlighted states — not as a primary brand color
- [ ] Copyright: `© 2025 TheLo!`