/**
 * Corner Gestures — prefs.js
 * GNOME Shell 46  (GTK4 + libadwaita)
 *
 * Renders a PreferencesWindow with:
 *   • A visual 3×3 corner picker (centre cell = monitor graphic)
 *   • One AdwComboRow per corner to choose the action
 *   • A delay SpinRow
 */

import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

// ─── Action catalogue ────────────────────────────────────────────────────────
// Keep in sync with the switch() in extension.js

const ACTIONS = [
    { id: 'disabled',       label: 'Disabled'            },
    { id: 'sleep',          label: 'Sleep (suspend)'     },
    { id: 'screen-off',     label: 'Turn off screen'     },
    { id: 'blackout',       label: 'Blackout (fade to black)' },
    { id: 'overview',       label: 'Show overview'       },
    { id: 'show-desktop',   label: 'Show desktop'        },
    { id: 'workspace-next', label: 'Next workspace'      },
    { id: 'workspace-prev', label: 'Previous workspace'  },
];

// GSettings key for each corner position in the 3×3 grid
const CORNER_KEYS = {
    'top-left':     'top-left-action',
    'top-right':    'top-right-action',
};

// ─── Helper: build an AdwComboRow bound to a GSettings string key ─────────────

function makeActionRow(label, subtitle, settings, key) {
    // Build a StringList model from ACTIONS
    const model = new Gtk.StringList();
    ACTIONS.forEach(a => model.append(a.label));

    const row = new Adw.ComboRow({
        title: label,
        subtitle,
        model,
    });

    // Set initial selection
    const currentId = settings.get_string(key);
    const idx = ACTIONS.findIndex(a => a.id === currentId);
    row.set_selected(idx >= 0 ? idx : 0);

    // Write back on change
    row.connect('notify::selected', () => {
        const selected = row.get_selected();
        if (selected !== Gtk.INVALID_LIST_POSITION)
            settings.set_string(key, ACTIONS[selected].id);
    });

    // React to external GSettings changes (e.g. dconf reset)
    settings.connect(`changed::${key}`, () => {
        const newId  = settings.get_string(key);
        const newIdx = ACTIONS.findIndex(a => a.id === newId);
        if (newIdx >= 0 && row.get_selected() !== newIdx)
            row.set_selected(newIdx);
    });

    return row;
}

// ─── Preferences page ────────────────────────────────────────────────────────

export default class CornerGesturesPreferences extends ExtensionPreferences {

    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        window.set_default_size(520, 600);
        window.set_title('Corner Gestures');

        // ── Page ──────────────────────────────────────────────────────────────
        const page = new Adw.PreferencesPage({
            title: 'Settings',
            icon_name: 'preferences-desktop-remote-desktop-symbolic',
        });
        window.add(page);

        // ── Visual corner picker (3×3 grid) ───────────────────────────────────
        const pickerGroup = new Adw.PreferencesGroup({ title: 'Corner map' });
        page.add(pickerGroup);

        const grid = new Gtk.Grid({
            row_spacing: 6,
            column_spacing: 6,
            margin_top: 8,
            margin_bottom: 8,
            halign: Gtk.Align.CENTER,
        });
        pickerGroup.add(grid);

        // Centre cell — monitor graphic
        const monitorBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            halign: Gtk.Align.CENTER,
            valign: Gtk.Align.CENTER,
            width_request: 100,
            height_request: 68,
            css_classes: ['card'],
        });
        const monitorIcon = new Gtk.Image({
            icon_name: 'video-display-symbolic',
            pixel_size: 32,
            valign: Gtk.Align.CENTER,
            halign: Gtk.Align.CENTER,
        });
        monitorBox.append(monitorIcon);
        grid.attach(monitorBox, 1, 1, 1, 1);

        // Corner indicator labels (updated live from settings)
        const cornerPositions = [
            { key: 'top-left-action',     col: 0, row: 0, label: '↖' },
            { key: 'top-right-action',    col: 2, row: 0, label: '↗' },
        ];

        for (const cp of cornerPositions) {
            const btn = new Gtk.Button({
                width_request: 90,
                height_request: 68,
                css_classes: ['flat'],
            });

            const vbox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 2 });
            const arrowLabel = new Gtk.Label({ label: cp.label, css_classes: ['title-2'] });
            const actionLabel = new Gtk.Label({
                label: this._actionLabel(settings, cp.key),
                css_classes: ['caption'],
                ellipsize: 3,   // PANGO_ELLIPSIZE_END
                max_width_chars: 12,
            });
            vbox.append(arrowLabel);
            vbox.append(actionLabel);
            btn.set_child(vbox);

            // Update caption when setting changes
            settings.connect(`changed::${cp.key}`, () => {
                actionLabel.set_label(this._actionLabel(settings, cp.key));
            });

            // Clicking a corner button scrolls prefs to that section (via page scroll)
            // — simple UX hint, not strictly necessary
            btn.connect('clicked', () => {});

            grid.attach(btn, cp.col, cp.row, 1, 1);
        }

        // ── Corner action rows ────────────────────────────────────────────────
        const actionsGroup = new Adw.PreferencesGroup({ title: 'Corner actions' });
        page.add(actionsGroup);

        actionsGroup.add(makeActionRow(
            '↖  Top-left corner', 'Action when cursor enters top-left',
            settings, 'top-left-action'
        ));
        actionsGroup.add(makeActionRow(
            '↗  Top-right corner', 'Action when cursor enters top-right',
            settings, 'top-right-action'
        ));
        // ── Delay row ─────────────────────────────────────────────────────────
        const behaviourGroup = new Adw.PreferencesGroup({ title: 'Behaviour' });
        page.add(behaviourGroup);

        const adjustment = new Gtk.Adjustment({
            lower: 100,
            upper: 2000,
            step_increment: 50,
            page_increment: 200,
            value: settings.get_int('corner-delay'),
        });

        const delayRow = new Adw.SpinRow({
            title: 'Trigger delay',
            subtitle: 'Milliseconds the cursor must hover in a corner before the action fires',
            adjustment,
            climb_rate: 50,
            digits: 0,
        });
        behaviourGroup.add(delayRow);

        adjustment.connect('value-changed', () => {
            settings.set_int('corner-delay', adjustment.get_value());
        });
        settings.connect('changed::corner-delay', () => {
            const v = settings.get_int('corner-delay');
            if (adjustment.get_value() !== v)
                adjustment.set_value(v);
        });
    }

    // Return a human-readable action label for the corner map
    _actionLabel(settings, key) {
        const id = settings.get_string(key);
        return ACTIONS.find(a => a.id === id)?.label ?? 'Disabled';
    }
}
