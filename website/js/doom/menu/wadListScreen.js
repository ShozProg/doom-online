/**
 * Screen 1: list of the stored WAD files with a delete cross on each, the
 * detail of the selected one on the right with its Play button (a first tap
 * on a row only selects it: a finger sees the detail before opening), adding
 * a WAD (by URL or a local file, through MenuAddWadModal) and joining a game
 * whatever WAD it is played on; the language and the help in the corner.
 */
class WadListScreen extends AbstractMenuScreen {
    /**
     * @param {MenuNavigator} navigator
     * @param {AppMenuDisplay}   display
     * @param {WadRegistry}   registry
     */
    constructor(navigator, display, registry) {
        super(navigator, display);

        const links = new NetGameLinks();

        this._registry       = registry;
        this._join           = new MenuJoinFlow(navigator, display, links, new NetGameAvailability(links, () => new Object3dRendererWebGL().isAvailable()));
        this._listEl         = null;
        this._detailEl        = null;
        this._addButton      = null;
        this._languageButton = null;
        this._progress       = null;
        this._shownWads      = [];
        this._typedUrl       = '';
    }

    _build() {
        this._shownWads = [];

        const {panel, listEl} = this._buildPanel(appTranslator.get('menu.wad.title'));
        this._listEl  = listEl;
        this._detailEl = this._addDetailPanel();
        this._nav.setOnSelect((index) => this._showDetail(this._shownWads[index] ?? null)).setSelectFirstTap(true);

        [this._languageButton] = this._addCornerButtons([
            {icon: 'language', label: doomSettings.getListLabel(this._languageDefinition()), action: () => this._cycleLanguage()},
            {icon: 'help', label: appTranslator.get('help.guide'), action: () => this._openHelp()}
        ]);

        const actions = this._addElement('div', 'app-menu-actions app-menu-actions-start', panel);
        this._addButton = AppMenuDom.addIconButton(actions, 'app-menu-button app-menu-button-secondary', 'add', appTranslator.get('menu.wad.add'),
            () => this._openAdd());
        const joinButton = AppMenuDom.addIconButton(actions, 'app-menu-button app-menu-button-secondary', 'players', appTranslator.get('multiplayer.join'),
            () => this._join.start());
        this._join.greyWhenUnavailable(joinButton);
        this._nav.setBottomButtons([this._addButton, joinButton], null);

        this._showDetail(null);
        this._refresh();
    }

    // --- Build ---

    async _refresh() {
        let list;
        try {
            list = await this._registry.getList();
        } catch (error) {
            this._showError(error);
            return;
        }

        this._clearList(this._listEl);
        this._shownWads = list;
        // With nothing to pick, adding a WAD is the action of the screen.
        this._addButton.classList.toggle('app-menu-button-secondary', (list.length > 0));

        if (list.length === 0) {
            this._showProgress('Загрузка оригинальных ассетов DOOM...');
            try {
                const wadImport = await this._registry.addFromUrl('./doom1.wad');
                const meta = await this._registry.applyImport(wadImport);
                this._closeProgress();
                this._navigator.openWadMenu(meta);
                return;
            } catch (err) {
                console.warn('Auto-import doom1.wad failed:', err);
                this._closeProgress();
            }

            this._showDetail(null);
            this._addListEmpty(this._listEl, appTranslator.get('menu.wad.empty'));
            AppMenuDom.addText(this._listEl, 'doom-menu-empty-hint', appTranslator.get('menu.wad.emptyHint'));
            AppMenuDom.addText(this._listEl, 'doom-menu-empty-hint', appTranslator.get('menu.wad.emptyHintHelp'));
            AppMenuDom.addText(this._listEl, 'doom-menu-empty-hint', appTranslator.get('menu.wad.emptyHintSteps', {
                help: appTranslator.get('help.guide')
            }));
            return;
        }

        const titles = list.map((meta) => WadRegistry.displayTitle(meta));
        const shared = new Set(titles.filter((title, i) => (titles.indexOf(title) !== i)));
        list.forEach((meta, i) => {
            this._buildItem(meta, shared.has(titles[i]));
        });
        // The focus may stay on a corner or bottom button (a language change, an add from the keyboard): the
        // detail shows the first WAD all the same.
        this._nav.restoreIndex(0);
        this._showDetail(list[0]);
        this._completeIdentities(list.filter((meta) => !WadRegistry.isDescribed(meta)));
    }

    async _completeIdentities(pending) {
        if (pending.length === 0) {
            return;
        }
        const results = await Promise.allSettled(pending.map((meta) => this._registry.ensureIdentity(meta)));
        for (const result of results.filter((r) => (r.status === 'rejected'))) {
            console.warn('WadListScreen - unable to describe a WAD: ' + result.reason.message);
        }
        // Only a description actually stored changes the list: anything else would describe it again, endlessly.
        const described = results.some((r) => ((r.status === 'fulfilled') && (r.value !== null)));
        if (described && (this._container !== null)) {
            await this._refresh();
        }
    }

    // The title alone: the rest goes to the detail panel, the version only telling apart two WADs of the same title.
    _buildItem(meta, ambiguousTitle) {
        const item = this._addListItem(this._listEl, WadRegistry.displayTitle(meta), () => {
            this._onSelectWad(meta);
        });
        if (ambiguousTitle) {
            this._addListItemInfos(item, (WadRegistry.versionLabel(meta) ?? meta.name));
        }

        AppMenuDom.addDeleteButton(item, appTranslator.get('menu.wad.delete'), () => {
            this._onDeleteWad(meta);
        });
    }

    _showDetail(meta) {
        this._detailEl.innerHTML     = '';
        this._detailEl.style.display = ((meta !== null) ? '' : 'none');
        if (meta === null) {
            return;
        }
        AppMenuDom.addText(this._detailEl, 'app-menu-detail-title', WadRegistry.displayTitle(meta));
        const facts = [
            {label: appTranslator.get('menu.wad.version'), value: WadRegistry.versionLabel(meta)},
            {label: appTranslator.get('menu.wad.size'), value: AppMenuDom.formatSize(meta.size)},
            {label: appTranslator.get('menu.wad.addedAt'), value: AppMenuDom.formatLongDay(meta.addedAt)}
        ];
        AppMenuDom.addFacts(this._detailEl, facts.filter((fact) => (fact.value !== null)));
        const actions = AppMenuDom.addElement(this._detailEl, 'div', 'app-menu-detail-actions');
        AppMenuDom.addButton(actions, 'app-menu-button app-menu-button-block', appTranslator.get('menu.wad.play'), () => this._onSelectWad(meta));
    }

    _openAdd() {
        new MenuAddWadModal(this._display).open((url) => this._onAddUrl(url), (file) => this._onAddFile(file), this._typedUrl);
    }

    // --- Handlers ---

    // A failed download keeps the address for the next try.
    async _onAddUrl(url) {
        this._typedUrl = url;
        this._showProgress(appTranslator.get('menu.wad.downloading'));
        try {
            await this._offerImport(await this._registry.addFromUrl(url));
            this._typedUrl = '';
        } catch (error) {
            this._showError(error);
        }
    }

    async _onAddFile(file) {
        this._showProgress(appTranslator.get('menu.wad.reading'));
        try {
            await this._offerImport(await this._registry.addFromFile(file));
        } catch (error) {
            this._showError(error);
        }
    }

    async _offerImport(wadImport) {
        if (wadImport.replaced === null) {
            await this._applyImport(wadImport);
            return;
        }
        this._closeProgress();
        const question = appTranslator.get('menu.wad.updateConfirm', {
            wad:  WadRegistry.displayTitle(wadImport.meta),
            from: WadRegistry.versionLabel(wadImport.replaced),
            to:   WadRegistry.versionLabel(wadImport.meta)
        });
        this._confirm(question, async () => {
            this._showProgress(appTranslator.get('menu.wad.updating', {wad: WadRegistry.displayTitle(wadImport.meta)}));
            try {
                await this._applyImport(wadImport);
            } catch (error) {
                this._showError(error);
            }
        }, null, null, false, WadListScreen._updateDetail(wadImport));
    }

    async _applyImport(wadImport) {
        const meta = await this._registry.applyImport(wadImport);
        const code = ((wadImport.replaced !== null) ? 'menu.wad.updated' : 'menu.wad.added');
        await this._refresh();
        this._showNotice(appTranslator.get(code, {wad: WadRegistry.displayLabel(meta)}), false);
    }

    // What the update does to the saves of the WAD, null when it touches none.
    static _updateDetail(wadImport) {
        const lines = [];
        if (wadImport.saves.restarted.length > 0) {
            lines.push(appTranslator.get('menu.wad.updateRestarted', {slots: WadListScreen._slotList(wadImport.saves.restarted)}));
        }
        if (wadImport.saves.removed.length > 0) {
            lines.push(appTranslator.get('menu.wad.updateRemoved', {slots: WadListScreen._slotList(wadImport.saves.removed)}));
        }

        return ((lines.length > 0) ? lines.join('\n\n') : null);
    }

    static _slotList(saves) {
        return saves.map((save) => appTranslator.get('menu.wad.updateSlot', {n: save.meta.slot, level: save.meta.levelCode})).join(', ');
    }

    _onDeleteWad(meta) {
        this._confirm(appTranslator.get('menu.wad.deleteConfirm', {wad: WadRegistry.displayLabel(meta)}), async () => {
            try {
                await this._registry.remove(meta.id);
                await this._refresh();
            } catch (error) {
                this._showError(error);
            }
        }, null, null, true, appTranslator.get('menu.wad.deleteDetail'));
    }

    // --- Messages ---

    _showProgress(message) {
        this._closeProgress();
        this._progress = new MenuModal(this._display).showLoading(message);
    }

    _closeProgress() {
        if (this._progress !== null) {
            this._progress.close();
            this._progress = null;
        }
    }

    _showNotice(message, isError) {
        this._closeProgress();
        new MenuModal(this._display).notice(message, isError);
    }

    _setError(message) {
        this._showNotice(message, true);
    }

    _onSelectWad(meta) {
        this._navigator.openWadMenu(meta);
    }

    // Every label is built once: only a rebuild follows the new language.
    _cycleLanguage() {
        const definition = this._languageDefinition();
        doomSettings
            .set(definition.key, doomSettings.nextListValue(definition))
            .applyToTranslator(appTranslator);

        // The rebuild drops every highlight: hand it back to the button just
        // pressed.
        this.show();
        this._nav.focusSideButton(this._languageButton);
    }

    _languageDefinition() {
        return doomSettings.getDefinition(WadListScreen.LANGUAGE_KEY);
    }
}

WadListScreen.LANGUAGE_KEY = 'display.language';
