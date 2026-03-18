# THE LO - Comprehensive UI/UX Audit Report

**Date:** 2026-03-18
**Audited by:** Claude Code
**Scope:** All frontend screens (`HomeScreen.tsx`, `SignInScreen.tsx`, `AppRoot.tsx`, `Inspo.html`)

---

## Anti-Patterns Verdict

**PASS (mostly).** This does NOT look AI-generated. The dark theme is intentional and consistent with the product's nightlife/campus-event identity, not a generic AI aesthetic. The monochrome palette is a deliberate design choice, not lazy defaults. No gradient text, no glassmorphism, no hero metrics dashboard, no generic card grids with purple-to-blue gradients.

**However**, there are a few borderline tells:
- The `Inspo.html` design reference uses `backdrop-blur`, frosted glass handles, and glow effects that flirt with glassmorphism territory -- but the actual RN app is restrained and avoids this.
- The ALL-CAPS-EVERYTHING treatment across every label, button, and title is heavy-handed and reduces readability. This reads more like a style preference than an AI tell, but it's worth noting.

---

## Executive Summary

| Severity | Count |
|----------|-------|
| Critical | 3 |
| High | 7 |
| Medium | 9 |
| Low | 5 |
| **Total** | **24** |

**Top 5 Critical Issues:**
1. Sign-in has no actual authentication -- any input passes
2. Missing accessibility labels on all interactive elements
3. Touch targets below 44x44px on multiple controls
4. 1,870-line monolith HomeScreen with zero component extraction
5. Google Maps API key exposed in client-side WebView HTML

**Overall Quality:** The code is functional and the design is cohesive. The dark theme, uppercase typography, and minimal chrome create a distinctive brand. But the app has significant accessibility gaps, a maintainability problem (single massive file), and several UX sharp edges.

---

## Detailed Findings by Severity

### Critical Issues

#### C1. Fake Authentication

- **Location:** `SignInScreen.tsx:56-60`, `AppRoot.tsx:13`
- **Category:** Security / UX
- **Description:** The sign-in button calls `onSignIn()` directly without validating credentials. Any non-empty email+password passes. No API call, no validation, no error state.
- **Impact:** Users may enter real credentials expecting security. No actual auth means no user identity, no data isolation.
- **Recommendation:** Either implement real auth or remove the sign-in screen entirely and add it later. A fake login form is worse than no login form.

#### C2. Zero Accessibility Labels

- **Location:** All interactive elements across `HomeScreen.tsx` and `SignInScreen.tsx`
- **Category:** Accessibility (WCAG 2.1 A - 4.1.2 Name, Role, Value)
- **Description:** No `accessibilityLabel`, `accessibilityRole`, or `accessibilityHint` props on any `TouchableOpacity`, `Pressable`, or `TextInput`. Screen readers cannot identify any interactive element.
- **Impact:** App is completely unusable for screen reader users. This is a WCAG A failure.
- **Recommendation:** Add `accessibilityLabel` and `accessibilityRole` to every interactive element. Examples:
  - `<TouchableOpacity accessibilityLabel="Sign out" accessibilityRole="button">`
  - `<TextInput accessibilityLabel="Email address" />`
  - `<Pressable accessibilityLabel="Add marker" accessibilityRole="button">`

#### C3. Sub-Minimum Touch Targets

- **Location:** `HomeScreen.tsx:1503-1512` (close button 20x20), `HomeScreen.tsx:1367-1384` (marker button 36x36), `HomeScreen.tsx:1392-1404` (controls toggle 36x36), `HomeScreen.tsx:1423-1432` (control buttons 36x36), `HomeScreen.tsx:1605-1615` (counter pills height 30)
- **Category:** Accessibility (WCAG 2.5.5 Target Size)
- **Description:** Multiple interactive elements are below the 44x44px minimum. The close button is only 20x20px. Map control buttons are 36x36px. Counter pills are 30px tall.
- **Impact:** Difficult to tap on mobile, especially for users with motor impairments.
- **Recommendation:** Increase all touch targets to minimum 44x44px. Use `hitSlop` for elements that need to stay visually small.

---

### High-Severity Issues

#### H1. Monolith Component (1,870 lines)

- **Location:** `HomeScreen.tsx` (entire file)
- **Category:** Maintainability
- **Description:** A single file contains the map HTML builder, all event handlers, all UI rendering, all styles, helper functions, persistence logic, and API calls. No component extraction.
- **Impact:** Extremely difficult to maintain, test, or debug. Any change risks regressions elsewhere.
- **Recommendation:** Extract into components: `MapView`, `EventDetailSheet`, `LiveSignalsList`, `MarkerNameModal`, `AddMarkerModal`, `MapControls`. Extract hooks: `useMarkers`, `useViewerId`, `useMapBridge`.

#### H2. Hardcoded Colors (No Design Tokens)

- **Location:** Throughout both screen files. Examples: `#050505`, `#0a0a0a`, `#1c1c1e`, `#161616`, `#6b7280`, `#9ca3af`, `rgba(255,255,255,0.05)`, `rgba(255,255,255,0.08)`
- **Category:** Theming
- **Description:** Every color is a hardcoded hex/rgba value. The same colors repeat dozens of times across both files with no shared constants or theme object.
- **Impact:** No dark/light mode switching. Color changes require find-and-replace across all files. Inconsistencies will creep in.
- **Recommendation:** Create a `theme.ts` with named tokens: `colors.surface`, `colors.surfaceElevated`, `colors.textPrimary`, `colors.textSecondary`, `colors.border`, etc.

#### H3. No Error Handling in Place Search

- **Location:** `HomeScreen.tsx:296-344` (`searchLocalPlace`)
- **Category:** Resilience
- **Description:** The Google Places API fetch has no try/catch, no timeout, no error UI. If the network request fails, the loading spinner may spin forever (only `finally` clears `isAddingMarker`, but a thrown error would propagate).
- **Impact:** Users get stuck with a loading spinner on network failure.
- **Recommendation:** Wrap in try/catch with user-facing error message. Add a timeout.

#### H4. API Key in Client-Side HTML

- **Location:** `HomeScreen.tsx:346-557` (`buildMapHtml`)
- **Category:** Security
- **Description:** The Google Maps API key is embedded directly in the WebView HTML string, which is constructed client-side. While this is common for Maps JS API, the key is also used for Places Text Search (`searchLocalPlace` line 301-305), which should be server-side.
- **Impact:** API key is extractable from the app bundle. Places API calls should go through a backend to prevent abuse.
- **Recommendation:** Keep Maps JS API key client-side (with HTTP referrer restrictions), but proxy Places API calls through a backend.

#### H5. Fixed Height Bottom Sheet (320px)

- **Location:** `HomeScreen.tsx:1709-1718` (`sheet` style)
- **Category:** Responsive Design
- **Description:** The "LIVE SIGNALS" bottom sheet has a fixed `height: 320`. On smaller devices (iPhone SE, etc.) this may consume too much screen space. On tablets, it's too small.
- **Impact:** Poor layout scaling across device sizes.
- **Recommendation:** Use `flex` ratios or percentage-based heights. Consider a draggable sheet.

#### H6. No Loading State for Map

- **Location:** `HomeScreen.tsx:963-976`
- **Category:** UX
- **Description:** The WebView loads Google Maps with no loading indicator. Users see a black rectangle until the map tiles load.
- **Impact:** Users may think the app is broken during the 1-3 second map load.
- **Recommendation:** Add an `ActivityIndicator` or skeleton state while `isMapWebViewReady` is false.

#### H7. No Keyboard Dismissal

- **Location:** `HomeScreen.tsx:1101-1108` (description input), modal inputs
- **Category:** UX
- **Description:** No `ScrollView keyboardDismissMode` or `Keyboard.dismiss()` on tap-outside. The keyboard can get stuck open.
- **Impact:** Users must use the hardware back button or swipe to dismiss keyboard.
- **Recommendation:** Wrap content in `TouchableWithoutFeedback` with `Keyboard.dismiss`, or use `keyboardDismissMode="on-drag"` on ScrollViews.

---

### Medium-Severity Issues

#### M1. Missing `key` Stability

- **Location:** `HomeScreen.tsx:1160` (`mediaUrls.map((mediaUrl) => ... key={mediaUrl}`)
- **Category:** Performance
- **Description:** Using URL strings as keys. If URLs are duplicated (same image added twice), React will have key collisions.
- **Impact:** Potential rendering bugs with duplicate media.
- **Recommendation:** Use index or a unique ID instead.

#### M2. `useMemo` Missing for `mapHtml`

- **Location:** `HomeScreen.tsx:579`
- **Category:** Performance
- **Description:** `buildMapHtml(googleMapsApiKey)` is called on every render. It builds a large HTML string that only depends on the API key (which never changes).
- **Impact:** Unnecessary string allocation on every re-render.
- **Recommendation:** Wrap in `useMemo(() => buildMapHtml(googleMapsApiKey), [googleMapsApiKey])`.

#### M3. No Form Validation on Sign-In

- **Location:** `SignInScreen.tsx:22`
- **Category:** UX
- **Description:** `canSignIn` only checks non-empty. No email format validation, no minimum password length, no error messages.
- **Impact:** Users can submit `"x"` as email and `"y"` as password with no feedback.
- **Recommendation:** Add email regex validation and minimum password length with inline error messages.

#### M4. No Empty State Animation or CTA

- **Location:** `HomeScreen.tsx:1193-1197`
- **Category:** UX / Onboarding
- **Description:** The empty state is just static text: "NO MARKERS YET / TAP THE MAP TO ADD A MARKER." No visual indication of where to tap, no animation drawing attention.
- **Impact:** First-time users may not understand how to start.
- **Recommendation:** Add an arrow/animation pointing to the map, or a more prominent CTA button.

#### M5. Inconsistent Button Components

- **Location:** Throughout `HomeScreen.tsx`
- **Category:** Consistency
- **Description:** Mixed use of `TouchableOpacity` and `Pressable` for buttons with no clear pattern. Some have press feedback, some don't.
- **Impact:** Inconsistent tap feedback across the app.
- **Recommendation:** Standardize on one component (prefer `Pressable` with consistent pressed styles).

#### M6. Delete Button Has No Confirmation

- **Location:** `HomeScreen.tsx:833-851` (`handleDeleteSelectedEvent`)
- **Category:** UX
- **Description:** Tapping "DELETE EVENT" immediately deletes with no confirmation dialog. This is a destructive action.
- **Impact:** Accidental deletion with no undo.
- **Recommendation:** Add `Alert.alert` confirmation before deletion.

#### M7. Potential XSS in WebView Bridge

- **Location:** `HomeScreen.tsx:600-614` (`syncMarkersToMap`), lines 616-627, 748-758
- **Category:** Security
- **Description:** Marker data is JSON-stringified and injected into JavaScript via string interpolation. While the `.replace()` calls handle backslashes and single quotes, this is a fragile sanitization approach.
- **Impact:** A marker name containing certain special characters could break the injected JS or potentially execute arbitrary code in the WebView context.
- **Recommendation:** Use `postMessage` / `onMessage` bridge pattern exclusively instead of `injectJavaScript` with string interpolation.

#### M8. No Heading Hierarchy

- **Location:** All screens
- **Category:** Accessibility (WCAG 1.3.1 Info and Relationships)
- **Description:** All text uses `<Text>` with no `accessibilityRole="header"` or heading level indication. Screen readers can't navigate by headings.
- **Impact:** Poor navigation for assistive technology users.
- **Recommendation:** Add `accessibilityRole="header"` to "THE LO", "EVENT DETAILS", "LIVE SIGNALS", section labels.

#### M9. Notification Toggle Has No Visual Feedback

- **Location:** `HomeScreen.tsx:1130-1136`
- **Category:** UX
- **Description:** The notification bell icon changes between outline and off-outline, but there's no toast, haptic, or text confirmation that notifications were toggled.
- **Impact:** Users may not notice the state change, especially given the small icon size.
- **Recommendation:** Add a brief toast or haptic feedback on toggle.

---

### Low-Severity Issues

#### L1. Unused Styles

- **Location:** `HomeScreen.tsx:1719-1734` (`addMarkerContainer`, `markerInput`)
- **Category:** Code Quality
- **Description:** These styles are defined but never referenced in the JSX.
- **Impact:** Dead code / minor bundle bloat.
- **Recommendation:** Remove unused styles.

#### L2. `Inspo.html` in Project Root

- **Location:** `/Inspo.html` (untracked)
- **Category:** Project Hygiene
- **Description:** Design reference HTML file sitting untracked in the project root.
- **Impact:** Clutters the project. May confuse contributors.
- **Recommendation:** Move to `docs/` or add to `.gitignore`.

#### L3. Mixed Text Sizing Strategy

- **Location:** Throughout styles
- **Category:** Typography
- **Description:** Font sizes range from 8px to 42px with no clear type scale. Sizes used: 9, 10, 11, 12, 14, 15, 16, 30, 42.
- **Impact:** No systematic typography. Hard to maintain consistency.
- **Recommendation:** Define a type scale (e.g., 10, 12, 14, 18, 24, 32) and stick to it.

#### L4. No Image Error Handling

- **Location:** `HomeScreen.tsx:1169`
- **Category:** Resilience
- **Description:** `<Image source={{ uri: mediaUrl }} />` has no `onError` fallback. If the Unsplash URL 404s, users see a blank space.
- **Impact:** Broken images with no fallback.
- **Recommendation:** Add `onError` with a placeholder icon.

#### L5. Event Date Always "Now"

- **Location:** `HomeScreen.tsx:122`
- **Category:** UX
- **Description:** `buildMarkerFromLocation` always sets `eventDateTimeIso` to `new Date().toISOString()`. Users can't set a future event time.
- **Impact:** All events show as "just created" with no scheduling capability.
- **Recommendation:** Add a date/time picker in the marker creation flow.

---

## Patterns & Systemic Issues

| Pattern | Occurrences | Impact |
|---------|-------------|--------|
| Hardcoded colors (no tokens) | 50+ instances across 2 files | Theme changes require mass find-replace |
| Missing `accessibilityLabel` | Every interactive element (~30+) | App is unusable with screen readers |
| Sub-44px touch targets | 8+ elements | Accessibility & usability failure on mobile |
| String-interpolated JS injection | 5 instances in HomeScreen | Fragile, potential injection risk |
| ALL-CAPS on every text element | ~95% of visible text | Reduced readability, visual monotony |

---

## Positive Findings

- **Cohesive visual identity.** The dark theme, uppercase typography, and minimal chrome create a distinctive, branded feel that matches the nightlife/campus-event domain.
- **Clean data hydration.** `hydrateStoredMarker()` (lines 183-226) is a well-structured validation function that safely handles corrupted persisted data.
- **Good use of `useCallback`.** Event handlers are properly memoized with correct dependency arrays.
- **Smart place search scoring.** The `scorePlaceMatch` function (lines 277-294) considers name match quality, place type relevance, and distance -- a thoughtful ranking algorithm.
- **Proper cleanup patterns.** Effects use `isMounted` flags to prevent state updates after unmount.
- **KeyboardAvoidingView on sign-in.** Platform-aware keyboard handling on the sign-in screen.

---

## Recommendations by Priority

### 1. Immediate (Critical blockers)
- Add `accessibilityLabel` and `accessibilityRole` to all interactive elements
- Increase all touch targets to minimum 44px (use `hitSlop` where needed)
- Add delete confirmation dialog

### 2. Short-term (This sprint)
- Extract HomeScreen into smaller components and custom hooks
- Create a shared theme/tokens file for colors
- Add loading state for map WebView
- Add error handling to `searchLocalPlace`
- Add keyboard dismissal behavior

### 3. Medium-term (Next sprint)
- Replace `injectJavaScript` string interpolation with `postMessage` bridge
- Implement real authentication or remove fake sign-in
- Add form validation with error messages
- Improve first-time onboarding / empty state

### 4. Long-term
- Define a type scale and normalize typography
- Add image error fallbacks
- Add event scheduling (date/time picker)
- Implement responsive sheet heights

---

## Suggested Fix Commands

| Command | Issues Addressed | Description |
|---------|-----------------|-------------|
| `/harden` | C2, H3, H4, H7, M6, M7, M8 | Add accessibility labels, error handling, delete confirmation, keyboard dismissal, fix WebView injection |
| `/extract` | H1 | Break HomeScreen into components and hooks |
| `/normalize` | H2, M5 | Create design tokens, standardize button components |
| `/polish` | C3, H6 | Fix touch targets, add map loading state |
| `/adapt` | H5 | Make bottom sheet responsive across device sizes |
| `/optimize` | M2 | Memoize mapHtml and fix key stability |
| `/clarify` | M3 | Add form validation and error messages |
| `/onboard` | M4 | Improve empty state and first-time experience |
| `/typeset` | L3 | Define and apply a systematic type scale |
| `/delight` | M9 | Add haptic/toast feedback for toggle actions |
