## Admin Dashboard Progress

### Sections completed
- [x] Section 1 — Stats Bar (totalWorkspaces, totalProjects, publishedTemplates, pendingTemplates, totalOrgs, quotaAlerts)
- [x] Section 2 — Workspaces Table (search + filter chips: All/Enterprise/Academic/At Quota/Deleted; soft-delete/restore actions)
- [x] Section 3 — Projects Table (search + filter chips: All/Active/Completed/Deleted; visibility toggle; soft-delete action)
- [x] Section 4 — Template Moderation (Pending/Published/Rejected/All sub-tabs; approve, reject with reason, featured/trending/recommended toggles, delete)
- [x] Section 5 — Quota Monitor (card-per-org, progress bars, red/orange border for at-quota/near-quota orgs)
- [x] Section 6 — Ratings & Favorites (top-rated table, most-favorited table, star display)

### Components reused from template
- Stat card pattern (avatar icon + label + number) → `super-admin.component.ts`
- `mat-table`, `mat-chip-set`, `mat-progress-bar`, `mat-tabs` → `m2-workspaces.component.ts` / Angular Material
- `approve()`, `reject()`, `setFeatured()`, `setTrending()` → `ProjectTemplateController.java` + `M2TemplateService`
- Theme CSS classes (theme-blue, theme-green, theme-red, theme-orange, theme-violet, theme-azure) → `_theme.scss`
- Bootstrap grid (`row gx-3 gx-lg-4`, `col-12 col-md-6 col-lg-*`) → global styles
- `fade-in`, `bg-light-theme`, `shadow-none`, `avatar avatar-50` → existing component patterns

### New components created
- `m2-admin.component.ts` — main shell with 5 mat-tab sections + stats bar
- `m2-admin.service.ts` — HTTP calls to `/api/v1/admin/*`
- `m2-admin.guard.ts` — `canActivateFn` role guard (ADMIN + SUPER_ADMIN)
- `template-reject-dialog.component.ts` — rejection reason textarea dialog

### API endpoints used
| Endpoint | Section |
|----------|---------|
| GET `/api/v1/admin/stats` | Stats bar |
| GET `/api/v1/admin/workspaces` | Workspaces tab |
| DELETE `/api/v1/admin/workspaces/{id}` | Workspaces tab — soft-delete |
| POST `/api/v1/admin/workspaces/{id}/restore` | Workspaces tab — restore |
| GET `/api/v1/admin/projects` | Projects tab |
| PATCH `/api/v1/admin/projects/{id}/visibility` | Projects tab — toggle visibility |
| DELETE `/api/v1/admin/projects/{id}` | Projects tab — soft-delete |
| GET `/api/v1/admin/orgs/quota` | Quota Monitor tab |
| GET `/api/v1/admin/templates/ratings` | Ratings & Favorites tab |
| GET `/api/project-templates?page=0&size=200` | Template Moderation (reused existing) |
| PATCH `/api/project-templates/{id}/approve` | Template Moderation — approve |
| PATCH `/api/project-templates/{id}/reject` | Template Moderation — reject |
| PATCH `/api/project-templates/{id}/feature` | Template Moderation — toggle featured |
| PATCH `/api/project-templates/{id}/trending` | Template Moderation — toggle trending |
| PATCH `/api/project-templates/{id}/recommend` | Template Moderation — toggle recommended (NEW endpoint) |

### Dummy data / TODOs
- Member count per org in Quota Monitor shows `max_members_per_ws` as reference only (no org-level member count query — would need a separate aggregate)
- `storageUsedGb` not shown — no real-time tracking implemented yet
- `apiCallsCount` not shown — no real-time tracking implemented yet
- Usage snapshots (`UsageQuota` entity / `usage_metrics` table) exist but are not surfaced in the dashboard yet

### Known issues surfaced during build
- `isRecommended` had no toggle endpoint — added `PATCH /api/project-templates/{id}/recommend` to `ProjectTemplateController` and `recommendTemplate()` to `ProjectTemplateService`
- No "admin get all workspaces" endpoint existed — created `AdminController` + `AdminService`
- Ratings ARE persisted server-side (`TemplateRating`, `TemplateFavorite` entities with DB tables) — not localStorage
