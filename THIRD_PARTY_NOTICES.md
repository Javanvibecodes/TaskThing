# Third-party notices

Task Thing is an open-source project released under the MIT License. It uses
third-party packages, platform components, fonts, icons, and other assets
that may be governed by licenses different from the project's license.

## Direct package dependencies currently declared

The following packages are declared in the repository's package manifests.
This is a convenience inventory, not a complete legal bill of materials.
Transitive dependencies and bundled platform components must also be checked
against the lockfiles and release artifacts before each distribution.

### Desktop

| Package | Purpose |
| --- | --- |
| Electron | Desktop application runtime |
| electron-builder | Desktop packaging and installer generation |
| ws | WebSocket server |
| qrcode | QR-code utility dependency |

### Mobile

| Package | Purpose |
| --- | --- |
| @capacitor/core | Native bridge runtime |
| @capacitor/android | Android platform integration |
| @capacitor/ios | iOS platform integration |
| @capacitor/cli | Capacitor command-line tooling |
| @capacitor/splash-screen | Capacitor splash-screen plugin |
| html5-qrcode | QR-code scanning library |
| lottie-web | Lottie animation runtime |
| tailwindcss | CSS utility framework |
| vite | Web build tooling |

## Contributor and redistributor responsibilities

Before redistributing Task Thing or a derivative build:

1. Inspect the root, desktop, and mobile lockfiles/manifests.
2. Generate a complete dependency/license inventory including transitive
   dependencies and native platform components.
3. Confirm each dependency's actual license and required attribution from
   its published license file; do not infer a license solely from its name.
4. Include required copyright notices, license texts, and attribution files
   in the relevant distribution packages.
5. Review fonts, icons, illustrations, logos, and other assets separately;
   package dependency reports do not necessarily cover those assets.
6. Re-run this review whenever dependencies or bundled assets change.

The list above is not exhaustive and does not claim that every third-party
license text has been reproduced here. Each upstream license continues to
govern its component. If a required notice is missing, correct the
distribution package before redistribution.
