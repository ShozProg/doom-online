/**
 * "Add a WAD file" modal of the WAD list: two tiles, by URL (the modal turns
 * into an address field of the browser, where an address can be pasted) or a
 * local file (the system's file picker). The WAD list takes over once the
 * modal closed itself.
 */
class MenuAddWadModal extends MenuModal {
    /**
     * @param {AppMenuDisplay} display
     */
    constructor(display) {
        super(display);

        this._onUrl     = null;
        this._onFile    = null;
        this._fileInput = null;
        this._url       = '';
    }

    /**
     * @param {function(string): void} onUrl  - the address typed, normalized
     * @param {function(File): void}   onFile - the file picked
     * @param {string}                 url    - the address of a download that failed, typed again in the field
     */
    open(onUrl, onFile, url = '') {
        this._onUrl  = onUrl;
        this._onFile = onFile;
        this._url    = url;

        return this._showChoices();
    }

    _showChoices() {
        this.choose(appTranslator.get('menu.wad.add'), [
            {icon: 'link', label: appTranslator.get('menu.wad.byUrl'), hint: appTranslator.get('menu.wad.byUrlHint'), action: () => this._askUrl()},
            {icon: 'file', label: appTranslator.get('menu.wad.byFile'), hint: appTranslator.get('menu.wad.byFileHint'), action: () => this._fileInput.click()}
        ]);
        // In the modal, not detached: some browsers only open the picker of an input of the page.
        this._fileInput        = AppMenuDom.addElement(this._overlay, 'input', 'app-menu-file-input');
        this._fileInput.type   = 'file';
        this._fileInput.accept = '.wad';
        this._fileInput.addEventListener('change', () => {
            const file = this._fileInput.files[0];
            if (file !== undefined) {
                this.close();
                this._onFile(file);
            }
        });

        return this;
    }

    _askUrl() {
        const {modal} = this._createShell(appTranslator.get('menu.wad.byUrlTitle'), 'app-menu-modal app-menu-modal-fit app-menu-modal-confirm', 'app-menu-modal-message app-menu-modal-title');
        const input   = AppMenuDom.addElement(modal, 'input', 'app-menu-input');
        input.type         = 'url';
        input.placeholder  = appTranslator.get('menu.wad.urlPlaceholder');
        input.autocomplete = 'off';
        input.value        = this._url;
        const errorEl = AppMenuDom.addText(modal, 'app-menu-modal-message app-menu-modal-error', '');
        const actions = AppMenuDom.addElement(modal, 'div', 'app-menu-modal-actions');
        const back    = AppMenuDom.addButton(actions, 'app-menu-button app-menu-button-secondary', appTranslator.get('menu.back'), () => this._showChoices());
        const add     = AppMenuDom.addButton(actions, 'app-menu-button', appTranslator.get('menu.wad.addButton'), () => {
            const url = WadRegistry.normalizeUrl(input.value);
            if (url === '') {
                errorEl.textContent = appTranslator.get('menu.wad.urlMissing');
                input.focus();
                return;
            }
            this.close();
            this._onUrl(url);
        });
        // The navigation leaves the keys of a field to it: Escape is wired here.
        input.addEventListener('keydown', (event) => {
            if ((event.code === 'Enter') || (event.code === 'NumpadEnter')) {
                event.preventDefault();
                add.click();
            } else if (event.code === 'Escape') {
                event.preventDefault();
                back.click();
            }
        });
        this._attachButtonsNav([back, add], back, 1);
        input.focus();
    }
}
