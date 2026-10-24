/**
 * Base of the modals the game shows over its own level (pause, death): a
 * simple centred menu on the transparent AppMenuDisplay, over the game, its
 * header rebuilt through its provider whenever a stacked
 * child closes (the language may have changed), the game's save/load context
 * feeding the stacked slots modal, and the quit entry last. Escape stays
 * with the game loop.
 */
class AbstractGameMenuModal extends AppMenuAbstractListModal {
    /**
     * @param {AppMenuDisplay} display
     */
    constructor(display) {
        super(display);

        this._nav.setEscapeAsBack(false);
        this._onQuit         = null;
        this._headerProvider = null;
        this._saveContext    = null;
        this._stackedModals  = {};
    }

    setOnQuit(callback) {
        this._onQuit = callback;

        return this;
    }

    /**
     * Save/load wiring provided by the running game: {wadMeta, buildMeta(slot),
     * capture(), canSave(), onLoad(saveMeta)}. Null (direct test shortcut
     * without stored WAD metadata) hides the save and load entries.
     *
     * @param {object|null} context
     */
    setSaveContext(context) {
        this._saveContext = context;

        return this;
    }

    /**
     * @param {function} headerProvider returns the (translated) header: {title, subtitle|null}
     */
    show(headerProvider) {
        this._headerProvider = headerProvider ?? this._headerProvider;

        const header   = this._headerProvider();
        const {listEl} = this._openSimpleShell(header.title, header.subtitle);
        this._addEntries(listEl);
        this._nav.selectFirst();

        return this;
    }

    // The entries of the concrete modal, in display order.
    _addEntries(listEl) {
        throw new Error('AbstractGameMenuModal._addEntries must be implemented');
    }

    _teardown() {
        for (const key of Object.keys(this._stackedModals)) {
            this._stackedModals[key].setOnClose(null).close();
            delete this._stackedModals[key];
        }
    }

    // This modal is re-rendered when the stacked child closes: a language
    // change must reach its title and entries.
    _openStacked(key, modal) {
        this._stackedModals[key] = modal.setOnClose(() => {
            delete this._stackedModals[key];
            this.show();
        });

        return modal;
    }

    // The modal is stored BEFORE the async show(), so _teardown always holds
    // the modal, never a promise.
    _openSlots(mode, onSaved = null) {
        this._openStacked('slots', new MenuSaveSlotsModal(this._display)
            .setMode(mode)
            .setWad(this._saveContext.wadMeta)
            .setSaveContext(this._saveContext)
            .setOnLoad((saveMeta) => this._saveContext.onLoad(saveMeta))
            .setOnSaved(onSaved))
            .show();
    }

    _quit() {
        if (this._onQuit !== null) {
            this._onQuit();
        }
    }
}
