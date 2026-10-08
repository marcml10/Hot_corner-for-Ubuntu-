const fs = require('fs');

let content = fs.readFileSync('extension.js', 'utf8');

// 1. Add suspend to startGentleLock
content = content.replace(
    /if \(_gentleLockActionType === 'screen-off'\) \{\s+try \{\s+GLib\.spawn_command_line_async\('busctl [^']+'\);\s+\} catch \(e\) \{\s+console\.error\('Failed to turn off screen:', e\);\s+\}\s+\}/,
    `if (_gentleLockActionType === 'screen-off') {
                    try {
                        GLib.spawn_command_line_async('busctl --user set-property org.gnome.Mutter.DisplayConfig /org/gnome/Mutter/DisplayConfig org.gnome.Mutter.DisplayConfig PowerSaveMode i 1');
                    } catch (e) {
                        console.error('Failed to turn off screen:', e);
                    }
                } else if (_gentleLockActionType === 'sleep') {
                    try {
                        GLib.spawn_command_line_async('systemctl suspend');
                    } catch (e) {
                        console.error('Failed to suspend:', e);
                    }
                }`
);

// 2. Update finishGentleLock to always fade in, but still lock if sleep and not cancelled.
const oldFinish = 
`    if (actionType === 'sleep' && !isCancelled) {
        if (_gentleLockOverlay) {
            Main.layoutManager.removeChrome(_gentleLockOverlay);
            _gentleLockOverlay.destroy();
            _gentleLockOverlay = null;
        }
        _gentleLockMonitor = null;
        // Use GNOME's native lock screen rather than implementing our own.
        Main.screenShield.lock(true);
    } else {
        if (_gentleLockOverlay) {`;

const newFinish = 
`    if (actionType === 'sleep' && !isCancelled) {
        Main.screenShield.lock(true);
    }

    if (_gentleLockOverlay) {`;

content = content.replace(oldFinish, newFinish);

// We need to remove the closing bracket of the else block.
// Find the exact line: `        } else {\n            _gentleLockMonitor = null;\n        }`
const oldElse = 
`        } else {
            _gentleLockMonitor = null;
        }`;

const newElse = 
`        } else {
            _gentleLockMonitor = null;
        }`;

// Wait, the else block was for `if (_gentleLockOverlay)`.
// The outer block `} else {` which we deleted is closed where?
// The original code was:
/*
    if (actionType === 'sleep' && !isCancelled) {
        ...
    } else {
        if (_gentleLockOverlay) {
            ...
        } else {
            _gentleLockMonitor = null;
        }
    }
}
*/

// If we remove the outer `else {`, we must remove its closing bracket `}` at the end.
content = content.replace(
    /} else {\n            _gentleLockMonitor = null;\n        }\n    }\n}/g,
    `} else {\n            _gentleLockMonitor = null;\n        }\n}`
);

fs.writeFileSync('extension.js', content);
