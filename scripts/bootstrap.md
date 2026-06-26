# scripts/bootstrap

What a fresh setup runs (documented; automated in Phase 1):

```bash
pnpm install                      # TS workspace deps (packages/* + services/*)
cd workers && uv sync && cd ..    # Python worker deps into .venv
cp .env.example .env              # then fill required values (see docs/CONFIG_SYSTEM.md)
pnpm run check                    # validate config schema + module manifests + registries
```

Prerequisites: Node 20+, pnpm 9+, Python 3.12+, uv.
