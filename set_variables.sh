#!/bin/sh

set -eu

WEB_ROOT=/usr/share/nginx/html
TMPFILE=$(mktemp)
trap 'rm -f "$TMPFILE"' EXIT

resolve_env() {
    PRIMARY_NAME="$1"
    FALLBACK_NAME="$2"

    PRIMARY_VALUE=$(printenv "$PRIMARY_NAME" || true)
    if [ -n "$PRIMARY_VALUE" ]; then
        printf '%s' "$PRIMARY_VALUE"
        return 0
    fi

    if [ -n "$FALLBACK_NAME" ]; then
        FALLBACK_VALUE=$(printenv "$FALLBACK_NAME" || true)
        if [ -n "$FALLBACK_VALUE" ]; then
            printf '%s' "$FALLBACK_VALUE"
            return 0
        fi
    fi

    echo "Missing environment variable: $PRIMARY_NAME" >&2
    if [ -n "$FALLBACK_NAME" ]; then
        echo "Accepted fallback: $FALLBACK_NAME" >&2
    fi
    exit 1
}

escape_sed_replacement() {
    printf '%s' "$1" | sed -e 's/[\/&]/\\&/g'
}

replace_token() {
    PLACEHOLDER="$1"
    VALUE="$2"

    grep -rl "$PLACEHOLDER" "$WEB_ROOT/" 2>/dev/null | while IFS= read -r FILE
    do
        [ -n "$FILE" ] || continue
        sed "s/$PLACEHOLDER/$VALUE/g" "$FILE" > "$TMPFILE" && cat "$TMPFILE" > "$FILE"
        chmod a+r "$FILE"
    done
}

replace_variable() {
    PRIMARY_ENV_NAME="$1"
    FALLBACK_ENV_NAME="$2"
    PLACEHOLDER="$3"

    RESOLVED_VALUE=$(resolve_env "$PRIMARY_ENV_NAME" "$FALLBACK_ENV_NAME")
    ESCAPED_VALUE=$(escape_sed_replacement "$RESOLVED_VALUE")

    replace_token "$PLACEHOLDER" "$ESCAPED_VALUE"
}

replace_variable "VITE_DIAGNOSTICA_API_ENDPOINT" "APP_DIAGNOSTICA_API_ENDPOINT" "REPLACE_VITE_DIAGNOSTICA_API_ENDPOINT_HERE"
replace_variable "VITE_DIAGNOSTICA_ENV" "APP_DIAGNOSTICA_ENV" "REPLACE_VITE_DIAGNOSTICA_ENV_HERE"
replace_variable "VITE_COMMIT_HASH" "APP_COMMIT_HASH" "REPLACE_VITE_COMMIT_HASH"
replace_variable "VITE_COMMIT_DATE" "APP_COMMIT_DATE" "REPLACE_VITE_COMMIT_DATE"
