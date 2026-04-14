# Wallaflow

Wallaflow is a GNOME Shell extension that rotates wallpapers from a folder you choose.

## Features

- Rotate wallpapers on a custom timer
- Shuffle or play in sequence
- Optional recursive folder scanning
- Mirror the wallpaper to the lock screen
- Panel controls for pause, resume, next wallpaper, and settings

## Requirements

- GNOME Shell 49

## Project Layout

```text
wallaflow/
  extension.js
  metadata.json
  prefs.js
  schemas/
    org.gnome.shell.extensions.wallflow.gschema.xml
```

## Install For Local Testing

Copy the project files into your local GNOME Shell extensions directory:

```bash
mkdir -p ~/.local/share/gnome-shell/extensions/wallflow@urusername.local
cp extension.js metadata.json prefs.js ~/.local/share/gnome-shell/extensions/wallflow@urusername.local/
mkdir -p ~/.local/share/gnome-shell/extensions/wallflow@urusernamelocal/schemas
cp schemas/org.gnome.shell.extensions.wallflow.gschema.xml ~/.local/share/gnome-shell/extensions/wallflow@username.local/schemas/
glib-compile-schemas ~/.local/share/gnome-shell/extensions/wallflow@username.local/schemas
```

Then reload the extension:

```bash
gnome-extensions disable wallflow@sourav.local
gnome-extensions enable wallflow@sourav.local
```

## Package

Compile schemas before packaging:

```bash
glib-compile-schemas schemas
```

Create a zip from the project root:

```bash
zip -r wallaflow.zip extension.js metadata.json prefs.js schemas
```

happy reading , hehehe




