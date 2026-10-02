# Corner Gestures

A GNOME Shell 46 extension that lets you trigger actions by moving the mouse into the screen corners.

## Features

* Configurable actions for all four corners.
* Bottom-left trigger can be positioned away from the Ubuntu Dock.
* Configurable trigger size.
* Configurable cursor dwell time before activation.
* `Sleep` action gradually fades the screen to black and then shows the GNOME lock screen when the mouse is moved.
* Preferences available through the GNOME Extensions application.

## Installation

### Automatic installation

1. Extract the extension package.
2. Open a terminal inside the extracted folder.
3. Run:

```bash
chmod +x install.sh
./install.sh
```

The installer copies the extension to:

```text
~/.local/share/gnome-shell/extensions/corner-gestures@user/
```

and compiles the GSettings schema.

### Apply the extension

If using **Wayland**:

```text
Log out → Log back in
```

If using **X11**, GNOME Shell can be restarted with:

```text
Alt + F2 → r → Enter
```

Then open **Extensions** and open the **Corner Gestures** preferences.

## Recommended settings

The default bottom-left trigger is:

```text
Trigger size:   20 px
Bottom offset:  60 px
Trigger delay:  2.5 seconds
```

The delay means the mouse must remain inside the trigger area continuously before the action fires.

## Bottom-left corner — known issue ⚠️

The bottom-left trigger can be **slightly less responsive** than the other corners.

This is intentional to a degree because the trigger is moved upward to avoid interference with the Ubuntu Dock.

If it feels unreliable, try increasing:

```text
Bottom offset → 70–100 px
```

or increasing:

```text
Trigger size → 25–40 px
```

The other corners use the normal screen-edge trigger positions.

## Testing

For development/testing, a nested GNOME Shell environment can be used instead of testing directly on the main desktop:

```bash
dbus-run-session -- gnome-shell --nested --wayland
```

This allows the extension to be tested without replacing the main GNOME Shell session.

## Current limitations

* Bottom-left responsiveness may vary depending on the Ubuntu Dock and its interaction with the screen edge.
* The extension currently targets GNOME Shell 46.
* The extension has primarily been tested around a Wayland-based GNOME environment.

## Configuration

The following settings can be adjusted from Preferences:

* Corner actions
* Trigger delay
* Bottom-left trigger size
* Bottom-left trigger offset

Default configuration:

```text
Bottom-left size:    20 px
Bottom-left offset:  60 px
Trigger delay:       2500 ms
```
