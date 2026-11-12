# Build from source

## Prerequisites

- Node.js 20 or newer.
- pnpm 12 or newer (the root package declares pnpm 12.18.0).
- Git, for cloning the repository.
- Platform-specific SDKs for the target build:
  - Windows: supported Windows environment for Electron Builder.
  - macOS: Xcode and the relevant Apple tooling for macOS/iOS builds.
  - Android: Android Studio, Android SDK, and a compatible JDK.
- Sufficient disk space for dependencies and platform build tools.

Versions above are project guidance; validate compatibility with the current
lockfiles and platform toolchains.

## Clone and install

```bash
git clone https://github.com/Javanvibecodes/TaskThing.git
cd TaskThing
pnpm install
```

The repository contains a root package manifest and a separate mobile
package. If the root install does not install mobile dependencies in your
environment, install them explicitly:

```bash
cd mobile
pnpm install
cd ..
```

## Run desktop in development

```bash
pnpm desktop
```

The root script delegates to the desktop package's Electron start command.

## Package desktop

```bash
pnpm desktop:pack
pnpm desktop:dist:win
pnpm desktop:dist:mac
pnpm desktop:dist:linux
```

The configured targets are not a guarantee that every platform has been
tested or that its artifact is ready for public distribution. Build on the
appropriate platform and validate the result.

## Build mobile web assets

```bash
pnpm --dir mobile build
```

Or from the mobile directory:

```bash
cd mobile
pnpm install
pnpm build
npx cap sync
```

## Android

```bash
cd mobile
pnpm build
npx cap sync android
npx cap open android
```

Build and sign the Android release from Android Studio or the Gradle wrapper.
Do not publish a debug APK as a production release. Protect signing keys and
never commit them to the repository.

## iOS

The Capacitor configuration includes iOS settings, but the iOS native project
is not committed in the current repository. Generate/sync the platform
project with the required Apple tooling before attempting an iOS build.

## Release checklist

- Update the version consistently in the root, desktop, and mobile manifests
  and in the mobile app-version metadata.
- Update CHANGELOG.md.
- Build on the target platform.
- Test fresh install, upgrade, launch, local persistence, task operations,
  pairing, reconnect, offline queue, and disconnect.
- Verify release asset names and links.
- Generate checksums and a dependency/license inventory.
- Sign artifacts where platform tooling permits.
- Upload only artifacts that were actually tested.
