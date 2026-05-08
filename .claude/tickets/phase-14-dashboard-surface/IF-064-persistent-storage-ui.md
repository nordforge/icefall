# IF-064: Persistent storage / volumes UI

**Phase:** 14 — Dashboard Surface
**Priority:** High
**Estimate:** M

## Description

Any stateful workload (CMS, file uploads, SQLite-based apps) loses data on redeploy without volume mounts. Add volume mount configuration to the app settings tab. The Docker client supports volumes natively via Bollard.

## Acceptance Criteria

- [ ] New section in app settings tab: "Persistent Storage"
- [ ] Volume mount list with add/remove:
  - Container path (required, e.g., `/app/data`, `/var/lib/uploads`)
  - Host path or named volume (e.g., `/data/myapp/uploads` or `myapp-data`)
  - Read-only toggle (default: off)
- [ ] "Add Volume" button to add a new mount
- [ ] Remove button per volume with confirmation
- [ ] Validation:
  - Container path must be absolute (starts with `/`)
  - Container path must not be `/` or system paths (`/proc`, `/sys`, `/dev`)
  - No duplicate container paths
  - Host path must be absolute if specified
- [ ] Warning note: "Changes to volumes take effect on next deployment"
- [ ] Info note for new users: "Volumes persist data across deployments and container restarts. Use them for uploaded files, databases, and any data that shouldn't be lost."
- [ ] Save persists volume configuration to app model via `PUT /api/v1/apps/{id}`
- [ ] Light and dark theme verified
- [ ] Mobile responsive

## Technical Notes

- Bollard's `ContainerConfig` supports `Binds` for bind mounts and `Volumes` for named volumes
- The deploy manager needs to read volume config from the app model and pass it to container creation
- Backend may need a new `volumes` JSON field on the apps table if one doesn't exist — check schema
- Named volumes are auto-created by Docker if they don't exist
- Volume data survives container removal (that's the point)

## Out of Scope

- Volume browsing / file manager UI
- Volume size limits
- Volume backups (separate from database backups)
- Sharing volumes between apps
- S3/object storage mounts

## Dependencies

- IF-004 (Docker client), IF-019 (app detail page)
