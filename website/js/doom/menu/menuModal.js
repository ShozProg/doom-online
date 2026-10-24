/**
 * The doom modals: the confirmation, information, loading and error ones of
 * AppMenuModal, plus the end-of-level tally and the finale texts.
 */
class MenuModal extends AppMenuModal {
    /**
     * End-of-level tally: the level's closing sentence as a title, the time
     * large in the middle, one line per score (label, a progress bar, the
     * count and its percentage) and a single full-width button. Not
     * dismissable by clicking outside — the player has to press it. Without a
     * label (a sub following the main's), it only shows.
     *
     * A multiplayer tally (cooperative scores or deathmatch frags) has no
     * score line but a table, in a wider shell: a column per player, headed
     * by its name in its colour, a row per score.
     *
     * @param {string}        title
     * @param {object}        time   - {label, value}, value already formatted
     * @param {object[]}      scores - [{label, count, percent|null, ratio|null}], no bar without a ratio
     * @param {string|null}   label  - button label, null for no button
     * @param {function|null} action
     * @param {object|null}   table  - {columns: [{name, color|null}], rows: [{label, values}]}, null for none
     */
    tally(title, time, scores, label, action, table = null) {
        const shellClass = ((table !== null) ? 'app-menu-modal doom-menu-modal-tally-players' : 'app-menu-modal doom-menu-modal-tally');
        const {modal}    = this._createShell(title, shellClass, 'app-menu-modal-message app-menu-modal-title');

        const body   = AppMenuDom.addElement(modal, 'div', 'doom-menu-tally');
        const timeEl = AppMenuDom.addElement(body, 'div', 'doom-menu-tally-time');
        AppMenuDom.addText(timeEl, 'doom-menu-tally-label', time.label);
        AppMenuDom.addText(timeEl, 'doom-menu-tally-time-value', time.value);
        for (const score of scores) {
            const row = AppMenuDom.addElement(body, 'div', 'doom-menu-tally-line');
            AppMenuDom.addText(row, 'doom-menu-tally-label', score.label);
            const bar = AppMenuDom.addElement(row, 'div', 'doom-menu-tally-bar');
            bar.style.visibility = ((score.ratio !== null) ? '' : 'hidden');
            AppMenuDom.addElement(bar, 'div', 'doom-menu-tally-bar-fill').style.width = ((score.ratio ?? 0) * 100) + '%';
            const value = AppMenuDom.addText(row, 'doom-menu-tally-value', score.count);
            if (score.percent !== null) {
                AppMenuDom.addText(value, 'doom-menu-tally-percent', score.percent);
            }
        }
        if (table !== null) {
            this._addTallyTable(body, table);
        }

        this._addActionButton(modal, label, action);

        return this;
    }

    /**
     * Story text of the end of a chapter (or of the game), shown after the
     * tally. The text IS the message of the shell — no title, the tally just
     * announced the end of the level. Like the tally, it waits for its button,
     * or only shows without a label.
     *
     * @param {string}        text
     * @param {string|null}   label  - button label, null for no button
     * @param {function|null} action
     */
    finale(text, label, action) {
        const {modal} = this._createShell(text, 'app-menu-modal doom-menu-modal-finale', 'doom-menu-finale');

        this._addActionButton(modal, label, action);

        return this;
    }

    // --- Internal ---

    _addTallyTable(body, table) {
        const grid = AppMenuDom.addElement(body, 'div', 'doom-menu-tally-table');
        grid.style.gridTemplateColumns = 'auto repeat(' + table.columns.length + ', minmax(0, 1fr))';
        AppMenuDom.addElement(grid, 'div', 'doom-menu-tally-label');
        for (const column of table.columns) {
            const header = AppMenuDom.addText(grid, 'doom-menu-tally-player', column.name);
            if (column.color !== null) {
                AppMenuDom.addColorSwatch(header, column.color);
            }
        }
        for (const row of table.rows) {
            const label = AppMenuDom.addText(grid, 'doom-menu-tally-label', row.label);
            if ((row.color ?? null) !== null) {
                AppMenuDom.addColorSwatch(label, row.color);
            }
            for (const value of row.values) {
                AppMenuDom.addText(grid, 'doom-menu-tally-value', value);
            }
        }
    }

    // The single full-width button of the tally and the finale; none without a label.
    _addActionButton(modal, label, action) {
        if (label === null) {
            return;
        }
        const actions = AppMenuDom.addElement(modal, 'div', 'app-menu-modal-actions');
        const button = AppMenuDom.addButton(actions, 'app-menu-button app-menu-button-block', label, () => {
            this.close();
            action();
        });
        this._attachButtonsNav([button], button, 0);
    }
}
