# Plateau Nurse Registry — Minimum Viable Product (MVP)

A fully working Next.js App Router MVP for nurse registration, manual verification and approval workflow, licence verification, and renewal tracking across Plateau State health institutions.

## Features

- **Nurse Registration**: Submit registrations with required contact and professional details, including professional category, facility, and licence details.
- **Verification & Review Workflow**: Review officer workflow to approve registrations, issue standardized Plateau NANNM identification numbers (`PL-YYYY-XXXX`), flag records for manual inspection, or reject non-compliant submissions.
- **Licence Health & Renewal Tracking**: Real-time evaluation of licence validity using printed licence expiry dates (valid, expiring within 180 days, or expired). Renewal workflow returns updated records for manual verification.
- **Public Licence Verification**: Instant public lookup via NANNM ID or QR code (`/verify?id=PL-2025-0001`). Exposes verified professional and status details while protecting personal PII (email, phone, home address).
- **Employer / HR Confirmation**: Dedicated view allowing health facilities and employers to verify active employment and log confirmations.
- **Audit Logging & CSV Export**: Automated audit trail tracking all administrative actions, reviews, and renewals. Super Admin role supports filtered CSV exports for compliance reporting.
- **Simulated Notifications**: Automated reminder triggers for 90-day, 30-day, and expiration milestones.

## Getting Started

### Prerequisites

- Node.js 18+ (tested with Node 20+)
- npm

### Installation & Run

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) for the registry operations workspace.
Visit [http://localhost:3000/verify](http://localhost:3000/verify) for public licence verification.

### Verification & Testing

```bash
npm run lint  # TypeScript static analysis
npm test      # Automated test suite
npm run build # Optimized production build
```

## Architecture & Data Persistence

- **Framework**: Next.js App Router with React Server Components and Client Components for dynamic dashboards.
- **Data Layer**: High-performance atomic JSON database stored at `data/registry.json`. Initialized with default state and persisted safely using atomic file swap (`.tmp` write and rename).
- **Public API**: Dynamic endpoints at `/api/registry` supporting filtered public queries and authenticated administrative operations.
