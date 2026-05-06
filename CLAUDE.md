# Claude Code Instructions — Trading Dashboard

## Git Rules (read every session, no exceptions)

**Always commit and push to `main` branch of `jati143-arch/Dashboard`.**

```
✅  git checkout main
✅  git push origin main

❌  Do NOT create feature branches (no claude/..., no fix/..., no feat/...)
❌  Do NOT push to any branch other than main
❌  Do NOT create a new repository
```

If you find yourself on a non-main branch, merge it to main first, then push main.

## Session Summary

After completing any significant work, update `SESSION_SUMMARY.md` in the repo root to document what was built. Commit that update to `main` as well.

## Stack Quick Reference

- **Repo:** `jati143-arch/Dashboard`
- **Branch:** `main` (only)
- **Deploy:** Render auto-deploys on every push to `main`
- **Frontend:** React 18 + Vite → `client/`
- **Backend:** Node.js + Express → `server/`
- **Storage:** Google Drive JSON via `server/lib/driveStore.js`
- **AI:** Groq (free) → Claude fallback via `server/services/aiProvider.js`
