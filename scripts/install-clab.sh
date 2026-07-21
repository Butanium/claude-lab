#!/bin/bash
# Symlink clab agents, skills, and hooks from this repo's .claude/ into the
# current directory's .claude/ (run from a consuming repo's root).
#
# Agents must load as LOCAL agents because plugin-shipped agents don't support
# frontmatter hooks (by design since ~CC 2.1.x — security restriction), and the
# per-agent hooks are the whole point of clab. Agent hook commands use
# "$CLAUDE_PROJECT_DIR"/.claude/hooks/clab/... which resolves in any consuming repo.
#
# Usage (from the consuming repo's root):
#   /path/to/claude-lab/scripts/install-clab.sh [--force] [--uninstall]

set -euo pipefail

SRC_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$SRC_ROOT/.claude"
TARGET="$(pwd)/.claude"

if [[ "$(pwd)" == "$SRC_ROOT" ]]; then
    echo "This is the clab source repo itself — nothing to install." >&2
    exit 0
fi

FORCE=false
UNINSTALL=false
for arg in "$@"; do
    case "$arg" in
        --force) FORCE=true ;;
        --uninstall) UNINSTALL=true ;;
        *) echo "error: unknown flag '$arg'" >&2; exit 1 ;;
    esac
done

# --- Collect (src, dst) pairs: agent files, skill dirs, hooks dir ---

declare -a SRCS=() DSTS=()
for f in "$SRC"/agents/*.md; do
    [[ -f "$f" ]] || continue
    SRCS+=("$f"); DSTS+=("$TARGET/agents/$(basename "$f")")
done
for d in "$SRC"/skills/*/; do
    [[ -d "$d" ]] || continue
    SRCS+=("${d%/}"); DSTS+=("$TARGET/skills/$(basename "$d")")
done
[[ -d "$SRC/hooks/clab" ]] && { SRCS+=("$SRC/hooks/clab"); DSTS+=("$TARGET/hooks/clab"); }

# --- Uninstall: only remove symlinks that point into this repo ---

if $UNINSTALL; then
    for dst in "${DSTS[@]}"; do
        if [[ -L "$dst" && "$(readlink -f "$dst")" == "$SRC_ROOT"/* ]]; then
            rm "$dst"
            echo "  removed $dst"
        elif [[ -e "$dst" ]]; then
            echo "  skipped $dst (not a clab symlink)" >&2
        fi
    done
    echo "Done."
    exit 0
fi

# --- Pre-flight: fail on any existing target unless --force ---

if ! $FORCE; then
    conflicts=()
    for dst in "${DSTS[@]}"; do
        [[ -e "$dst" || -L "$dst" ]] && conflicts+=("$dst")
    done
    if [[ ${#conflicts[@]} -gt 0 ]]; then
        echo "error: targets already exist (use --force, or --uninstall first):" >&2
        printf '  %s\n' "${conflicts[@]}" >&2
        exit 1
    fi
fi

# --- Install ---

for i in "${!SRCS[@]}"; do
    dst="${DSTS[$i]}"
    mkdir -p "$(dirname "$dst")"
    ln -sfn "${SRCS[$i]}" "$dst"
    echo "  ${dst#"$(pwd)"/} -> ${SRCS[$i]}"
done
echo "Installed ${#SRCS[@]} symlink(s). Restart Claude Code (or /reload-plugins for skills)."
