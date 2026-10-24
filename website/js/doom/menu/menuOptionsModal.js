/**
 * Options modal of the menus: show() opens the tabs (display, game,
 * multiplayer outside a game, sound, controls) with the reset button,
 * showAbout() and showHelp() open a standalone page. Adds to
 * AppMenuSettingsModal the Controls page (device choice, then the settings of
 * that device; their key, button and axis captures are the socle's).
 */
class MenuOptionsModal extends AppMenuSettingsModal {
    static get DEVICE_REFRESH_MS() {
        return 500;
    }

    static get DEVICE_KEY() {
        return 'controls.device';
    }

    // Settings key prefixes of each input mode (DoomSettings definitions).
    static get SETTING_PREFIXES_BY_MODE() {
        return {
            gamepad:        ['pad.'],
            virtualGamepad: ['virtual_pad.'],
            keyboardMouse:  ['mouse.', 'keyboard.']
        };
    }

    /**
     * @param {AppMenuDisplay} display
     */
    constructor(display) {
        super(display, doomSettings);

        this._shownDevices   = null;
        this._inGame         = false;
        this._rendererLocked = false;
    }

    // Over a running game: the multiplayer settings only apply to the next
    // game, so they are not offered there.
    setInGame(inGame) {
        this._inGame = (inGame === true);

        return this;
    }

    // A multiplayer session renders with WebGL whatever the setting: the
    // renderer is not offered meanwhile.
    setRendererLocked(locked) {
        this._rendererLocked = (locked === true);

        return this;
    }

    show() {
        const tabs = [
            {titleCode: 'help.display', builder: () => this._buildSettingsPage('display.')},
            {titleCode: 'help.game', builder: () => this._buildSettingsPage('game.')}
        ];
        if (!this._inGame) {
            tabs.push({titleCode: 'help.multiplayer', builder: () => this._buildSettingsPage('multiplayer.')});
        }
        tabs.push({titleCode: 'help.sound', builder: () => this._buildSettingsPage('sound.')});
        tabs.push({titleCode: 'help.controls', builder: () => this._buildControls()});

        return this._openTabs('menu.game.options', tabs, {labelCode: 'help.reset', action: () => this._confirmReset()});
    }

    // The multiplayer section alone, from the shortcut of the Multiplayer screen.
    showMultiplayer() {
        return this._open(true, 'help.multiplayer', () => this._buildSettingsPage('multiplayer.'));
    }

    /**
     * The settings of the game about to open, shown to the main just before
     * its lobby: what is changed here is stored, the preset of the next game.
     * Back gives up the opening.
     *
     * @param {string[]} keys       - the settings of the launched mode
     * @param {function} onContinue - once the settings are chosen, after this modal closed
     */
    showGameSettings(keys, onContinue) {
        const continuation = {label: appTranslator.get('multiplayer.settings.continue'), action: () => {
            this.close();
            onContinue();
        }};

        return this._open(false, 'multiplayer.settings.title', () => this._buildSettingsList(keys.map((key) => doomSettings.getDefinition(key))), continuation);
    }

    showAbout() {
        return this._open(true, 'help.about', () => this._buildAbout());
    }

    showHelp() {
        return this._open(true, 'help.guide', () => this._buildHelp());
    }

    // --- Pages ---

    // Wipes every saved setting after a confirmation.
    _confirmReset() {
        this._confirm(appTranslator.get('help.resetConfirm'), () => {
            doomSettings.resetAll();
            this._applySettings();
            this._renderPage();
        }, null, null, true, appTranslator.get('help.resetDetail'));
    }

    _buildControls() {
        const inputs = new Inputs();
        const list   = this._addList();
        const device = this._nav.addItemIn(list, appTranslator.get('settings.controls.device'), () => {
            this._stepDevice(inputs, 1);
        }, (dir) => {
            this._stepDevice(inputs, dir);
        });
        AppMenuDom.addValue(device, this._deviceChoiceLabel(this._currentDeviceChoice(inputs), inputs), true);

        this._shownDevices = this._devicesState(inputs);
        for (const prefix of MenuOptionsModal.SETTING_PREFIXES_BY_MODE[inputs.getMode()]) {
            for (const definition of doomSettings.getDefinitions(prefix)) {
                this._addSettingItem(list, definition);
            }
        }
        this._nav.selectFirst();

        this._setPageTimer(() => {
            if (this._devicesState(inputs) !== this._shownDevices) {
                this._renderPage();
            }
        }, MenuOptionsModal.DEVICE_REFRESH_MS);
    }

    _deviceChoices(inputs) {
        return [DoomSettings.DEVICE_AUTO].concat(inputs.getAvailableModes());
    }

    // A saved device that is not available shows as the automatic choice it falls back on.
    _currentDeviceChoice(inputs) {
        const saved = doomSettings.get(MenuOptionsModal.DEVICE_KEY);

        return ((this._deviceChoices(inputs).includes(saved)) ? saved : DoomSettings.DEVICE_AUTO);
    }

    // The settings listed below follow the device: the page is rebuilt.
    _stepDevice(inputs, dir) {
        const choices = this._deviceChoices(inputs);
        const index   = choices.indexOf(this._currentDeviceChoice(inputs));
        const next    = choices[((index + dir + choices.length) % choices.length)];

        doomSettings.set(MenuOptionsModal.DEVICE_KEY, next).applyToInputs(inputs);
        this._renderPage();
    }

    // What the page shows depends on: the devices offered, the one in use, the gamepad's name.
    _devicesState(inputs) {
        return [inputs.getAvailableModes().join(','), inputs.getMode(), (inputs.getGamepadName() ?? '')].join('|');
    }

    _deviceChoiceLabel(choice, inputs) {
        if (choice === DoomSettings.DEVICE_AUTO) {
            return appTranslator.get('device.auto', {device: this._deviceLabel(inputs.getAutoMode(), inputs)});
        }

        return this._deviceLabel(choice, inputs);
    }

    _deviceLabel(mode, inputs) {
        if (mode === 'virtualGamepad') {
            return appTranslator.get('device.virtualPad');
        }
        if (mode === 'gamepad') {
            return appTranslator.get('device.gamepad', {name: AppInputGamepad.displayName(inputs.getGamepadName() ?? '')});
        }

        return appTranslator.get('device.keyboardMouse');
    }

    _buildSettingsPage(prefix) {
        const definitions = doomSettings.getDefinitions(prefix)
            .filter((definition) => (!this._rendererLocked || (definition.key !== MenuOptionsModal.RENDERER_KEY)));
        this._buildSettingsList(definitions);
    }

    // --- Settings hooks ---

    _applySettings() {
        doomSettings.applyToInputs(new Inputs()).applyToTranslator(appTranslator);
        doomSound.applyVolumes();
    }

    _rebuildsPage(definition) {
        return (definition.key === MenuOptionsModal.LANGUAGE_KEY);
    }

    _buildHelp() {
        const add = appTranslator.get('menu.wad.add') + ' › ';
        this._addLines(['help.guide.wad', 'help.guide.freedoom'], {
            addFile: add + appTranslator.get('menu.wad.byFile')
        });
        this._addExternalLink(DoomExternalLinks.FREEDOOM);
        this._addLines(['help.guide.own', 'help.guide.install', 'help.guide.controls'], {
            addUrl: add + appTranslator.get('menu.wad.byUrl')
        });

        this._addHeading(appTranslator.get('help.about'));
        this._buildAbout();
    }

    _buildAbout() {
        this._addLines(['help.about.what', 'help.about.author', 'help.about.source']);
        this._addExternalLink(DoomExternalLinks.PROJECT);
        this._addLines(['help.about.licence', 'help.about.wads']);
        this._addLines(['help.about.copyright'], {year: new Date().getFullYear()});
    }

}

MenuOptionsModal.RENDERER_KEY   = 'display.renderer';
MenuOptionsModal.LANGUAGE_KEY   = 'display.language';
