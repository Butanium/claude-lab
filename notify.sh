#!/bin/bash
# Send notification to supervisor
# Usage: notify.sh "Your message here"
#
# Configure your topic by setting NTFY_TOPIC environment variable
# or edit the default below.

TOPIC="${CLAB_NTFY_TOPIC:?Set CLAB_NTFY_TOPIC environment variable}"
MESSAGE="$*"

if [ -z "$MESSAGE" ]; then
    echo "Usage: notify.sh <message>" >&2
    exit 1
fi

curl -s -d "$MESSAGE" "ntfy.sh/$TOPIC" > /dev/null

echo "Notification sent to ntfy.sh/$TOPIC"
