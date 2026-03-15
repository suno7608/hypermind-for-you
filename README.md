# Hypermind for You

Independent review app for presentation materials, reports, and business questions.

## Product structure

- `/` : service explanation and CTA
- `/studio?workflow=...` : workflow-matched single-agent review
- `/studio?agent=...` : direct 1:1 agent review
- `/studio?mode=council` : password-protected 4-agent final review

## Workflow mapping

- `준비도 검증` → `Delta`
- `날카로운 비평` → `Psi`
- `새로운 시각` → `Omega`

The purpose is to reduce token cost by default and use the full 4-agent council only for final validation.

## Council final review

The sequential 4-agent review is protected behind a password because it is the most expensive mode.

Copy `.env.example` to `.env.local` and fill the values:

```bash
cp .env.example .env.local
```

```bash
ANTHROPIC_API_KEY=your_key_here
MODEL_NAME=claude-sonnet-4-5-20250929
COUNCIL_ACCESS_PASSWORD=your_password_here
APP_STORAGE=postgres
DATABASE_URL=postgres://user:password@host:5432/dbname
```

If `COUNCIL_ACCESS_PASSWORD` is missing, `/api/debate` returns `503`.
If the password is wrong, `/api/debate` returns `403`.

## Run

```bash
npm install
npm run dev
```

## Notes

- Single-agent review uses `/api/chat`.
- Council final review uses `/api/debate`.
- Runtime config status is available at `/api/status`.
- Uploaded files support `PDF`, `DOCX`, `TXT`, `MD`, `CSV`.

## Vercel deployment

- Import `suno7608/hypermind-for-you` into Vercel.
- Provision a Postgres database from Vercel Marketplace or Neon.
- Set `ANTHROPIC_API_KEY`, `MODEL_NAME`, `COUNCIL_ACCESS_PASSWORD`, `APP_STORAGE=postgres`, and `DATABASE_URL` in Project Settings > Environment Variables.
- `vercel.json` sets a longer function duration for streaming review APIs.

Storage behavior:

- Local default: `sqlite`
- If `DATABASE_URL` or `POSTGRES_URL` exists: `postgres`
- If deployed on Vercel without a DB URL: `memory`

Recommended production setup:

- Vercel project
- Postgres database attached
- `APP_STORAGE=postgres`
- Verify `/api/status` shows `storageProvider: "postgres"`
