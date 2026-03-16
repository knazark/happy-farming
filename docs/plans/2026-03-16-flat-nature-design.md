# Flat Nature Design — Happy Farmer

**Style**: Flat Modern + Nature Minimal + Clean Grid
**Date**: 2026-03-16

## Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| bg-page | #F5F7F3 | Body background |
| bg-canvas | #E8F0E4 | Canvas flat background |
| bg-card | #FFFFFF | Panels, plots, modals |
| accent | #22C55E | Buttons, progress, active tabs |
| accent-amber | #F59E0B | Coins, XP, ready state |
| text-primary | #1A2E1A | Headings, labels |
| text-secondary | #6B7B6B | Descriptions, hints |
| danger | #EF4444 | Locked, missing ingredients |
| border | #E2E8DE | All borders |
| shadow | 0 1px 3px rgba(0,0,0,0.06) | Card shadows |

## HUD — Compact Header Bar

- Height: 48px, white bg, bottom shadow
- Layout: avatar (32px circle, mint bg) | name (600 weight) | level pill (#22C55E bg) | XP bar (6px, thin) | coins pill | fertilizer pill
- Font: system sans-serif, 14px base

## Canvas — Clean Grid

- Flat #E8F0E4 background, no texture, no fence, no farm header
- 4px gap between cells (visible background between plots)
- Plot empty: white, 1px #E2E8DE border, r12, subtle "+" hint
- Plot growing: white bg, emoji centered, thin progress bar bottom (#22C55E)
- Plot ready: white bg, 2px #F59E0B border, subtle amber glow, 2px bounce
- Plot locked: #F0F0F0 bg, lock at 0.4 opacity, no crosshatch
- GRID_Y_START reduced (no header needed)

## Bottom Bar — iOS Tab Bar

- White bg, border-top 1px #E2E8DE
- backdrop-filter: blur(12px), rgba(255,255,255,0.85)
- Active: #22C55E icon, bold label
- Inactive: #6B7B6B
- Badge: small #EF4444 dot (no number)

## Shop Sidebar

- White bg, border-left 1px #E2E8DE
- Tabs: pill-shaped, active = #22C55E bg white text
- Items: horizontal cards with emoji, name, price
- Buy button: #22C55E pill, hover scale 1.02
- Locked: opacity 0.4, "Рів. N" badge

## Animal Pen

- No hay texture, no fences
- Thin 1px #E2E8DE separator line below grid
- Animals as pill cards: emoji + count + mini progress bar
- Ready: amber dot indicator

## Modals

- White, r16, shadow 0 8px 32px rgba(0,0,0,0.12)
- Overlay: rgba(0,0,0,0.2) + blur(8px)
- Animation: fade + scale 0.95 -> 1.0

## Animations

- Hover: #22C55E border 0.5 opacity, 150ms
- Ready bounce: 2px, ease-in-out
- Particles: minimal — only +coins on harvest, fade-up
- Progress: transition width 0.5s ease
