# IF-093: Responsive design polish

**Phase:** 18 — UX Polish
**Priority:** Medium
**Estimate:** M

## Description

Audit and fix all responsive breakpoints across the dashboard. Several pages have issues on mobile and tablet: tables overflow, grids don't collapse, forms are too wide, and the sidebar doesn't have a proper mobile toggle.

## Acceptance Criteria

### Breakpoint consistency
- [ ] Define standard breakpoints: 480px (phone), 641px (tablet), 1024px (desktop), 1280px (wide)
- [ ] All pages tested at 375px, 768px, and 1440px widths

### Tables → Cards on mobile
- [ ] Deploys table → stacked card layout on mobile (< 641px)
- [ ] Users table → stacked card layout
- [ ] Domains table → stacked list
- [ ] Health events → stacked list

### Form responsiveness
- [ ] SettingsTab: all field rows stack to single-column on mobile
- [ ] Create wizards: step indicators work on small screens
- [ ] Modal/dialog forms: full-width on mobile with proper padding

### Grid layouts
- [ ] Dashboard AppGrid: 1 col on phone, 2 on tablet, 3 on desktop
- [ ] Project grid: 1 col on phone, 2 on tablet, 3 on desktop
- [ ] Database grid: same
- [ ] Resource limits / webhook sections: single-column on mobile

### App detail page
- [ ] Tabs: horizontally scrollable on mobile (not wrapping)
- [ ] OverviewTab 3-column grid: stacks to single column on mobile
- [ ] AppHeader: wraps action buttons below title on mobile

### Typography
- [ ] Page titles: scale down on mobile (text-xl instead of text-2xl)
- [ ] Consistent padding: `--space-4` on mobile, `--space-6` on desktop

## Out of Scope

- Native mobile app
- PWA (Progressive Web App)
- Touch gestures

## Dependencies

- None
