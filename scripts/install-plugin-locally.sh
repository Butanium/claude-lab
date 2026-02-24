#!/usr/bin/env bash
# Workaround for GH #17688: plugin agent/skill frontmatter hooks don't fire.
# Symlinks plugin agents, skills, hooks, tools, and examples into .claude/
# so they're loaded by the local agent loader (iH5) which correctly parses hooks.
#
# Prerequisites: hook commands must use "$CLAUDE_PROJECT_DIR"/... paths
# (not ${CLAUDE_PLUGIN_ROOT}) since local agents don't get CLAUDE_PLUGIN_ROOT.
#
# Usage:
#   ./scripts/install-plugin-locally.sh <plugin-dir> [--force] [--uninstall]

set -euo pipefail

PROJECT_ROOT="$(pwd)"
CLAUDE_DIR="$PROJECT_ROOT/.claude"

# --- Argument parsing ---

PLUGIN_DIR=""
FORCE=false
UNINSTALL=false

for arg in "$@"; do
    case "$arg" in
        --force) FORCE=true ;;
        --uninstall) UNINSTALL=true ;;
        -*) echo "error: unknown flag '$arg'" >&2; exit 1 ;;
        *) PLUGIN_DIR="$arg" ;;
    esac
done

if [[ -z "$PLUGIN_DIR" ]]; then
    echo "usage: $0 <plugin-dir> [--force] [--uninstall]" >&2
    exit 1
fi

PLUGIN_DIR="$(cd "$PROJECT_ROOT" && realpath "$PLUGIN_DIR")"

# --- Validation ---

if [[ ! -d "$PLUGIN_DIR" ]]; then
    echo "error: plugin directory does not exist: $PLUGIN_DIR" >&2
    exit 1
fi

PLUGIN_JSON="$PLUGIN_DIR/.claude-plugin/plugin.json"
if [[ ! -f "$PLUGIN_JSON" ]]; then
    echo "error: not a valid plugin (missing .claude-plugin/plugin.json): $PLUGIN_DIR" >&2
    exit 1
fi

PLUGIN_NAME="$(python3 -c "import json,sys; print(json.load(open(sys.argv[1]))['name'])" "$PLUGIN_JSON")"

# Check for CLAUDE_PLUGIN_ROOT references (should have been replaced with CLAUDE_PROJECT_DIR)
bad_refs="$(grep -rl 'CLAUDE_PLUGIN_ROOT' "$PLUGIN_DIR/agents" "$PLUGIN_DIR/skills" "$PLUGIN_DIR/hooks" "$PLUGIN_DIR/tools" "$PLUGIN_DIR/examples" 2>/dev/null || true)"
if [[ -n "$bad_refs" ]]; then
    echo "error: found \${CLAUDE_PLUGIN_ROOT} references (must use \"\$CLAUDE_PROJECT_DIR\" instead):" >&2
    echo "$bad_refs" | sed 's/^/  /' >&2
    exit 1
fi

echo "Plugin: $PLUGIN_NAME ($PLUGIN_DIR)"

# --- Helper: extract frontmatter 'name' field ---

extract_name() {
    python3 -c "
import sys, re
content = open(sys.argv[1]).read()
m = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
if not m: sys.exit(1)
for line in m.group(1).splitlines():
    k, _, v = line.partition(':')
    if k.strip() == 'name':
        print(v.strip().strip('\"').strip(\"'\"))
        sys.exit(0)
sys.exit(1)
" "$1"
}

# --- Collect agents and skills ---

declare -a SOURCES=() DESTS=() LABELS=() NAMES=()

if [[ -d "$PLUGIN_DIR/agents" ]]; then
    for src in "$PLUGIN_DIR/agents/"*.md; do
        [[ -f "$src" ]] || continue
        name="$(extract_name "$src")" || { echo "warning: skipping $src (no 'name')" >&2; continue; }
        SOURCES+=("$src"); DESTS+=("$CLAUDE_DIR/agents/$name.md"); LABELS+=("agent"); NAMES+=("$name")
    done
fi

if [[ -d "$PLUGIN_DIR/skills" ]]; then
    for skill_dir in "$PLUGIN_DIR/skills"/*/; do
        [[ -d "$skill_dir" ]] || continue
        src="$skill_dir/SKILL.md"
        [[ -f "$src" ]] || continue
        name="$(extract_name "$src")" || { echo "warning: skipping $src (no 'name')" >&2; continue; }
        SOURCES+=("$src"); DESTS+=("$CLAUDE_DIR/skills/$name/SKILL.md"); LABELS+=("skill"); NAMES+=("$name")
    done
fi

# --- Detect directory-level symlink dirs (hooks, tools, examples) ---

DIR_TYPES=("hooks" "tools" "examples")
declare -a DIR_SRCS=() DIR_DSTS=()

for dir_type in "${DIR_TYPES[@]}"; do
    if [[ -d "$PLUGIN_DIR/$dir_type" ]]; then
        DIR_SRCS+=("$PLUGIN_DIR/$dir_type")
        DIR_DSTS+=("$CLAUDE_DIR/$dir_type/$PLUGIN_NAME")
    fi
done

if [[ ${#SOURCES[@]} -eq 0 && ${#DIR_SRCS[@]} -eq 0 ]]; then
    echo "Nothing to install."; exit 0
fi

# --- Pre-flight: check ALL targets before writing anything ---

if ! $FORCE && ! $UNINSTALL; then
    conflicts=()
    for dst in "${DESTS[@]}"; do
        [[ -e "$dst" ]] && conflicts+=("$dst")
    done
    for dst in "${DIR_DSTS[@]}"; do
        [[ -e "$dst" ]] && conflicts+=("$dst")
    done
    if [[ ${#conflicts[@]} -gt 0 ]]; then
        echo "error: the following targets already exist:" >&2
        printf '  %s\n' "${conflicts[@]}" >&2
        echo "Use --force to overwrite, or --uninstall first." >&2
        exit 1
    fi
fi

# --- Uninstall ---

if $UNINSTALL; then
    echo "Uninstalling $PLUGIN_NAME..."
    for i in "${!DESTS[@]}"; do
        dst="${DESTS[$i]}"
        if [[ -L "$dst" ]]; then
            rm "$dst"
            echo "  removed ${LABELS[$i]}: ${NAMES[$i]}"
            # Clean up empty skill dirs
            parent="$(dirname "$dst")"
            rmdir "$parent" 2>/dev/null || true
        elif [[ -e "$dst" ]]; then
            echo "  skipped ${NAMES[$i]} (not a symlink, won't remove)" >&2
        fi
    done
    for i in "${!DIR_DSTS[@]}"; do
        dst="${DIR_DSTS[$i]}"
        dir_type="$(basename "$(dirname "$dst")")"
        if [[ -L "$dst" ]]; then
            rm "$dst"
            echo "  removed $dir_type: $PLUGIN_NAME"
        elif [[ -e "$dst" ]]; then
            echo "  skipped $dir_type (not a symlink, won't remove)" >&2
        fi
    done
    echo "Done."
    exit 0
fi

# --- Install ---

echo "Installing $PLUGIN_NAME..."
n_agents=0 n_skills=0

for i in "${!SOURCES[@]}"; do
    src="${SOURCES[$i]}" dst="${DESTS[$i]}" label="${LABELS[$i]}" name="${NAMES[$i]}"

    if [[ -e "$dst" ]]; then
        if $FORCE; then
            rm "$dst"
        fi
    fi

    mkdir -p "$(dirname "$dst")"
    rel="$(realpath --relative-to="$(dirname "$dst")" "$src")"
    ln -s "$rel" "$dst"
    echo "  ${label}: ${name} -> $(basename "$src")"

    case "$label" in agent) n_agents=$((n_agents + 1)) ;; skill) n_skills=$((n_skills + 1)) ;; esac
done

# --- Install directory-level symlinks (hooks, tools, examples) ---

n_dirs=0
for i in "${!DIR_SRCS[@]}"; do
    src="${DIR_SRCS[$i]}" dst="${DIR_DSTS[$i]}"
    dir_type="$(basename "$(dirname "$dst")")"

    if [[ -e "$dst" ]]; then
        if $FORCE; then
            rm -f "$dst"
        fi
    fi
    mkdir -p "$(dirname "$dst")"
    rel="$(realpath --relative-to="$(dirname "$dst")" "$src")"
    ln -s "$rel" "$dst"
    echo "  $dir_type: $PLUGIN_NAME -> $dir_type/"
    n_dirs=$((n_dirs + 1))
done

echo ""
echo "Installed: ${n_agents} agent(s), ${n_skills} skill(s), ${n_dirs} dir(s)"
echo "Restart Claude Code for changes to take effect."
