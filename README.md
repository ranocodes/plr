# Plateau Nurse Registry — local MVP demo

A Next.js App Router prototype for nurse registration, manual review, licence verification and renewal tracking. **This is a fictional local demo, not an official registry or regulator-authorized service.** Do not enter real personal data.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Public verification is available at `/verify` and can be linked from a demo QR card. `npm run build`, `npm run lint`, and `npm test` run the production build, TypeScript check, and small logic tests.

## What works

- Browse, search and filter the sample registry; add a fabricated registration.
- Review a record as approved, rejected or flagged. Approval issues a demo NANNM ID and QR lookup card.
- View public licence details at `/verify?id=PL-2025-0001`; public responses omit contact details and do not expose pending, flagged or rejected records.
- Track renewal dates, send a renewal back for manual review, and log employer confirmations.
- Review simulated 90-day, 30-day and expiry notices and a local audit trail. Switch to the Super Admin demo role to export CSV.
- Registry, audit and notification changes persist to `data/registry.json` on the machine running the app; the seed dataset contains fabricated identities and `.gitignore` excludes the runtime file.

## Prototype limitations

The role selector and gated screens are **not authentication or authorization**. The local JSON store is for single-machine demonstration and is not suitable for concurrent, multi-user or production use. There is no document upload, real email delivery, NMCN integration, identity verification, NIN collection, or secure HR authorization. QR codes link to this local demo. Privacy governance and the responsible NDPA controller / enforcement authority remain decisions for the relevant stakeholders; this app makes no claim of regulatory approval or production compliance.
