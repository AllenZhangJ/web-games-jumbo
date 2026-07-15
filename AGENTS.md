# Project Guidance

## Scope

This repository contains only Number Strategy Jump. Do not add sibling games or unrelated applications.

## Language

- Communicate project decisions and commits in Chinese.
- Keep identifiers and code comments consistent with the source language during migration.

## Read First

- `docs/README.md`
- `docs/repository-structure.md`
- `docs/runtime-flow.md`
- `docs/governance/roadmap.md`
- `docs/governance/status.md`
- `docs/governance/batch-checklist.md`

## Architecture Boundaries

- Gameplay, task, difficulty, jump physics, collision, and world truth must not import Three.js, DOM, `wx`, or `tt`.
- Renderer, scene, character, audio, and haptics consume snapshots/events and never decide gameplay results.
- Platform APIs belong only to platform adapters and the app composition root.
- New gameplay, task, and character variants use versioned registries instead of `if/else` ID switches.
- Keep the repository as a modular monolith with private workspaces; do not introduce services or remote runtime plugins.

## Batch Protocol

- Execute governance batches sequentially: batch 0, P0–P2, P3–P5, P6–P8, P9–P10, then final verification.
- Before every batch commit, audit robustness, races, fallbacks, boundaries, Web lifecycle, main flows, tests, builds, and staged files.
- Fix blocking findings before committing.
- Calibrate documentation to the actual current state, including incomplete and uncertain items.
- Use Chinese commits, push the batch branch, and verify the remote hash before starting the next batch.

## Commands

- `npm test`
- `npm run build`
- `npm run check`

New quality commands become mandatory after they are introduced by an accepted governance batch.

## TypeScript End State

- New workspace modules are TypeScript from batch 1 onward.
- By the end of batch 4, all maintained source, tests, entries, platform adapters, and build logic must be TypeScript.
- Do not leave parallel JavaScript implementations or permanent migration shims.
