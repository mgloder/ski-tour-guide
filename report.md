# UX Enhancement Report — Ski Tour Guide

**Date:** 2026-10-25  
**Scope:** 142 concrete UX feature ideas across all modules. Grouped by area and priority.  
**Status legend:** ✓ = completed · ~ = partial · ○ = not started

---

## New Data Now Available (post-enrichment)

The enrichment pass added the following to every place:

| Field | Type | Source |
|-------|------|--------|
| `lifts_count` | INTEGER | lifts.geojson |
| `vertical_drop` | INTEGER (m) | spots.geojson (lift stations) |
| `runs_nordic` | INTEGER | runs.geojson |
| `has_night_skiing` | BOOLEAN | runs.geojson (`lit=true`) |
| `has_snow_park` | BOOLEAN | runs.geojson + spots.geojson |
| `altitude_base/peak` | INTEGER (m) | spots.geojson (lift stations) |
| `total_km` | INTEGER (km) | runs.geojson (haversine) |
| `runs_green/blue/red/black` | INTEGER | runs.geojson + difficultyConvention |
| `highlights` | TEXT[] | auto-generated |
| `description` | TEXT | auto-generated |
| `tags` | TEXT[] | recalculated + new: night-skiing, snow-park, nordic |

The `piste_cache` table also now stores `kind="lift"` features, enabling lift-specific map rendering.

---

## Section 1 — New DB Fields Not Yet in UI (15 features)

- [x] 1. **Vertical drop in place card stats line** — show `1,800m vert` next to altitude in list items
- [x] 2. **Lift count in place card** — show `42 lifts` alongside `km` stat
- [x] 3. **Night skiing badge** — moon icon on list items and map markers when `has_night_skiing=true`
- [x] 4. **Snow park badge** — park icon on items where `has_snow_park=true`
- [x] 5. **Nordic filter pill** — new terrain option "Nordic / XC" filtering `runs_nordic > 0`
- [x] 6. **Night skiing filter pill** — toggle to show only night-ski resorts
- [x] 7. **Snow park filter pill** — toggle to show only resorts with parks
- [x] 8. **Sort by vertical drop** — "Most vertical" sort option in dropdown
- [x] 9. **Sort by lift count** — "Most lifts" sort option
- [x] 10. **Lift-to-run ratio badge** — `runs / lifts` shown as density signal
- [x] 11. **Nordic km in detail panel** — "X nordic trails" stat in expanded place detail
- [x] 12. **Vertical drop in comparison strip** — `↕ Xm vert` shown below RunStrip color labels
- [x] 13. **Feature icon row on card** — compact row of badges (Night · Park · Nordic) on each card
- [x] 14. **New filter count badge** — mobile active-filter dot now counts all 6 filter dimensions
- [x] 15. **Updated filter for terrain** — Night skiing and Snow park added to TERRAIN_OPTIONS

---

## Section 2 — Map: Lift Rendering & Piste Improvements (14 features)

- [x] 16. **Show lifts on map** — `kind="lift"` GeoJSON features rendered as gray dashed lines from piste_cache
- [x] 17. **Lift/piste layer toggle** — "Pistes" / "Lifts" toggle buttons appear when piste data is loaded
- [x] 18. **Difficulty legend overlay** — Green/Blue/Red/Black color key at bottom-right when pistes visible
- [x] 19. **Piste difficulty filter on map** — filter overlay to show only selected difficulty
- [ ] 20. **Lift type icon markers** — different marker shapes for gondola vs chairlift vs t-bar
- [x] 21. **Run name tooltips** — hover/tap a piste line to show run name
- [x] 22. **Lift name tooltips** — hover a lift line to show lift name and type
- [x] 23. **Highlight beginner terrain zone** — button to fade all non-green pistes
- [x] 24. **Highlight expert terrain** — button to isolate red/black runs only
- [x] 25. **3D terrain base layer option** — swap tile style to terrain/hillshade
- [x] 26. **Satellite imagery layer** — toggle to satellite photo base layer
- [x] 27. **Map scale indicator** — add `ml.ScaleControl` for distance reference
- [x] 28. **Dark map mode** — dark base tile style option
- [x] 29. **Piste route on hover glow** — highlight selected run on hover with glow effect

---

## Section 3 — Places Explorer Filters & Sort (16 features)

- [x] 30. **Month filter** — "Best in: Dec / Jan / Feb / Mar / Apr" pills filtering `best_months` array
- [ ] 31. **Altitude range slider** — base altitude min/max range filter
- [ ] 32. **Min total km slider** — granular piste length filter (vs coarse S/M/L/XL)
- [x] 33. **Vertical drop filter** — filter by vert: `< 500m`, `500–1000m`, `1000–2000m`, `2000m+`
- [x] 34. **Multi-terrain select** — allow selecting multiple terrain types simultaneously
- [x] 35. **Sort by vertical drop** — "Most vertical first" in sort dropdown
- [x] 36. **Sort by lift count** — "Most lifts first"
- [x] 37. **Sort by Nordic trails** — "Most nordic runs"
- [x] 38. **Keyword search in highlights** — extend text search to also match `highlights` text
- [x] 39. **Active filter count on mobile tab** — blue dot shows exact count of active filters
- [x] 40. **Clear individual filters on mobile** — FilterChip row with × per active filter on mobile
- [x] 41. **Filter by country group** — region grouping (Alps, Scandinavia, North America, Japan)
- [x] 42. **Filter presets** — "Family trip" / "Expert week" / "Backcountry" one-tap preset combos
- [x] 43. **URL state sync** — persist filter state in URL query params for shareable links
- [x] 44. **Resorts near me** — geolocation button: sort by distance from user's position
- [x] 45. **Zero-result empty state** — when no results match, show nearest matches outside filters

---

## Section 4 — Place Detail Panel (16 features)

- [x] 46. **Vertical drop prominently displayed** — `Vert: 1,800m` shown in expanded detail stats
- [~] 47. **Lift count with gondola split** — lift count shown; gondola breakdown not in data
- [x] 48. **Run distribution bar** — RunStrip shows proportional G/B/R/K colored bars with counts
- [x] 49. **Best months visual** — 12-month bar heatmap showing when the resort is good
- [x] 50. **Feature badges row** — icon chips: Night skiing · Snow park · Nordic on each card
- [x] 51. **Full description text** — generated `description` shown in expanded view
- [x] 52. **Nordic trails section** — "X nordic trails" stat when `runs_nordic > 0`
- [x] 53. **Smart gear recommendations** — gear links shown in expanded detail (getRecommendedEquipment)
- [x] 54. **Required training level** — training links shown in expanded detail (getRecommendedExercises)
- [x] 55. **Open in maps button** — "Get directions" → opens Google/Apple Maps with resort coords
- [x] 56. **Copy coordinates button** — copy `lat, lng` to clipboard for GPS devices
- [x] 57. **All highlights shown** — all highlights shown (previously capped at 3)
- [x] 58. **Share button** — copy URL or share card with place name + key stats
- [x] 59. **Add to trip list** — save place to a local "My Trip" list (localStorage)
- [x] 60. **Webcam placeholder** — "Webcam" link that passes coords to webcam aggregator services
- [x] 61. **Season status** — "In season now" / "Off season" badge from `best_months` vs current month

---

## Section 5 — Map Interactions (11 features)

- [~] 62. **Cluster expansion on click** — basic zoom-in exists; fitBounds animation not added
- [x] 63. **Map viewport filter sync** — list syncs to map viewport on pan/zoom
- [ ] 64. **Place label density control** — option to show more/fewer labels
- [x] 65. **Fit to filtered results** — "Zoom to results" button at top-right of map
- [x] 66. **Hover tooltip on place markers** — name + vert/km shown on marker hover
- [ ] 67. **Mini piste preview on hover** — tiny piste thumbnail before clicking
- [x] 68. **Map attribution hidden behind toggle** — collapse attribution to keep map clean
- [ ] 69. **Keyboard navigation** — arrow keys to move between nearby places on map
- [ ] 70. **Touch gesture improvements** — two-finger rotate gesture for map bearing
- [x] 71. **Fullscreen map toggle** — expand map to full viewport, dismiss with Esc
- [x] 72. **Print/export map view** — "Print map" option for planning

---

## Section 6 — Mobile UX (13 features)

- [x] 73. **Swipe between map/list tabs** — horizontal swipe gesture in addition to tab buttons
- [ ] 74. **Bottom sheet place detail** — slide-up sheet instead of overlaid list item
- [ ] 75. **Pull-to-refresh** — pull-to-refresh gesture on list for updated data
- [ ] 76. **Sticky filter bar on scroll** — keep filter strip visible while scrolling the list
- [x] 77. **Infinite scroll on list** — replace "Show more" button with on-scroll automatic loading
- [x] 78. **Compact card mode** — option to show denser list (2 per row) on mobile
- [x] 79. **Filter modal** — "Filter" button opens full-screen modal for complex filters on mobile
- [x] 80. **Haptic feedback** — subtle vibration on filter toggle/place selection (iOS/Android)
- [x] 81. **Share place** — native share sheet (`navigator.share`) for mobile
- [ ] 82. **Add to home screen prompt** — PWA install prompt after repeated visits
- [ ] 83. **Offline mode** — service worker caches recently viewed places and piste data
- [x] 84. **Reduce motion mode** — respect `prefers-reduced-motion` for animations/transitions
- [x] 85. **Large tap targets** — all buttons/selects/inputs have minHeight 44px (Pill, mobileSelectStyle, CSS)

---

## Section 7 — Home Page (10 features)

- [x] 86. **Stats summary bar** — "2,652 destinations · 45 countries · 500k+ km of piste"
- [ ] 87. **Featured destination carousel** — rotating featured resorts with hero image + key stats
- [x] 88. **"Best for right now" section** — filter by current month's best destinations
- [ ] 89. **Module navigation cards** — visual cards for Training / Equipment / Places with progress
- [x] 90. **Training progress teaser** — "Continue your training →" if user has started training
- [x] 91. **Quick search bar** — prominent full-width search that pre-filters Places
- [x] 92. **Random destination button** — "Surprise me" → random place via MCP ski_random_place
- [x] 93. **Recent places** — "Recently viewed" strip showing last 3 places visited
- [x] 94. **Recommended for your level** — surface matching places if skill level is set (HomeClient)
- [ ] 95. **MCP API showcase** — interactive demo of the AI assistant querying places

---

## Section 8 — Cross-Module Links (10 features)

- [x] 96. **Place → equipment recommendation block** — gear links shown in expanded detail panel
- [x] 97. **Place → training block** — training exercise links shown in expanded detail panel
- [x] 98. **Equipment → places** — in equipment detail: "Best suited for: [place tags]"
- [x] 99. **Training → places** — after completing a training module: "Try these destinations now"
- [ ] 100. **Training prerequisite banner** — on advanced place: "Haven't mastered X? Train here first"
- [ ] 101. **Gear checklist for trip** — tick-box checklist from place + training recommendations
- [ ] 102. **Shared tag system** — tags like "backcountry" link Places ↔ Equipment ↔ Training
- [x] 103. **Skill gap indicator** — warning shown in detail panel when resort level exceeds quiz result
- [ ] 104. **Pack list generator** — "For [place] in [month]: here's your packing list"
- [ ] 105. **Cross-page breadcrumbs** — "Back to [place name]" when navigating from place to gear/training

---

## Section 9 — Visual & Design Improvements (12 features)

- [x] 106. **Run strip proportional widths** — RunStrip bars are proportional to run counts
- [x] 107. **Terrain diversity chart in detail** — donut chart showing G%/B%/R%/K% split
- [x] 108. **Best months heatmap** — 12 thin colored bars under best_months showing intensity
- [ ] 109. **Animated piste layer load** — piste lines draw in progressively from base to peak
- [x] 110. **Place card skeleton loading** — SkeletonCard placeholders during initial mount
- [x] 111. **Smooth filter transitions** — CSS transition via globals.css + reduceMotion check
- [x] 112. **Map marker size scaling** — scale markers by resort size (total_km)
- [ ] 113. **Altitude profile thumbnail** — small elevation profile curve in place detail
- [x] 114. **Difficulty colour legend in run strip** — G/B/R/K color labels below the RunStrip bars
- [x] 115. **Responsive typography scaling** — clamp() fluid font sizes at narrow/wide breakpoints
- [ ] 116. **Accessible colour contrast** — check green/blue/red/black against WCAG AA
- [x] 117. **Focus ring improvements** — :focus-visible outline in globals.css

---

## Section 10 — Performance & Architecture (7 features)

- [x] 118. **Filter state in URL** — `?level=advanced&terrain=powder&country=Austria` for shareable links
- [x] 119. **LocalStorage filter memory** — remember last filter state between visits
- [x] 120. **Piste GeoJSON client cache** — persist loaded piste GeoJSON in sessionStorage
- [ ] 121. **Places API pagination** — server-side pagination for `/api/places` (currently all 2652 at once)
- [ ] 122. **Incremental piste load** — stream piste features progressively
- [ ] 123. **Image CDN for resort photos** — serve via Cloudflare Images / Vercel Image Optimization
- [ ] 124. **Prefetch next page** — when user is near bottom of list, prefetch next batch

---

## Section 11 — Data & Content (8 features)

- [ ] 125. **Crowd calendar** — typical weekend vs weekday crowd levels by resort
- [ ] 126. **Season open/close dates** — typical opening and closing dates per resort
- [ ] 127. **Lift ticket price range** — approximate price per day by country
- [ ] 128. **Resort website verification** — check all `website` URLs are valid
- [x] 129. **User-submitted corrections** — inline "Report error" form in detail panel + /api/corrections
- [ ] 130. **Resort photos** — attach hero photo per place (from Unsplash API by resort name)
- [ ] 131. **Multi-language resort names** — store `name_local` for non-Latin names
- [ ] 132. **OSM quality score** — flag resorts where piste_cache has 0 features

---

## Section 12 — Advanced Features (10 features)

- [x] 133. **Trip planner** — add multiple places to a trip, localStorage-persisted trip list
- [x] 134. **Favorites / Wishlist** — localStorage-persisted starred places list
- [x] 135. **Compare mode** — select 2–3 places and view side-by-side stat table
- [x] 136. **Ski level self-assessment quiz** — 5-question quiz → sets level filter automatically
- [ ] 137. **AI resort recommender** — natural language: "find me a powder resort in Austria under 150km"
- [x] 138. **Weather integration** — OpenMeteo API call for current weather at resort lat/lng
- [ ] 139. **Snow depth integration** — link to external snow report APIs
- [ ] 140. **Community reviews** — structured review form: snow quality, crowds, value, family-friendliness
- [ ] 141. **Email digest** — "Resorts in your favourites are opening this month" notification
- [x] 142. **MCP tool enhancements** — added `ski_compare_resorts`, `ski_get_weather`, `ski_random_place` tools

---

## Progress Summary

**Completed: 96 / 142**

| Section | Done | Total |
|---------|------|-------|
| 1 — New DB fields in UI | 12 | 15 |
| 2 — Map: lifts & pistes | 13 | 14 |
| 3 — Filters & sort | 14 | 16 |
| 4 — Place detail panel | 16 | 16 |
| 5 — Map interactions | 7 | 11 |
| 6 — Mobile UX | 8 | 13 |
| 7 — Home page | 7 | 10 |
| 8 — Cross-module links | 5 | 10 |
| 9 — Visual & design | 9 | 12 |
| 10 — Performance | 3 | 7 |
| 11 — Data & content | 1 | 8 |
| 12 — Advanced features | 6 | 10 |

---

## Implementation Priorities

### Tier 1 — Quick wins (data already available, UI change only)
- [x] 1, 2, 3, 4, 5, 6, 7, 8, 13, 16, 17, 18, 33, 35, 36, 46, 50, 51
- [x] 48 (RunStrip = proportional bar chart), 57, 61, 63, 65, 66, 96, 97, 106, 114
- [ ] 10, 47, 64 — remaining Tier 1 items

### Tier 2 — Medium effort (new component or logic needed)
- [ ] 9, 14, 15, 19, 20, 28, 30, 31, 34, 40, 43, 44, 45, 53, 71, 73, 77, 86, 88, 118

### Tier 3 — Larger features (new data, API, or multi-page work)
- [ ] 60, 62, 79, 83, 87, 91, 93, 99, 100, 125, 127, 130, 133–142

---

*Total: 142 distinct UX enhancement features · 96 completed · 2 partial*
