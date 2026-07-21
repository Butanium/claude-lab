# Deprecated scripts

- `install-plugin-locally.sh` — symlinked a plugin dir's agents/skills/hooks into a repo's `.claude/` (workaround for GH #17688). Deprecated 2026-07-20: the repo dropped the plugin-dir layout and moved canonical content to `.claude/` directly, so the plugin-dir argument and frontmatter-name extraction became dead weight. Replaced by `scripts/install-clab.sh` (self-locating, symlinks whole skill dirs so helper files like `count_budget.py` come along).
