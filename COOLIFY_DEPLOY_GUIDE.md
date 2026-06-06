# COOLIFY DEPLOY GUIDE — TENDER SYSTEMZ

Last updated: 2026-06-04

## 1. Deployment Decision

Tender Systemz should deploy to the existing Hetzner VPS + Coolify environment.

This project is not using Netlify as the main deployment path.

Coolify is preferred because the user already has a Hetzner VPS with Coolify and wants production control through self-hosted deployment.

## 2. Repository

GitHub repo:

```txt
https://github.com/tendersystemz-cpu/company.git
```

Current app stack:

```txt
Next.js
Supabase
Dockerfile
Coolify
Hetzner VPS
```

## 3. Required Files Already Added

```txt
next.config.mjs        output: standalone
Dockerfile             Docker build for Next.js standalone
.dockerignore          Docker build cleanup
package.json           Next.js app scripts
```

## 4. Coolify App Setup

In Coolify:

```txt
New Resource
→ Application
→ Public Repository or GitHub App Repository
→ Select tendersystemz-cpu/company
→ Build Pack: Dockerfile
→ Port: 3000
```

If Coolify asks for build method:

```txt
Dockerfile
```

If Coolify asks exposed port:

```txt
3000
```

## 5. Required Environment Variables

Set these in Coolify environment variables:

```txt
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Use the values from the Supabase project.

Do not commit real keys into GitHub.

## 6. Supabase Required Before Viewing Data

Apply these SQL migrations first in Supabase SQL Editor:

```txt
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_tender_evaluation_core.sql
```

Then run smoke test from:

```txt
SUPABASE_TENDER_EVALUATION_APPLY_GUIDE.md
```

Without smoke test data, the app can still open but dashboard tables may be empty.

## 7. Expected Routes After Deploy

After Coolify deploys the app, the public URL should show:

```txt
/                  Dashboard
/tenders           Tender list
/stage-1           Stage 1 preliminary board
/recommendations   Final decision board
/tenders/[id]      Tender detail
/bidders/[id]      Bidder evaluation detail
```

## 8. Build Command

Dockerfile handles build automatically.

Inside Dockerfile:

```txt
npm install
npm run build
node server.js
```

## 9. Important Notes

If the app opens but shows Supabase configuration warning:

```txt
Coolify environment variables are missing.
```

If the app opens but shows view/table error:

```txt
Supabase migration 001 or 002 has not been applied.
```

If the app opens but tables are empty:

```txt
No tender/bidder/test data has been inserted yet.
```

## 10. Next After Successful Deploy

After the Coolify URL works:

```txt
1. Apply Supabase migrations
2. Run smoke test seed data
3. Confirm dashboard shows test tender
4. Add proper sample seed file
5. Build tender import workflow from Google Sheet
```
