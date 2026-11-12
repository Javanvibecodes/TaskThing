# Release and versioning process

## Version source

The repository currently maintains version fields in the root package
manifest, desktop package manifest, mobile package manifest, and mobile
HTML app-version metadata. Keep them aligned for each release.

Use semantic versioning where practical:

- PATCH: compatible bug fixes and small corrections;
- MINOR: backward-compatible features;
- MAJOR: incompatible changes to user data, behavior, or protocol.

This is a release convention, not a guarantee of compatibility.

## Before publishing

1. Update version fields and CHANGELOG.md.
2. Build each target on its supported environment.
3. Test install, upgrade, startup, persistence, and uninstall behavior.
4. Test desktop/mobile pairing and both directions of synchronization.
5. Test disconnect, reconnect, and queued offline changes.
6. Inspect permissions, network behavior, and security changes.
7. Generate SHA-256 checksums for release assets.
8. Verify third-party license obligations and include required notices.
9. Confirm LICENSE, PRIVACY.md, and THIRD_PARTY_NOTICES.md are included and accurate.
10. Upload only artifacts that have been built and tested.

## Release notes

Each GitHub release should state:

- version and release date;
- supported platform and architecture;
- notable additions, changes, and fixes;
- known limitations;
- installation/upgrade notes;
- checksums for downloadable files; and
- links to the MIT License, privacy notice, third-party notices, and changelog.

## Artifact naming

The current README links to Windows and Android release assets. Confirm the
exact uploaded names against the release before publishing or changing those
links. Do not assume a configured Electron Builder artifact name matches a
manually renamed release asset.

## Integrity

Generate checksums after the final artifacts are built and before upload.
Publish the checksum file alongside the artifacts. Users should verify
checksums against the downloaded files. Checksums detect accidental changes;
they do not prove publisher identity unless the release channel itself is
trusted.
