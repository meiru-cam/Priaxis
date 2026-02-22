# Changelog

All notable changes to this project are documented in this file.

## 2026-02-13

### Added
- Added a project-level `CHANGELOG.md` for release/change tracking.
- Added i18n keys for remaining UI hardcoded copy across planner/quest/recurring/profile/command-center/season/daily/settings modules.
- Added localized profile default title keys (`profile.title_*`) and switched title rendering to translation-driven labels.

### Changed
- Standardized UI copy to translation keys (`t('...')`) across remaining feature files so runtime text is maintained in i18n resources instead of component source files.
- Updated command center default categories to use translated names from i18n keys instead of hardcoded strings.
- Updated quest summary date formatting to follow current app language (`zh-CN` / `en-US`).
- Cleaned `RecurringTaskFormModal` by removing temporary duplicated labels/comments and using stable translation keys.

### Fixed
- Fixed residual hardcoded text in pomodoro-related and planner interaction flows by routing through translation keys where applicable.
- Fixed settings import-cancel message check to use i18n key (`data.import_cancelled`) instead of hardcoded Chinese text.
- Fixed planner escalation prompt string to be localization-aware (`planner.chat.user_needs_help`).

### Validation
- Type check passed: `npm exec tsc -b`.
- Production build passed: `npm run build`.
- Chinese hardcoded runtime text scan under `src/features/**` reduced to comments/non-runtime constants only.
