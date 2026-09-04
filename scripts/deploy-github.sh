#!/usr/bin/env bash
set -e

echo "======================================================="
echo "   OmniWorkspace - GitHub Repository Deployment Helper"
echo "======================================================="

if [ -z "$1" ]; then
  echo "Usage: ./scripts/deploy-github.sh <github-repo-url>"
  echo "Example: ./scripts/deploy-github.sh https://github.com/your-username/omni-workspace.git"
  exit 1
fi

REPO_URL="$1"

echo "[1/4] Running automated tests..."
npm test

echo "[2/4] Verifying production build..."
npm run build

echo "[3/4] Configuring remote origin: $REPO_URL..."
git branch -M main
git remote remove origin 2>/dev/null || true
git remote add origin "$REPO_URL"

echo "[4/4] Pushing to GitHub main branch..."
git push -u origin main

echo "======================================================="
echo "   SUCCESS! Code pushed to GitHub."
echo "   GitHub Actions CI/CD will now build and test across"
echo "   Ubuntu, Windows, and macOS automatically."
echo "======================================================="
