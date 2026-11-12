# Third-party notices

Task Thing is proprietary, but it uses third-party packages and platform
components. Proprietary licensing of Task Thing's original code does not
remove or override the licenses that apply to those dependencies.

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
| @capacitor/splash-screen | Native splash-screen plugin |
| html5-qrcode | QR-code scanning library |
| lottie-web | Lottie animation runtime |
| tailwindcss | CSS utility framework |
| vite | Web build tooling |

## Required release checks

Before distributing a release:

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

No claim is made here that the list above is exhaustive or that every
third-party license has already been reproduced in this file. If a required
notice is missing, the relevant upstream license governs and the release
should be corrected before further distribution.
