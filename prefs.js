import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const WALLPAPER_STYLES = ['zoom', 'scaled', 'centered', 'stretched', 'spanned'];

export default class WallFlowPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        const page = new Adw.PreferencesPage();
        const sourceGroup = new Adw.PreferencesGroup({
            title: 'Wallpaper Source',
            description: 'Use your own image folder as a slideshow source.',
        });
        const playbackGroup = new Adw.PreferencesGroup({
            title: 'Playback',
            description: 'Control how often wallpapers change and how they are chosen.',
        });
        const extrasGroup = new Adw.PreferencesGroup({
            title: 'Extras',
            description: 'Small quality-of-life controls.',
        });

        page.add(sourceGroup);
        page.add(playbackGroup);
        page.add(extrasGroup);
        window.add(page);
        window.search_enabled = true;

        const folderRow = new Adw.EntryRow({
            title: 'Image Folder',
            text: settings.get_string('folder-path'),
        });
        folderRow.connect('changed', row => {
            settings.set_string('folder-path', row.text.trim());
        });

        const browseButton = new Gtk.Button({
            label: 'Browse',
            valign: Gtk.Align.CENTER,
        });
        browseButton.connect('clicked', () => {
            this._selectFolder(window, settings, folderRow);
        });
        folderRow.add_suffix(browseButton);
        folderRow.activates_default = false;
        sourceGroup.add(folderRow);

        const recursiveRow = new Adw.SwitchRow({
            title: 'Include Subfolders',
            subtitle: 'Scan nested folders too.',
            active: settings.get_boolean('include-subfolders'),
        });
        recursiveRow.connect('notify::active', row => {
            settings.set_boolean('include-subfolders', row.active);
        });
        sourceGroup.add(recursiveRow);

        const intervalAdjustment = new Gtk.Adjustment({
            lower: 5,
            upper: 86400,
            step_increment: 5,
            page_increment: 60,
            value: settings.get_int('interval-seconds'),
        });
        const intervalRow = new Adw.SpinRow({
            title: 'Change Every',
            subtitle: 'Seconds between wallpaper changes.',
            adjustment: intervalAdjustment,
        });
        intervalRow.connect('notify::value', row => {
            settings.set_int('interval-seconds', Math.round(row.get_value()));
        });
        playbackGroup.add(intervalRow);

        const shuffleRow = new Adw.SwitchRow({
            title: 'Shuffle Mode',
            subtitle: 'Avoids immediate repeats until the current round finishes.',
            active: settings.get_boolean('shuffle'),
        });
        shuffleRow.connect('notify::active', row => {
            settings.set_boolean('shuffle', row.active);
        });
        playbackGroup.add(shuffleRow);

        const pausedRow = new Adw.SwitchRow({
            title: 'Pause Slideshow',
            subtitle: 'Stop automatic changes until you resume it from the panel menu.',
            active: settings.get_boolean('paused'),
        });
        pausedRow.connect('notify::active', row => {
            settings.set_boolean('paused', row.active);
        });
        playbackGroup.add(pausedRow);

        const styleModel = Gtk.StringList.new([
            'Zoom',
            'Scaled',
            'Centered',
            'Stretched',
            'Spanned',
        ]);
        const currentStyle = settings.get_string('wallpaper-style');
        const currentStyleIndex = Math.max(0, WALLPAPER_STYLES.indexOf(currentStyle));
        const styleRow = new Adw.ComboRow({
            title: 'Wallpaper Fit',
            subtitle: 'How each image should fill the desktop.',
            model: styleModel,
            selected: currentStyleIndex,
        });
        styleRow.connect('notify::selected', row => {
            settings.set_string('wallpaper-style', WALLPAPER_STYLES[row.selected]);
        });
        extrasGroup.add(styleRow);

        const lockScreenRow = new Adw.SwitchRow({
            title: 'Mirror To Lock Screen',
            subtitle: 'Use the same wallpaper for the lock screen.',
            active: settings.get_boolean('mirror-to-lock-screen'),
        });
        lockScreenRow.connect('notify::active', row => {
            settings.set_boolean('mirror-to-lock-screen', row.active);
        });
        extrasGroup.add(lockScreenRow);

        const indicatorRow = new Adw.SwitchRow({
            title: 'Show Panel Icon',
            subtitle: 'Quick pause, resume, next wallpaper, and settings access.',
            active: settings.get_boolean('show-indicator'),
        });
        indicatorRow.connect('notify::active', row => {
            settings.set_boolean('show-indicator', row.active);
        });
        extrasGroup.add(indicatorRow);

        const nextRow = new Adw.ActionRow({
            title: 'Preview Next Wallpaper',
            subtitle: 'Immediately switch to the next image from your folder.',
        });
        const nextButton = new Gtk.Button({
            label: 'Next Now',
            valign: Gtk.Align.CENTER,
        });
        nextButton.connect('clicked', () => {
            settings.set_int('refresh-token', settings.get_int('refresh-token') + 1);
        });
        nextRow.add_suffix(nextButton);
        nextRow.activatable_widget = nextButton;
        extrasGroup.add(nextRow);
    }

    _selectFolder(window, settings, folderRow) {
        const chooser = new Gtk.FileChooserNative({
            title: 'Choose Wallpaper Folder',
            transient_for: window,
            action: Gtk.FileChooserAction.SELECT_FOLDER,
            accept_label: 'Select',
            cancel_label: 'Cancel',
        });

        const currentPath = settings.get_string('folder-path');
        if (currentPath) {
            const file = Gio.File.new_for_path(currentPath);
            if (file.query_exists(null))
                chooser.set_file(file);
        }

        chooser.connect('response', (dialog, response) => {
            if (response === Gtk.ResponseType.ACCEPT) {
                const file = dialog.get_file();
                if (file) {
                    const path = file.get_path();
                    settings.set_string('folder-path', path);
                    folderRow.text = path;
                }
            }

            dialog.destroy();
        });

        chooser.show();
    }
}
