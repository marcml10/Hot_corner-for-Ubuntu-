#!/usr/bin/env bash
# install.sh — Install Corner Gestures extension for the current user
set -e

EXTDIR="$HOME/.local/share/gnome-shell/extensions/corner-gestures@user"
SRCDIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "▶ Installing Corner Gestures..."

# Create extension directory
mkdir -p "$EXTDIR/schemas"

# Copy extension files
cp "$SRCDIR/metadata.json" "$EXTDIR/"
cp "$SRCDIR/extension.js" "$EXTDIR/"
cp "$SRCDIR/prefs.js" "$EXTDIR/"

# Copy GSettings schema
cp "$SRCDIR/schemas/"* "$EXTDIR/schemas/"

# Compile GSettings schema
echo "▶ Compiling GSettings schema..."
glib-compile-schemas "$EXTDIR/schemas/"

echo "   ✓ Schema compiled"

# Enable extension
echo "▶ Enabling extension..."
gnome-extensions enable corner-gestures@user 2>/dev/null || true

echo "   ✓ Extension enabled"

echo ""
echo "========================================"
echo " Corner Gestures installed successfully"
echo "========================================"
echo ""
echo "Configuration:"
echo "  Bottom-left trigger : 20 × 20 px"
echo "  Bottom offset       : 60 px"
echo "  Trigger delay       : 2.5 seconds"
echo ""
echo "To apply the changes:"
echo "  Wayland → Log out and log back in"
echo "  X11     → Alt+F2 → r → Enter"
echo ""
echo "Then open the extension Preferences."
