# Pokémon Team Builder

Build a team of up to 6 Pokémon and instantly see where it's strong and where it's exposed: which attacking types threaten it, which types it hits super-effectively, how its base stats look, and what type would make a good next pick.

Data comes from the PokéAPI. It's a static site (React + TypeScript + Vite) with no backend and no login — everything runs in the browser.

**Live:** https://daviarendreis.github.io/pokemon-team-builder/

> **How this was built:** This project is an experiment in AI agent orchestration. I designed it, set its scope, and reviewed the result, but the code itself was written by AI agents rather than by hand. I'm sharing it as an honest example of that workflow, not as hand-written work.

## What it does

Building a balanced team means cross-checking the 18×18 type chart for every member, which gets tedious fast. The app answers that in one place:

- **Team & search** — search by name with autocomplete, fill 6 slots, open any Pokémon for its art, stats, abilities and Pokédex entry.
- **Weaknesses** — for all 18 attacking types: who's weak (×2, ×4), who resists, who's immune, worst threats first.
- **Offensive coverage** — which defending types the team can hit hard (same-type attacks), and where the gaps are.
- **Base stats** — each member's stats, team averages, and flags like "slow team" or "strong special attacker".
- **Type suggestions** — up to three types that best cover the team's open weaknesses, with the reasoning behind each.
- **Saved teams & sharing** — save teams locally, share via link, or export/import in Showdown format.

## How it works

Weaknesses and coverage come from multiplying each Pokémon's type damage relations (from the PokéAPI). The suggestion engine scores all 18 single types and 153 type pairs as a possible next member, rewarding coverage of open weaknesses and penalizing new ones. Abilities, items and moves aren't considered — the analysis looks only at types.

## Tech

- React
- TypeScript
- Vite
- PokéAPI

## Credits

Data and images from the PokéAPI. Pokémon and its names are trademarks of Nintendo, Game Freak and The Pokémon Company. This is a non-commercial fan project with no official affiliation.
