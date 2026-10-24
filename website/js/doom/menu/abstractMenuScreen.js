/**
 * Base class of the Spipu-Doom menu screens: the socle skeleton
 * (AppMenuAbstractScreen) with the doom title, the simple menus of a WAD over
 * its title picture, the doom modals and the WAD error messages.
 */

class AbstractMenuScreen extends AppMenuAbstractScreen {
    /**
     * @param {MenuNavigator} navigator
     * @param {AppMenuDisplay}   display
     */
    constructor(navigator, display) {
        super(display);

        this._navigator = navigator;
    }

    _titleText() {
        return '';
    }

    // Simple menu of a WAD over its title picture, once read: the WAD's title as the header of its own menu, the step
    // as the header of the next ones (the WAD then under it).
    _buildWadMenu(wadMeta, stepText = null, detailText = null) {
        let parts;
        if (stepText === null) {
            parts = this._buildSimpleMenu('');
            parts.titleEl.innerHTML = '<img class="app-menu-doom-logo" src="./assets/m_doom.png" alt="DOOM" />';
            parts.subtitleEl.textContent = '';
        } else {
            parts = this._buildSimpleMenu(stepText, detailText);
            const logo = document.createElement('img');
            logo.className = 'app-menu-doom-logo-small';
            logo.src = './assets/m_doom.png';
            logo.alt = 'DOOM';
            parts.titleEl.parentNode.insertBefore(logo, parts.titleEl);
        }
        const container = this._container;
        this._navigator.getTitlePictureUrl(wadMeta).then((url) => {
            if ((url !== null) && (this._container === container)) {
                this._setBackground(url);
            }
        });

        return parts;
    }

    _addBackItem(listEl) {
        const item = this._nav.addItemIn(listEl, appTranslator.get('menu.back'), () => this._onBack());
        this._nav.setBackTarget(item);

        return item;
    }

    _wadTitle(meta) {
        return WadRegistry.displayTitle(meta);
    }

    _openAbout() {
        this._openModal(new MenuOptionsModal(this._display)).showAbout();
    }

    _openHelp() {
        this._openModal(new MenuOptionsModal(this._display)).showHelp();
    }

    _confirm(message, onConfirm, confirmLabel = null, cancelLabel = null, destructive = false, detail = null) {
        return new MenuModal(this._display).confirm(message, onConfirm, confirmLabel, cancelLabel, destructive, detail);
    }

    _showError(error) {
        this._setError(this._errorMessage(error));
    }

    // An error outside the WadError set is a genuine bug: it shows its raw
    // English message, which is what a report needs.
    _errorMessage(error) {
        const translationCodes = {
            'fetch-offline':       'error.fetchOffline',
            'fetch-blocked':       'error.fetchBlocked',
            'fetch-http':          'error.fetchHttp',
            'fetch-failed':        'error.fetchFailed',
            'invalid-format':      'error.invalidFormat',
            'quota-exceeded':      'error.quotaExceeded',
            'storage-unavailable': 'error.storageUnavailable',
            'not-found':           'error.notFound',
            'duplicate':           'error.wadDuplicate',
            'older-edition':       'error.wadOlder'
        };

        const code = ((error instanceof WadError) ? error.getCode() : null);
        if (translationCodes[code] === undefined) {
            return appTranslator.get('error.generic', {message: error.message});
        }
        const detail = error.getDetail();

        return appTranslator.get(translationCodes[code]) + ((detail !== null) ? ' (' + detail + ')' : '');
    }
}
