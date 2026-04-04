#!/usr/bin/env bash
# Fires on Stop hook. Re-wakes Claude (exit 2) if a commit introduced source changes without updating CLAUDE.md.

repo="c:/Personal Project/moneypots/moneypots"
flag="$repo/.claude/.needs-md-review"

if [ ! -f "$flag" ]; then
  exit 0
fi

changed=$(cat "$flag")
rm -f "$flag"

echo "A recent commit changed source files without updating CLAUDE.md: $(echo $changed | tr '\n' ' '). Review CLAUDE.md and update any sections affected by these changes (architecture, data flow, key files, Firestore schema, tabs, hooks)."
exit 2
