#!/usr/bin/env bash
# One comment per PR, edited in place on every call (marker in pr-comment.md).
# Needs GH_TOKEN, PR and GITHUB_REPOSITORY; run from qa-audit/. Fork PRs have no write token.
set -euo pipefail

[ -f reports/pr-comment.md ] || exit 0
id=$(gh api "repos/$GITHUB_REPOSITORY/issues/$PR/comments" --paginate --jq '.[] | select(.body | startswith("<!-- qa-audit -->")) | .id' | head -n1)
if [ -n "$id" ]; then
  gh api -X PATCH "repos/$GITHUB_REPOSITORY/issues/comments/$id" -F body=@reports/pr-comment.md > /dev/null
else
  gh api "repos/$GITHUB_REPOSITORY/issues/$PR/comments" -F body=@reports/pr-comment.md > /dev/null
fi
