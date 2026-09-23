# Kinetix Design System — Phase 0 Foundation

The Kinetix Design System provides a restrained, high-clarity, Apple-inspired fitness visual language engineered for mobile-first web applications.

---

## 1. Design Principles

- **Calm Clarity**: The UI recedes so workout instructions, exercise posture, and timer metrics remain the absolute hero.
- **Fitness-Focused Utility**: Color and elevation communicate action, state, and effort rather than mere ornamentation.
- **Touch-First Ergonomics**: Every primary touch target meets or exceeds 44x44px. Critical actions are anchored within natural thumb zones.
- **Performance by Default**: Powered by pure CSS variables, semantic HTML, and zero bloated runtime dependencies.

---

## 2. Color System & Design Tokens

All colors are centralized in `css/tokens.css`.

### Neutral & Surface Palette
| Token | Value | Semantic Role |
| :--- | :--- | :--- |
| `--color-background` | `#F7F7F5` | Main application backdrop; warm neutral stone |
| `--color-surface` | `#FFFFFF` | Cards, modals, elevated sheets, input fields |
| `--color-surface-secondary` | `#F0F0ED` | Inactive tabs, subtle pill backgrounds, skeleton loaders |
| `--color-surface-tertiary` | `#E8E8E4` | Hover states on secondary surfaces, dividers |
| `--color-text-primary` | `#111111` | Primary headings, titles, high-emphasis text |
| `--color-text-secondary` | `#6B6B6B` | Body text, exercise instructions, metadata |
| `--color-text-muted` | `#999999` | Captions, timestamps, disabled indicators |
| `--color-border` | `#E8E8E8` | Card outlines, dividers, input borders |
| `--color-border-subtle` | `#F0F0EE` | Internal card dividers |
| `--color-border-strong` | `#D1D1CB` | Hover card borders, focused boundaries |

### Brand Accent & Feedback Palette
| Token | Value | Semantic Role |
| :--- | :--- | :--- |
| `--color-primary` | `#FF542E` | Athletic vermilion/coral. Primary action, active tab indicator |
| `--color-primary-hover`| `#E63E18` | Hover/tap state for primary buttons |
| `--color-primary-subtle`| `#FFF1ED` | Badge backgrounds, highlighted active nav items |
| `--color-success` | `#12A150` | Completed workouts, streaks, achievements |
| `--color-warning` | `#D97706` | Heart rate threshold warnings, rest pauses |
| `--color-error` | `#DC2626` | Validation errors, destructive reset actions |

---

## 3. Typography Scale

Uses a system-friendly sans-serif font stack (`-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif`).

| Token / Class | Font Size | Weight | Line Height | Letter Spacing | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `Display` (`.text-display`) | `clamp(2rem, 5vw, 2.5rem)` | 700 | 1.2 | `-0.025em` | Challenge headers, major achievements |
| `H1` (`.text-h1`, `h1`) | `clamp(1.625rem, 4vw, 2rem)` | 700 | 1.2 | `-0.025em` | Page titles, workout routine titles |
| `H2` (`.text-h2`, `h2`) | `clamp(1.25rem, 3vw, 1.5rem)`| 600 | 1.35 | `-0.025em` | Section headers |
| `H3` (`.text-h3`, `h3`) | `1.125rem` (18px) | 600 | 1.35 | `0em` | Card titles, exercise names |
| `Body Large` (`.text-body-lg`) | `1.0625rem` (17px) | 400 | 1.625 | `0em` | Featured lead paragraphs, instructions |
| `Body` (`.text-body`, `p`) | `0.9375rem` (15px) | 400 | 1.5 | `0em` | Standard descriptions, exercise tips |
| `Body Small` (`.text-body-sm`)| `0.8125rem` (13px) | 400 | 1.5 | `0em` | Secondary metadata, exercise subtitles |
| `Caption` (`.text-caption`)| `0.6875rem` (11px) | 500 | 1.35 | `0.025em` | Badges, timestamps, small tags |
| `Button` (`.btn`) | `0.9375rem` (15px) | 600 | 1.0 | `0em` | Interactive button labels |
| `Label` (`.text-label`) | `0.8125rem` (13px) | 500/600 | 1.2 | `0em` | Form labels, metric descriptors |

---

## 4. Spacing Scale

A predictable 4-based scale to maintain rhythmic vertical alignment across components:

| Token | Size | Typical Use |
| :--- | :--- | :--- |
| `--space-1` | `4px` | Icon-to-text gap, badge inner vertical padding |
| `--space-2` | `8px` | Chip padding, list row spacing |
| `--space-3` | `12px` | Card internal gap, exercise item padding |
| `--space-4` | `16px` | Standard screen gutter padding, card inner padding |
| `--space-5` | `20px` | Medium section buffer, modal inner gutters |
| `--space-6` | `24px` | Major section header vertical margin |
| `--space-8` | `32px` | Page section separators |
| `--space-10` | `40px` | Empty state vertical spacing |
| `--space-12` | `48px` | Major hero margins |
| `--space-16` | `64px` | Desktop expanded section buffers |

---

## 5. Radius System

Corner radii establish a soft, tactile, modern aesthetic:

| Token | Radius | Application |
| :--- | :--- | :--- |
| `--radius-xs` | `4px` | Small status badges, inline indicators |
| `--radius-sm` | `6px` | Exercise thumbnail containers, skeleton blocks |
| `--radius-md` | `10px` | Exercise cards, input fields, dropdown select |
| `--radius-lg` | `16px` | Standard cards, workout cards, toast notifications |
| `--radius-xl` | `24px` | Modal dialogs, bottom sheets |
| `--radius-pill` | `9999px` | Buttons, segmented controls, filter chips |

---

## 6. Elevation & Shadows

We prioritize structural borders (`1px solid var(--color-border)`) and contrast over heavy drop shadows. Shadows are soft, low-opacity, and subtle:

| Token | Value | Application |
| :--- | :--- | :--- |
| `--shadow-none` | `none` | Flat components, default state |
| `--shadow-xs` | `0 1px 2px rgba(0, 0, 0, 0.04)` | Active chip, segmented control thumb |
| `--shadow-sm` | `0 2px 6px rgba(0, 0, 0, 0.05)` | Card hover state |
| `--shadow-md` | `0 4px 16px rgba(0, 0, 0, 0.07)` | Floating workout controls, toasts |
| `--shadow-lg` | `0 12px 32px rgba(0, 0, 0, 0.09)` | Drawer overlays |
| `--shadow-float`| `0 16px 40px -8px rgba(0, 0, 0, 0.14)`| Modals, Bottom Sheet surfaces |

---

## 7. Glassmorphism / Liquid Effect Rules

Glass effects are strictly restrained to enhance depth without sacrificing contrast or legibility:
- **Allowed**: Sticky top bar, floating bottom navigation, active workout timer floating action bar, modal backdrops.
- **Prohibited**: Main content cards, exercise list items, body copy backgrounds.
- **Graceful Degradation**: When backdrop filters are unsupported, the fallback renders with solid surface colors.

---

## 8. Component Specifications

### Buttons (`.btn`)
- **Primary (`.btn-primary`)**: High-contrast vermilion background with white text. For the single primary action per viewport (e.g. "Start Workout", "Save Plan").
- **Secondary (`.btn-secondary`)**: Neutral stone background. For supportive actions.
- **Outline (`.btn-outline`)**: Crisp border with transparent fill.
- **Ghost (`.btn-ghost`)**: Transparent background for tertiary utility actions.
- **Touch Sizing**: Minimum height of 48px on standard buttons (36px on `.btn-sm`, 54px on `.btn-lg`).

### Cards & Fitness Layouts
- **Workout Card (`.workout-card`)**: Contains a 16:9 visual slot (`.workout-card-visual`), difficulty badge, duration pill, routine title, calorie estimate, and level.
- **Exercise Card (`.exercise-card`)**: Row-based mobile item with a 60x60px movement demonstration thumbnail, exercise title, sets/reps metadata, and target muscle badge.

### Navigation Architecture
- **Mobile Bottom Nav (`.bottom-nav`)**: Fixed to bottom with safe-area padding. 5 core destinations: **Home**, **Workouts**, **Plans**, **Progress**, **Profile**.
- **Mobile Top Bar (`.top-bar`)**: Sticky 56px header with back button slot, centered title, and contextual action slot.
- **Desktop Sidebar**: Automatically adapts at 1024px+ into a vertical 260px sticky sidebar.

---

## 9. Animation & Motion Rules

- Transitions use standard decelerating curves (`cubic-bezier(0.2, 0.8, 0.2, 1)`).
- Timing tokens:
  - `--transition-fast: 150ms` (hover, button press, chip toggle)
  - `--transition-normal: 250ms` (card elevation, modal scale, sheet slide)
  - `--transition-slow: 400ms` (progress ring offset, page cross-fades)
- **Reduced Motion Support**:
  - Automatically turns off or minimizes transitions when `@media (prefers-reduced-motion: reduce)` is detected.

---

## 10. Accessibility Standards (WCAG AA)

1. **Touch Targets**: All primary interactive elements exceed 44px x 44px.
2. **Focus Indicators**: Every interactive control features a visible `--focus-ring` (`0 0 0 3px rgba(255, 84, 46, 0.35)`).
3. **Contrast Ratio**: Body text meets a minimum 4.5:1 contrast against `#F7F7F5` and `#FFFFFF`. Primary vermilion action text on white meets AA Large criteria.
4. **Semantics & ARIA**: Modals and sheets include `role="dialog"`, `aria-modal="true"`, and manage focus. Toasts use `role="alert"` and `aria-live="polite"`.
