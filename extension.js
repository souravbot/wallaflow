import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

const BACKGROUND_SCHEMA = 'org.gnome.desktop.background';
const SCREENSAVER_SCHEMA = 'org.gnome.desktop.screensaver';
const IMAGE_EXTENSIONS = new Set([
    '.jpg',
    '.jpeg',
    '.png',
    '.webp',
    '.bmp',
    '.gif',
    '.jxl',
    '.svg',
]);

const WallFlowIndicator = GObject.registerClass(
class WallFlowIndicator extends PanelMenu.Button {
    constructor(extension) {
        super(0.0, 'WallFlow');

        this._extension = extension;
        this._icon = new St.Icon({
            icon_name: 'preferences-desktop-wallpaper-symbolic',
            style_class: 'system-status-icon',
        });
        this.add_child(this._icon);

        this._statusItem = new PopupMenu.PopupMenuItem('WallFlow');
        this._statusItem.setSensitive(false);
        this.menu.addMenuItem(this._statusItem);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        this.menu.addAction('Next Wallpaper', () => {
            this._extension.showNextWallpaper();
        });

        this._pauseItem = this.menu.addAction('Pause Slideshow', () => {
            this._extension.togglePaused();
        });

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        this._folderItem = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false,
        });

        const folderBox = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            style_class: 'wallflow-folder-box',
        });
        this._folderItem.add_child(folderBox);

        folderBox.add_child(new St.Label({
            text: 'Wallpaper Folder',
            x_align: Clutter.ActorAlign.START,
        }));

        this._folderEntry = new St.Entry({
            hint_text: 'Paste folder path',
            x_expand: true,
            can_focus: true,
        });
        this._folderEntry.clutter_text.connect('activate', () => {
            this._applyFolderFromEntry();
        });
        folderBox.add_child(this._folderEntry);

        const buttonBox = new St.BoxLayout({
            x_expand: true,
            style: 'spacing: 8px;',
        });
        folderBox.add_child(buttonBox);

        const setButton = new St.Button({
            label: 'Set Folder',
            can_focus: true,
            x_expand: true,
        });
        setButton.connect('clicked', () => {
            this._applyFolderFromEntry();
        });
        buttonBox.add_child(setButton);

        const currentButton = new St.Button({
            label: 'Use Current',
            can_focus: true,
            x_expand: true,
        });
        currentButton.connect('clicked', () => {
            this._folderEntry.set_text(this._extension.getFolderPath());
        });
        buttonBox.add_child(currentButton);

        this.menu.addMenuItem(this._folderItem);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        this._intervalItem = new PopupMenu.PopupMenuItem('Change Every: --');
        this._intervalItem.setSensitive(false);
        this.menu.addMenuItem(this._intervalItem);

        const presets = [
            ['30s', 30],
            ['1 min', 60],
            ['5 min', 300],
            ['15 min', 900],
        ];

        for (const [label, seconds] of presets) {
            this.menu.addAction(label, () => {
                this._extension.setInterval(seconds);
            });
        }

        const adjustItem = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false,
        });
        const adjustBox = new St.BoxLayout({
            x_expand: true,
            style: 'spacing: 8px;',
        });
        adjustItem.add_child(adjustBox);

        const slowerButton = new St.Button({
            label: '- 30s',
            can_focus: true,
            x_expand: true,
        });
        slowerButton.connect('clicked', () => {
            this._extension.adjustInterval(-30);
        });
        adjustBox.add_child(slowerButton);

        const fasterButton = new St.Button({
            label: '+ 30s',
            can_focus: true,
            x_expand: true,
        });
        fasterButton.connect('clicked', () => {
            this._extension.adjustInterval(30);
        });
        adjustBox.add_child(fasterButton);

        this.menu.addMenuItem(adjustItem);

        const customIntervalItem = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false,
        });
        const customIntervalBox = new St.BoxLayout({
            x_expand: true,
            style: 'spacing: 8px;',
        });
        customIntervalItem.add_child(customIntervalBox);

        this._intervalEntry = new St.Entry({
            hint_text: 'Custom seconds',
            x_expand: true,
            can_focus: true,
        });
        this._intervalEntry.clutter_text.connect('activate', () => {
            this._applyIntervalFromEntry();
        });
        customIntervalBox.add_child(this._intervalEntry);

        const setIntervalButton = new St.Button({
            label: 'Set Time',
            can_focus: true,
        });
        setIntervalButton.connect('clicked', () => {
            this._applyIntervalFromEntry();
        });
        customIntervalBox.add_child(setIntervalButton);

        this.menu.addMenuItem(customIntervalItem);

        this.menu.addAction('Browse Folder...', () => {
            this._extension.openPreferences();
        });

        this.menu.addAction('Open Settings', () => {
            this._extension.openPreferences();
        });
    }

    setPaused(paused) {
        this._pauseItem.label.text = paused ? 'Resume Slideshow' : 'Pause Slideshow';
        this._icon.icon_name = paused
            ? 'media-playback-start-symbolic'
            : 'preferences-desktop-wallpaper-symbolic';
    }

    setStatus(text) {
        this._statusItem.label.text = text;
    }

    setInterval(seconds) {
        this._intervalItem.label.text = `Change Every: ${this._formatInterval(seconds)}`;
        this._intervalEntry.set_text(`${seconds}`);
    }

    syncFolderPath(path) {
        this._folderEntry.set_text(path ?? '');
    }

    _applyFolderFromEntry() {
        this._extension.setFolderPath(this._folderEntry.get_text().trim());
    }

    _applyIntervalFromEntry() {
        const value = Number.parseInt(this._intervalEntry.get_text().trim(), 10);
        if (Number.isNaN(value))
            return;

        this._extension.setInterval(value);
    }

    _formatInterval(seconds) {
        if (seconds < 60)
            return `${seconds}s`;

        if (seconds % 60 === 0)
            return `${seconds / 60} min`;

        const minutes = Math.floor(seconds / 60);
        const remainder = seconds % 60;
        return `${minutes}m ${remainder}s`;
    }
});

export default class WallFlowExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._backgroundSettings = new Gio.Settings({schema: BACKGROUND_SCHEMA});
        this._screensaverSettings = new Gio.Settings({schema: SCREENSAVER_SCHEMA});
        this._files = [];
        this._queue = [];
        this._index = -1;
        this._timeoutId = null;
        this._settingsSignals = [];

        this._indicator = new WallFlowIndicator(this);
        Main.panel.addToStatusArea(this.uuid, this._indicator);

        this._settingsSignals.push(
            this._settings.connect('changed::folder-path', () => this._reload()),
            this._settings.connect('changed::include-subfolders', () => this._reload()),
            this._settings.connect('changed::shuffle', () => this._reload()),
            this._settings.connect('changed::paused', () => {
                this._restartTimer();
                this._updateIndicator();
            }),
            this._settings.connect('changed::show-indicator', () => this._syncIndicatorVisibility()),
            this._settings.connect('changed::interval-seconds', () => this._restartTimer()),
            this._settings.connect('changed::wallpaper-style', () => this._applyStyle()),
            this._settings.connect('changed::mirror-to-lock-screen', () => this._applyCurrentWallpaper()),
            this._settings.connect('changed::refresh-token', () => this.showNextWallpaper())
        );

        this._syncIndicatorVisibility();
        this._applyStyle();
        this._reload();
        this._indicator.syncFolderPath(this.getFolderPath());
        this._indicator.setInterval(this._settings.get_int('interval-seconds'));
    }

    disable() {
        this._stopTimer();

        for (const signalId of this._settingsSignals)
            this._settings.disconnect(signalId);

        this._settingsSignals = [];
        this._files = [];
        this._queue = [];
        this._index = -1;

        this._indicator?.destroy();
        this._indicator = null;

        this._screensaverSettings = null;
        this._backgroundSettings = null;
        this._settings = null;
    }

    togglePaused() {
        const paused = !this._settings.get_boolean('paused');
        this._settings.set_boolean('paused', paused);
    }

    showNextWallpaper() {
        if (this._files.length === 0) {
            this._updateIndicator('No images found');
            return;
        }

        const nextPath = this._pickNextPath();
        if (!nextPath) {
            this._updateIndicator('No images found');
            return;
        }

        this._applyWallpaper(nextPath);
        this._restartTimer();
    }

    getFolderPath() {
        return this._settings.get_string('folder-path');
    }

    setFolderPath(path) {
        const normalizedPath = path.trim();

        if (!normalizedPath) {
            this._settings.set_string('folder-path', '');
            this._indicator?.syncFolderPath('');
            return;
        }

        const folder = Gio.File.new_for_path(normalizedPath);
        if (!folder.query_exists(null)) {
            this._updateIndicator('Folder not found');
            return;
        }

        this._settings.set_string('folder-path', normalizedPath);
        this._indicator?.syncFolderPath(normalizedPath);
    }

    setInterval(seconds) {
        this._settings.set_int('interval-seconds', Math.max(5, seconds));
        this._indicator?.setInterval(this._settings.get_int('interval-seconds'));
    }

    adjustInterval(deltaSeconds) {
        const next = this._settings.get_int('interval-seconds') + deltaSeconds;
        this.setInterval(next);
    }

    _reload() {
        this._indicator?.syncFolderPath(this.getFolderPath());
        this._files = this._scanImages(
            this._settings.get_string('folder-path'),
            this._settings.get_boolean('include-subfolders')
        );

        this._queue = [];
        this._index = -1;

        if (this._files.length > 0)
            this.showNextWallpaper();
        else {
            this._stopTimer();
            this._updateIndicator('Choose a folder with images');
        }
    }

    _restartTimer() {
        this._stopTimer();

        if (this._settings.get_boolean('paused') || this._files.length === 0)
            return;

        const interval = Math.max(5, this._settings.get_int('interval-seconds'));
        this._indicator?.setInterval(interval);
        this._timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, interval, () => {
            this.showNextWallpaper();
            return GLib.SOURCE_REMOVE;
        });
        GLib.Source.set_name_by_id(this._timeoutId, '[WallFlow] wallpaper timer');
        this._updateIndicator();
    }

    _stopTimer() {
        if (this._timeoutId !== null) {
            GLib.Source.remove(this._timeoutId);
            this._timeoutId = null;
        }
    }

    _syncIndicatorVisibility() {
        if (!this._indicator)
            return;

        this._indicator.visible = this._settings.get_boolean('show-indicator');
        this._updateIndicator();
    }

    _updateIndicator(status = null) {
        if (!this._indicator)
            return;

        const paused = this._settings.get_boolean('paused');
        this._indicator.setPaused(paused);

        if (status !== null) {
            this._indicator.setStatus(status);
            return;
        }

        if (this._files.length === 0) {
            this._indicator.setStatus('Choose a folder with images');
            return;
        }

        const interval = this._settings.get_int('interval-seconds');
        const mode = this._settings.get_boolean('shuffle') ? 'Shuffle' : 'Sequence';
        const state = paused ? 'Paused' : `Every ${interval}s`;
        this._indicator.setStatus(`${mode} • ${this._files.length} images • ${state}`);
    }

    _applyCurrentWallpaper() {
        const currentPath = this._getCurrentPath();
        if (currentPath)
            this._applyWallpaper(currentPath);
    }

    _applyWallpaper(path) {
        const uri = Gio.File.new_for_path(path).get_uri();
        const style = this._settings.get_string('wallpaper-style');

        this._backgroundSettings.set_string('picture-uri', uri);
        this._backgroundSettings.set_string('picture-uri-dark', uri);
        this._backgroundSettings.set_string('picture-options', style);

        if (this._settings.get_boolean('mirror-to-lock-screen')) {
            this._screensaverSettings.set_string('picture-uri', uri);
            this._screensaverSettings.set_string('picture-options', style);
        }

        this._updateIndicator(GLib.path_get_basename(path));
    }

    _applyStyle() {
        const style = this._settings.get_string('wallpaper-style');
        this._backgroundSettings.set_string('picture-options', style);

        if (this._settings.get_boolean('mirror-to-lock-screen'))
            this._screensaverSettings.set_string('picture-options', style);
    }

    _getCurrentPath() {
        if (this._index < 0 || this._index >= this._files.length)
            return null;

        return this._files[this._index];
    }

    _pickNextPath() {
        if (this._settings.get_boolean('shuffle'))
            return this._pickNextShuffled();

        this._index = (this._index + 1) % this._files.length;
        return this._files[this._index];
    }

    _pickNextShuffled() {
        if (this._queue.length === 0) {
            this._queue = [...this._files];

            for (let i = this._queue.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this._queue[i], this._queue[j]] = [this._queue[j], this._queue[i]];
            }

            const current = this._getCurrentPath();
            if (current && this._queue.length > 1 && this._queue[0] === current)
                [this._queue[0], this._queue[1]] = [this._queue[1], this._queue[0]];
        }

        const nextPath = this._queue.shift();
        this._index = this._files.indexOf(nextPath);
        return nextPath;
    }

    _scanImages(folderPath, recursive) {
        if (!folderPath)
            return [];

        const folder = Gio.File.new_for_path(folderPath);
        if (!folder.query_exists(null))
            return [];

        const images = [];
        this._collectImages(folder, recursive, images);
        images.sort((a, b) => a.localeCompare(b));
        return images;
    }

    _collectImages(folder, recursive, images) {
        let enumerator;

        try {
            enumerator = folder.enumerate_children(
                'standard::name,standard::type,standard::content-type',
                Gio.FileQueryInfoFlags.NONE,
                null
            );
        } catch (error) {
            console.error(`[WallFlow] Failed to read ${folder.get_path()}: ${error}`);
            return;
        }

        let fileInfo;
        while ((fileInfo = enumerator.next_file(null)) !== null) {
            const child = enumerator.get_child(fileInfo);
            const type = fileInfo.get_file_type();

            if (type === Gio.FileType.DIRECTORY && recursive) {
                this._collectImages(child, recursive, images);
                continue;
            }

            if (type !== Gio.FileType.REGULAR)
                continue;

            const name = fileInfo.get_name().toLowerCase();
            const contentType = fileInfo.get_content_type() ?? '';

            if (contentType.startsWith('image/') || this._hasImageExtension(name))
                images.push(child.get_path());
        }

        enumerator.close(null);
    }

    _hasImageExtension(name) {
        for (const extension of IMAGE_EXTENSIONS) {
            if (name.endsWith(extension))
                return true;
        }

        return false;
    }
}
