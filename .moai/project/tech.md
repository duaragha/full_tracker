# Full Tracker - Technical Documentation

**Version**: 1.0.0
**Last Updated**: 2025-11-28
**Primary Language**: TypeScript

---

## STACK

### Core Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.0.1 | Full-stack React framework with App Router |
| React | 19.2.0 | UI component library |
| TypeScript | 5.x | Type-safe JavaScript |
| Node.js | >= 18.0.0 | Runtime environment |

### Database

| Technology | Version | Purpose |
|------------|---------|---------|
| PostgreSQL | - | Primary relational database (Railway hosted) |
| pg | 8.16.3 | Node.js PostgreSQL client |
| @vercel/postgres | 0.10.0 | Vercel PostgreSQL adapter (compatibility) |
| @supabase/supabase-js | 2.76.1 | Supabase client (compatibility) |

### UI Components

| Technology | Version | Purpose |
|------------|---------|---------|
| Tailwind CSS | 4.x | Utility-first CSS framework |
| shadcn/ui | - | Radix-based component library |
| Radix UI | Various | Accessible UI primitives |
| Lucide React | 0.545.0 | Icon library |
| Recharts | 2.15.4 | Data visualization |

---

## FRAMEWORK

### Next.js App Router

```
app/
├── page.tsx              # Server Component (default)
├── layout.tsx            # Root layout
├── actions/              # Server Actions
│   └── *.ts
└── api/                  # API Routes
    └── */route.ts
```

**Patterns Used**:
- Server Components for data fetching
- Server Actions for mutations
- Client Components marked with "use client"
- Dynamic imports for heavy components

### Component Architecture

```typescript
// Pattern: Feature Component with Server Data
// app/feature/page.tsx (Server Component)
export default async function FeaturePage() {
  const data = await getDataAction()
  return <FeatureClient initialData={data} />
}

// components/feature/feature-client.tsx (Client Component)
"use client"
export function FeatureClient({ initialData }: Props) {
  // Client-side interactivity
}
```

---

## TOOLING

### Build Tools

| Tool | Purpose | Configuration |
|------|---------|---------------|
| npm | Package manager | package.json |
| Next.js build | Production build | next.config.js |
| tsx | TypeScript execution | Scripts |
| ESLint | Linting | eslint.config.* |

### Development Scripts

```json
{
  "dev": "next dev --turbopack",
  "build": "next build",
  "start": "next start -p ${PORT:-3000}",
  "lint": "eslint",
  "monitor": "tsx scripts/monitor-charging.ts",
  "fitness:migrate": "tsx scripts/run-fitness-migration.ts"
}
```

### Key Dependencies

**Content Processing**:
- `cheerio` - HTML parsing
- `jsdom` - DOM manipulation
- `turndown` - HTML to Markdown
- `@extractus/article-extractor` - Article extraction
- `@mozilla/readability` - Content readability

**Document Handling**:
- `epubjs` - EPUB reading
- `pdfjs-dist` - PDF parsing
- `react-pdf` - PDF rendering
- `xlsx` - Spreadsheet processing

**Data Visualization**:
- `recharts` - Charts and graphs
- `react-day-picker` - Calendar
- `react-zoom-pan-pinch` - Image zoom

---

## QUALITY

### Testing Status

| Aspect | Current State | Target |
|--------|---------------|--------|
| Unit Tests | Not implemented | 85%+ coverage |
| Integration Tests | Not implemented | Critical paths |
| E2E Tests | Not implemented | Core user flows |
| Test Framework | Not selected | Jest/Vitest recommended |

### Testing Roadmap

1. **Phase 1**: Set up Vitest with React Testing Library
2. **Phase 2**: Unit tests for database stores
3. **Phase 3**: Integration tests for server actions
4. **Phase 4**: E2E tests with Playwright

### Code Quality Tools

| Tool | Status | Purpose |
|------|--------|---------|
| ESLint | Active | Code linting |
| TypeScript | Active | Type checking |
| Prettier | Not configured | Code formatting |
| Husky | Not configured | Git hooks |

### TRUST 5 Compliance

| Principle | Status | Notes |
|-----------|--------|-------|
| Test-first | Not compliant | No tests implemented |
| Readable | Partial | TypeScript helps, needs documentation |
| Unified | Partial | Consistent patterns in stores |
| Secured | Partial | PIN auth, needs security review |
| Trackable | Partial | Git history, needs SPEC linking |

---

## SECURITY

### Current Implementation

| Aspect | Implementation | Status |
|--------|----------------|--------|
| Authentication | PIN-based | Basic |
| API Keys | Database stored | Implemented |
| Secrets | Environment variables | Standard |
| HTTPS | Railway provides | Active |

### Security Considerations

**Implemented**:
- PIN verification for sensitive actions
- API key management in database
- Environment-based secrets

**Needed**:
- Input validation audit
- SQL injection review
- XSS prevention verification
- OWASP compliance check
- Rate limiting

### Protected Paths
- `/api/*` - API routes (some require PIN)
- `/settings/*` - Configuration pages

---

## OPERATIONS

### Deployment

| Environment | Platform | Trigger |
|-------------|----------|---------|
| Production | Railway | GitHub push to main |
| Preview | Railway | Pull requests |

### Deployment Pipeline

```
GitHub Push → Railway Build → Next.js Build → Deploy
```

**Build Configuration**:
- Node.js >= 18
- npm install
- next build
- Auto-start with PORT variable

### Environment Variables

| Variable | Purpose | Storage |
|----------|---------|---------|
| DATABASE_URL | PostgreSQL connection | Railway |
| POSTGRES_URL | Postgres URL (compatibility) | Railway |
| TMDB_API_KEY | Movie/TV metadata | Railway |
| TUYA_* | Smart home integration | Railway |
| PLEX_* | Media server integration | Railway |
| MICROSOFT_* | Graph API for exports | Railway |

---

## INCIDENT RESPONSE

### Current State

| Aspect | Status |
|--------|--------|
| Monitoring | Railway logs only |
| Alerting | None |
| Runbooks | None |
| MTTR Target | Not defined |

### Recommended Improvements

1. **Error Tracking**: Implement Sentry
2. **Uptime Monitoring**: Railway health checks
3. **Alerting**: Slack/email notifications for errors
4. **Runbooks**: Document common issues and fixes

---

## TECHNICAL DEBT

### Known Issues

| Issue | Priority | Complexity | Description |
|-------|----------|------------|-------------|
| Tuya API broken | HIGH | MEDIUM | Trial period expired, need alternative |
| No tests | HIGH | HIGH | Need comprehensive test coverage |
| Mobile responsiveness | HIGH | MEDIUM | Improve mobile experience |
| Performance | MEDIUM | MEDIUM | Optimize queries and loading |
| No error tracking | MEDIUM | LOW | Add Sentry or similar |

### Improvement Roadmap

**Short-term (1-3 months)**:
1. Fix Tuya integration (local API or alternative)
2. Add Vitest and initial test coverage
3. Improve mobile responsiveness

**Medium-term (3-6 months)**:
4. Add Sentry error tracking
5. Performance optimization
6. API documentation

**Long-term (6-12 months)**:
7. Comprehensive test coverage (85%+)
8. Full observability stack
9. Security audit

---

## DEPENDENCIES

### Production Dependencies (Notable)

| Package | Version | Purpose | Risk |
|---------|---------|---------|------|
| next | 16.0.1 | Framework | Low (latest) |
| react | 19.2.0 | UI | Low (latest) |
| pg | 8.16.3 | Database | Low |
| playwright | 1.56.1 | Browser automation | Medium (security) |
| xlsx | 0.18.5 | Spreadsheet | Medium (maintenance) |

### Version Update Strategy

- **Framework** (Next.js, React): Update quarterly after testing
- **Database** (pg): Update with security patches
- **UI Libraries**: Update monthly
- **Utilities**: Update as needed

---

## HISTORY

| Date | Change | Author |
|------|--------|--------|
| 2025-11-28 | Initial technical documentation created via project initialization | System |

---

*This document is maintained as part of the MoAI-ADK project documentation system.*
