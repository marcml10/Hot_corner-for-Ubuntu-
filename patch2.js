const fs = require('fs');

let content = fs.readFileSync('extension.js', 'utf8');

const oldMotion = 
`    // Do not lock during the fade. Only movement after the screen is fully
    // dark wakes it and opens GNOME's lock screen (if configured to lock).
    _gentleLockMotionId = global.stage.connect('motion-event', () => {
        if (!_gentleLockOverlay || _gentleLockOverlay.opacity < 255)
            return Clutter.EVENT_PROPAGATE;

        finishGentleLock(_gentleLockActionType);
        return Clutter.EVENT_PROPAGATE;
    });`;

const newMotion = 
`    let [startX, startY] = global.get_pointer();

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
    });`;

content = content.replace(oldMotion, newMotion);

fs.writeFileSync('extension.js', content);
