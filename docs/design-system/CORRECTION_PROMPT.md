# Course-correction prompt (paste when the preview is wrong)

Use this when Claude Code's rendered preview **doesn't match** the reference screenshots — wrong spacing, colors, fonts, layout, or it invented its own look instead of following the kit.

---

```
Stop. The preview you produced does NOT match the ToLatino design. Before writing more code, re-ground yourself in the source of truth and fix what's already there.

1. Re-read these and treat them as binding (you may have skipped or drifted from them):
   - tolatino_design_kit/CLAUDE.md
   - tolatino_design_kit/DESIGN_SYSTEM.md
   - tolatino_design_kit/NEW_SCREEN_RECIPE.md
   For the screen you're building, open its target image in tolatino_design_kit/reference/screenshots/ and its source prototype in tolatino_design_kit/reference/dc/. That screenshot is the ground truth — your output must look like it.

2. Do a side-by-side audit of your current screen vs. the reference screenshot and list every difference you find, in these categories:
   - Type: font must be Plus Jakarta Sans; weights and sizes per DESIGN_SYSTEM.md. No Inter/Roboto/system fallback.
   - Color: tokens only (bg-primary #7B61FF, text-ink #1E1B2E, gold #F4B740, surfaces #fff on #F4F2F9, border-hair). No raw hex, no invented colors, no stray gradients.
   - Radius + shadow: rounded-card and shadow-card only — not default Tailwind rounded-lg / shadow-md.
   - Spacing + density: match the screenshot's padding and gaps; ToLatino is compact, not airy. Use flex/grid with gap, not ad-hoc margins.
   - Layout: mobile is a 392px PhoneFrame with a status bar, scroll area, and bottom tabs. Don't render full-bleed browser chrome for a mobile screen.
   - Components: compose from src/components/ primitives (PhoneFrame, Card, StatTile, StatusPill, SubView, Sheet, EmptyState, BottomTabs). If you hand-rolled markup that duplicates a primitive, replace it with the primitive.
   - Copy + language: Spanish-first via L('es','en'). No hardcoded English, no lorem ipsum, no placeholder labels.
   - Imagery: categoryTile() gradient placeholders, not icons-as-photos or AI illustrations. No emoji outside sanctioned brand copy.

3. Then FIX the current screen to match the reference — don't start a new one. When you're done, show me the corrected screen and the diff list so I can confirm before you continue.

Common things that go wrong: Tailwind config not merged (so bg-primary/rounded-card resolve to nothing), Plus Jakarta Sans not loaded, providers (<I18nProvider>/<BizProvider>) missing so L() and tier/category break, and rebuilding markup instead of using the primitives in src/components/. Check those first.
```

---

## If a specific thing is off, append one line
- **Colors look generic / purple is wrong:** "Tailwind tokens aren't resolving — confirm tolatino_design_kit/tailwind.config.ts is merged and bg-primary renders as #7B61FF."
- **Font is wrong:** "Plus Jakarta Sans isn't loaded — add the font and set it as the default sans; nothing should fall back to Inter/system."
- **Layout is desktop-ish for a mobile screen:** "Wrap it in the PhoneFrame primitive at 392px with status bar + bottom tabs; mobile is the source of truth."
- **It's all English:** "Wrap the app in <I18nProvider> and convert every string to L('es','en'); Spanish renders by default."
- **Spacing too loose:** "Tighten to match the screenshot — ToLatino is compact; use the gap/padding scale in DESIGN_SYSTEM.md."
