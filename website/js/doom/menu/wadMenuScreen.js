/**
 * Menu of one selected WAD, between the WAD list and the episode screen:
 * continue the latest save, new game, load, multiplayer, options, about, and
 * the way out "Quit" back to the WAD list, like the back inputs; the bug
 * report is a link in the corner.
 */
class WadMenuScreen extends AbstractMenuScreen {
    /**
     * @param {MenuNavigator} navigator
     * @param {AppMenuDisplay}   display
     */
    constructor(navigator, display) {
        super(navigator, display);

        this._wadMeta    = null;
        this._latestSave = null;
    }

    /**
     * @param {object} meta
     */
    setWad(meta) {
        this._wadMeta    = meta;
        this._latestSave = null;

        return this;
    }

    _build() {
        const {listEl} = this._buildWadMenu(this._wadMeta);

        if (this._latestSave !== null) {
            const latestSave = this._latestSave;
            this._addListItem(listEl, appTranslator.get('menu.game.continue'), () => {
                this._navigator.startFromSave(this._wadMeta, latestSave);
            });
        }
        this._addListItem(listEl, appTranslator.get('menu.game.newGame'), () => {
            this._navigator.openEpisodes(this._wadMeta);
        });
        this._addListItem(listEl, appTranslator.get('menu.game.load'), () => {
            this._openLoadGame();
        });
        this._addListItem(listEl, appTranslator.get('help.multiplayer'), () => {
            this._navigator.openMultiplayer(this._wadMeta);
        });
        this._addListItem(listEl, appTranslator.get('menu.game.options'), () => {
            this._openOptions();
        });
        this._addListItem(listEl, appTranslator.get('help.about'), () => {
            this._openAbout();
        });
        const quit = this._nav.addItemIn(listEl, appTranslator.get('menu.game.quit'), () => {
            this._onBack();
        });
        this._addLinks([{label: appTranslator.get('menu.game.reportBug'), action: () => {
            window.open(DoomExternalLinks.ISSUES, '_blank', 'noopener');
        }}]);
        this._nav.setBackTarget(quit);

        this._nav.selectFirst();
        this._refreshLastSave();
    }

    _onBack() {
        this._navigator.showWadList();
    }

    _openOptions() {
        this._openModal(new MenuOptionsModal(this._display)).show();
    }

    // Save slots of this WAD in load mode; picking one launches its level
    // with the saved state restored on top.
    _openLoadGame() {
        this._openModal(new MenuSaveSlotsModal(this._display)
            .setMode(MenuSaveSlotsModal.MODE_LOAD)
            .setWad(this._wadMeta)
            .setOnLoad((saveMeta) => {
                this._navigator.startFromSave(this._wadMeta, saveMeta);
            }))
            .show();
    }

    // The latest save behind "Continue", read again at each render (a save may have been deleted meanwhile): the
    // screen renders once more only when it changed.
    async _refreshLastSave() {
        const container = this._container;
        let latest      = null;
        try {
            for (const save of Object.values(await doomSaveStore.list(this._wadMeta.id))) {
                latest = (((latest === null) || (save.savedAt > latest.savedAt)) ? save : latest);
            }
        } catch (error) {
            console.warn('WadMenuScreen - unable to list the saves: ' + error.message);
            return;
        }
        if ((this._container !== container) || (WadMenuScreen._saveKey(latest) === WadMenuScreen._saveKey(this._latestSave))) {
            return;
        }
        this._latestSave = latest;
        this.show();
    }

    static _saveKey(save) {
        return ((save !== null) ? (save.slot + ':' + save.savedAt) : null);
    }
}
