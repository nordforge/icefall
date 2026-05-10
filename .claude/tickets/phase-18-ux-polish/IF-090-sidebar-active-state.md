# IF-090: Sidebar navigation polish

**Phase:** 18 — UX Polish
**Priority:** Medium
**Estimate:** S

## Description

Polish the sidebar navigation: active state improvements, mobile drawer, app-context breadcrumb, and keyboard navigation.

## Acceptance Criteria

### Active state
- [ ] Active nav item has a left border indicator (4px solid primary) instead of just background change
- [ ] When inside an app detail page, "Apps" is active in the sidebar
- [ ] Nested routes correctly highlight parent: `/apps/{id}/deploys` → "Apps" active
- [ ] Active state transition: smooth background-color transition on hover/active

### Mobile drawer
- [ ] Hamburger button visible on screens < 641px
- [ ] Sidebar slides in as an overlay from the left
- [ ] Backdrop overlay behind the drawer (click to close)
- [ ] Close button inside the drawer
- [ ] Escape key closes the drawer
- [ ] Focus trap while drawer is open (a11y)
- [ ] Body scroll locked while drawer is open

### App context indicator
- [ ] When viewing an app detail, show the app name below the "Apps" nav item as an indented sub-item
- [ ] Optional: show the active tab name as a further indent

### Keyboard navigation
- [ ] Arrow up/down moves between nav items
- [ ] Enter/Space activates the focused item
- [ ] Home/End jump to first/last item

## Out of Scope

- Collapsible sidebar (full/mini mode)
- Sidebar customization (reorder, hide items)
- Notification badges on nav items

## Dependencies

- None
