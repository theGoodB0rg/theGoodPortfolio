#!/usr/bin/env bash
# Install pre-commit hooks for this repo
cp scripts/git-hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
echo "Pre-commit hook installed."
