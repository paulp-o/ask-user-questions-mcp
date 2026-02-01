# Changelog

## [Unreleased]

### Changed

- Session directory now always uses global XDG-compliant paths
- Sessions are now stored in one predictable location per platform

### Removed

- `detectInstallMode()` function and local `.auq/sessions` support

### Migration

- Existing local `.auq/` directories can be safely deleted
