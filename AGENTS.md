# Prototype Instructions

Run the local server yourself and open the preview in the in-app browser. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Prototype decision: use the images in `public/chou-kaguyahime-posters` as rotating page backgrounds. Detect the viewport orientation, choose from `landscape/` or `portrait/`, and let a page refresh pick a new image.

Prototype decision: on mobile, the two top info cards in `.info-grid` should stay side by side with equal height, each taking half the row width.

Prototype decision: on mobile, the three `.link-grid` cards should stay in one row with equal width, each taking one third of the row.

Prototype decision: on mobile, keep the page compact and non-scrollable; leave a modest top gap for the music player, and allow slight overlap when the player is open.

Prototype decision: on mobile, bias the main content lower when bottom whitespace allows it, while keeping the page non-scrollable. The current intended mobile top padding is about 210px.

Prototype decision: keep card glass panels relatively transparent so the background artwork remains visible underneath while preserving text contrast.
