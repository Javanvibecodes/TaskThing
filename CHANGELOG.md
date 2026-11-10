# Changelog

All notable changes to Task Thing will be documented in this file.

## [1.0.1] - 2026-11-10

### Fixed
- Mobile: launch no longer shows a white/black gap before the logo. The native splash with the Blob logo now appears the instant the launcher icon is tapped and stays for ~3 seconds, then the app UI opens.
- Mobile: opening logo no longer fades/scales in (removed the blink between the native and web splash).
- Mobile: startup no longer depends on the network. Tailwind utilities, Inter/JetBrains Mono fonts, Material Symbols and html5-qrcode are bundled locally instead of loaded from CDNs.
- Android/iOS: the WebView and window backgrounds are white (were black), eliminating the dark flash/frame during startup.
- Mobile: the Sync screen no longer reports changes queued when there are none. The offline queue is compacted, so add-then-delete cancels out and repeated edits keep only the latest mutation.
- Mobile/Desktop: the active tab icon is highlighted blue.
- Mobile/Desktop: the Today tab counter badge is hidden when no tasks are pending (it previously showed a hard-coded 4).

### Added
- Windows installer, Linux portable tarball and Android APK published as release assets, with direct download links in the README.

## [1.0.0] - 2026-11-09

### Added
- Mobile: Lottie opening animation with the actual Blob logo (cropped from 908×834 to 573×625, 40% scale, bounce keyframes, halo ring, "Task Thing" title)
- Mobile: Static logo placeholder fades out when Lottie reaches frame 12; fallback timer 2.2s if Lottie unavailable
- Mobile: Native Android splash screen (white background + centered Blob logo) shown instantly on launch; HTML splash takes over seamlessly
- Mobile: QR scanner with no extra inner/horizontal scan box; auto-detection; manual IP connect flow
- Mobile: Camera permission requested via browser system prompt on first scanner use
- Mobile: Task-edit modal appears centered (not at bottom); auto-closes when switching pages
- Mobile: Habits use same inline add/edit flow as tasks (no separate modal)
- PC: Check for Updates button with git tag version checking; shows changelog after updates
- PC: Report Issue button linking to GitHub Issues page
- PC: `check-for-updates` IPC handler fetching latest git tag and changelog
- PC: CHANGELOG.md added with initial 1.0.0 release notes
- Mobile: Tailwind CDN + html5-qrcode moved to body end; Google Fonts stylesheets non-blocking
- Mobile: Opening animation CSS keyframes (`openingLogoIn`, `openingTitleIn`)
- Mobile: Removed keyboard shortcuts and references
- Mobile: Removed compact mode on PC
- Mobile: Removed launch video; kept only on desktop
- Mobile: Palette: white background, black text, blue #0381FC actions; removed "#0381FC" hex label on mobile
- Android: Density-specific splash.png assets generated (white + centered Blob logo at 34% of min dimension)
- Android: Updated `AppTheme.NoActionBarLaunch` style to use `@drawable/splash` background
- Android: Status and navigation bars set to white; `windowLightStatusBar` enabled

### Changed
- Mobile: Lottie keyframes now have `i`/`o` easing on every non-final keyframe
- Mobile: Drawn blob replaced by real-logo image layer in `opening.json`; checkmark and sparkle layers removed
- Mobile: `opening.json` logo asset: `w: 573, h: 625, u: '', p: 'blob-logo.png'`
- Mobile: Layer `op` set to 140 so nothing blanks before splash fade-out
- Mobile: Blob logo cropped/transparent via PIL flood fill (src 908×834 → bbox 152,82,725,707 → out 573×625)
- Mobile: APK icon set to Blob logo (PNG copied to mipmap folders)
- Desktop: Launch video kept; mobile video fully removed
- Mobile: `mobile-opening` static placeholder removal on Lottie frame 22 and longer fallback timer implemented
- Mobile: `playMobileOpeningAnimation()`: hide `#mobile-opening-logo` once animation frame ≥ 22; extend fallback to ~1.6–2s

### Fixed
- Lottie robustness: all non-final keyframes have `i`/`o` easing
- Lottie: drawn blob replaced by real-logo image layer
- Lottie: checkmark and sparkle layers removed; layer `op` raised to 140
- Mobile: FOUC/blank-launch mitigation: static logo placeholder + `openingLogoIn` CSS, fonts non-blocking
- Mobile: Splash overlay appears immediately when icon tapped; bottom nav not overlapped
- QR scanner: removed `facingMode` constraint and fixed `qrbox`; no extra scan box
- Mobile: Modal z-index/position fixes (task modal `items-center`; `switchScreen()` closes all modals)