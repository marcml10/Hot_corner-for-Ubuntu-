# Corner Gestures

A GNOME Shell extension that triggers configurable actions by moving the mouse into the top screen corners.

## Features

* **Top Corners Only**: Assign actions to the top-left and top-right corners.
* **Multiple Actions**: Trigger Overview, Show Desktop, or switch workspaces.
* **Gentle Power States**:
  * `Sleep`: Fades to black, stays black, and wakes to the GNOME lock screen on mouse movement.
  * `Turn off screen`: Fades to black, then powers off the display hardware. Wakes on mouse movement.
  * `Blackout`: Fades to black without locking or turning off the screen. Wakes on mouse movement.
* **Interruptible Fade**: Moving the mouse while the screen is fading out instantly aborts the action and smoothly fades back to your desktop.
* **Compatibility**: GNOME Shell 46, 50, and 50.1.

## Installation

1. Run the installer script:
   ```bash
   chmod +x install.sh
   ./install.sh
   ```
2. Apply changes:
   * **Wayland**: Log out and log back in.
   * **X11**: Press `Alt + F2`, type `r`, and press `Enter`.
3. Open the **Extensions** app to configure the Corner Gestures preferences.
