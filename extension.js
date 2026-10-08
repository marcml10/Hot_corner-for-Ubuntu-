/**
 * Corner Gestures — extension.js
 * GNOME Shell 46
 *
 * Hooks into each screen corner and fires configurable actions
 * (sleep, overview, show-desktop, workspace switching) after a
 * short dwell delay.  All settings are stored in GSettings and
 * editable through the Preferences window (prefs.js).
 */

import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import St from 'gi://St';
import Meta from 'gi://Meta';
import Gio from 'gi://Gio';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

// ─── Action executor ────────────────────────────────────────────────────────

/**
 * Run the action string that comes out of GSettings.
 * Add new actions here; the prefs UI lists the same set.
 */
function runAction(action) {
    switch (action) {

        case 'sleep':
            startGentleLock('sleep');
            break;

        case 'blackout':
            startGentleLock('blackout');
            break;

        case 'screen-off':
            startGentleLock('screen-off');
            break;

        case 'overview':
            Main.overview.toggle();
            break;

        case 'show-desktop':
            // Minimise all windows on the active workspace
            global.workspace_manager
                .get_active_workspace()
                .list_windows()
                .forEach(w => w.minimize());
            break;

        case 'workspace-next':
            global.workspace_manager
                .get_active_workspace()
                .get_neighbor(Meta.MotionDirection.RIGHT)
                ?.activate(global.get_current_time());
            break;

        case 'workspace-prev':
            global.workspace_manager
                .get_active_workspace()
                .get_neighbor(Meta.MotionDirection.LEFT)
                ?.activate(global.get_current_time());
            break;

        case 'disabled':
        default:
            break;
    }
}

/**
 * Gradually darken the screen instead of immediately suspending.
 *
 * Once the screen is fully dark, it stays that way until the user moves
 * the pointer again. The first movement then hands control to GNOME's
 * normal lock screen.
 */
let _gentleLockOverlay = null;
let _gentleLockMotionId = null;
let _gentleLockFadeId = null;
let _gentleLockMonitor = null;
let _gentleLockActionType = 'sleep';

function startGentleLock(actionType = 'sleep') {
    // Ignore repeated triggers while the transition is already active.
    if (_gentleLockOverlay)
        return;

    _gentleLockActionType = actionType;

    _gentleLockMonitor = Main.layoutManager.primaryMonitor;
    if (!_gentleLockMonitor)
        return;

    const {x, y, width, height} = _gentleLockMonitor;

    _gentleLockOverlay = new St.Widget({
        name: 'CornerGesturesGentleLock',
        reactive: false,
        opacity: 0,
    });

    _gentleLockOverlay.set_position(x, y);
    _gentleLockOverlay.set_size(width, height);
    _gentleLockOverlay.set_style('background-color: black;');

    // Put the blackout above the normal Shell UI, but don't let it consume
    // pointer input; this lets us detect the wake-up movement underneath it.
    Main.layoutManager.addTopChrome(_gentleLockOverlay);

    // Fade to black over 1.5 seconds.
    _gentleLockFadeId = GLib.timeout_add(
        GLib.PRIORITY_DEFAULT,
        16,
        () => {
            if (!_gentleLockOverlay) {
                _gentleLockFadeId = null;
                return GLib.SOURCE_REMOVE;
            }

            const nextOpacity = Math.min(
                255,
                _gentleLockOverlay.opacity + (255 * 16 / 1500)
            );

            _gentleLockOverlay.opacity = nextOpacity;

            if (nextOpacity >= 255) {
                _gentleLockFadeId = null;
                
                if (_gentleLockActionType === 'screen-off') {
                    try {
                        GLib.spawn_command_line_async('busctl --user set-property org.gnome.Mutter.DisplayConfig /org/gnome/Mutter/DisplayConfig org.gnome.Mutter.DisplayConfig PowerSaveMode i 1');
                    } catch (e) {
                        console.error('Failed to turn off screen:', e);
                    }
                }

                return GLib.SOURCE_REMOVE;
            }

            return GLib.SOURCE_CONTINUE;
        }
    );

    let [startX, startY] = global.get_pointer();

    // Movement cancels the fade out, or wakes from the blackout.
    _gentleLockMotionId = global.stage.connect('motion-event', (actor, event) => {
        if (!_gentleLockOverlay)
            return Clutter.EVENT_PROPAGATE;

        const [x, y] = event.get_coords();
        const dx = x - startX;
        const dy = y - startY;
        
        // Ignore tiny jitters (10 pixels radius)
        if (dx * dx + dy * dy < 100) {
            return Clutter.EVENT_PROPAGATE;
        }

        const isCancelled = _gentleLockOverlay.opacity < 255;
        finishGentleLock(_gentleLockActionType, isCancelled);
        return Clutter.EVENT_PROPAGATE;
    });
}

function finishGentleLock(actionType, isCancelled = false) {
    if (_gentleLockMotionId) {
        global.stage.disconnect(_gentleLockMotionId);
        _gentleLockMotionId = null;
    }

    if (_gentleLockFadeId) {
        GLib.source_remove(_gentleLockFadeId);
        _gentleLockFadeId = null;
    }

    if (actionType === 'sleep' && !isCancelled) {
        if (_gentleLockOverlay) {
            Main.layoutManager.removeChrome(_gentleLockOverlay);
            _gentleLockOverlay.destroy();
            _gentleLockOverlay = null;
        }
        _gentleLockMonitor = null;
        // Use GNOME's native lock screen rather than implementing our own.
        Main.screenShield.lock(true);
    } else {
        if (_gentleLockOverlay) {
            // Fade back to transparent over 1.5 seconds.
            _gentleLockFadeId = GLib.timeout_add(
                GLib.PRIORITY_DEFAULT,
                16,
                () => {
                    if (!_gentleLockOverlay) {
                        _gentleLockFadeId = null;
                        return GLib.SOURCE_REMOVE;
                    }

                    const nextOpacity = Math.max(
                        0,
                        _gentleLockOverlay.opacity - (255 * 16 / 1500)
                    );

                    _gentleLockOverlay.opacity = nextOpacity;

                    if (nextOpacity <= 0) {
                        Main.layoutManager.removeChrome(_gentleLockOverlay);
                        _gentleLockOverlay.destroy();
                        _gentleLockOverlay = null;
                        _gentleLockMonitor = null;
                        _gentleLockFadeId = null;
                        return GLib.SOURCE_REMOVE;
                    }

                    return GLib.SOURCE_CONTINUE;
                }
            );
        } else {
            _gentleLockMonitor = null;
        }
    }
}

function cancelGentleLock() {
    if (_gentleLockMotionId) {
        global.stage.disconnect(_gentleLockMotionId);
        _gentleLockMotionId = null;
    }

    if (_gentleLockFadeId) {
        GLib.source_remove(_gentleLockFadeId);
        _gentleLockFadeId = null;
    }

    if (_gentleLockOverlay) {
        Main.layoutManager.removeChrome(_gentleLockOverlay);
        _gentleLockOverlay.destroy();
        _gentleLockOverlay = null;
    }

    _gentleLockMonitor = null;
}

// ─── Corner barrier ─────────────────────────────────────────────────────────

/**
 * One hot-corner zone per screen corner.
 *
 * We create an invisible 1×1-pixel Clutter.Actor in the corner and
 * watch pointer ENTER / LEAVE events.  A GLib timeout enforces the
 * dwell delay so accidental fly-overs are ignored.
 */
const CornerZone = GObject.registerClass(
class CornerZone extends Clutter.Actor {

    _init(corner, getAction, getDelay) {
        const triggerSize = 10;

        super._init({
            name: `CornerZone-${corner}`,
            width: triggerSize,
            height: triggerSize,
            reactive: true,
            opacity: 0,
        });

        this._corner   = corner;   // 'top-left' | 'top-right'
        this._getAction = getAction;
        this._getDelay  = getDelay;
        this._timerId   = null;

        this.connect('enter-event', this._onEnter.bind(this));
        this.connect('leave-event', this._onLeave.bind(this));
    }

    _onEnter(_actor, _event) {
        if (this._timerId) return;
        const delay = this._getDelay();
        this._timerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, delay, () => {
            this._timerId = null;
            const action = this._getAction();
            if (action && action !== 'disabled')
                runAction(action);
            return GLib.SOURCE_REMOVE;
        });
    }

    _onLeave(_actor, _event) {
        if (this._timerId) {
            GLib.source_remove(this._timerId);
            this._timerId = null;
        }
    }

    destroy() {
        this._onLeave();   // cancel pending timer
        super.destroy();
    }
});

// ─── Extension ───────────────────────────────────────────────────────────────

export default class CornerGesturesExtension extends Extension {

    enable() {
        this._settings = this.getSettings();
        this._zones    = [];
        this._buildZones();

        // Rebuild when monitor layout changes
        this._monitorsChangedId = Main.layoutManager.connect(
            'monitors-changed',
            () => {
                this._rebuildZones();
            }
        );
    }

    disable() {
        cancelGentleLock();

        if (this._monitorsChangedId) {
            Main.layoutManager.disconnect(this._monitorsChangedId);
            this._monitorsChangedId = null;
        }
        this._removeZones();
        this._settings = null;
    }

    // ── private ──────────────────────────────────────────────────────────────

    _rebuildZones() {
        this._removeZones();
        this._buildZones();
    }

    _buildZones() {
        const monitor = Main.layoutManager.primaryMonitor;
        if (!monitor) return;

        const { x, y, width } = monitor;

        // Corner name → pixel position (top-left of the 2×2 zone)
        const corners = {
            'top-left':     { cx: x,             cy: y },
            'top-right':    { cx: x + width - 10,  cy: y },
        };

        for (const [corner, pos] of Object.entries(corners)) {
            const settingKey = `${corner}-action`;

            const zone = new CornerZone(
                corner,
                () => this._settings.get_string(settingKey),
                () => this._settings.get_int('corner-delay')
            );

            Main.layoutManager.addChrome(zone);
            zone.set_position(pos.cx, pos.cy);

            this._zones.push(zone);

        }
    }

    _removeZones() {
        for (const zone of this._zones) {
            Main.layoutManager.removeChrome(zone);
            zone.destroy();
        }
        this._zones = [];
    }
}
