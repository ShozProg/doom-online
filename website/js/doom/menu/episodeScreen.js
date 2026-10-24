/**
 * Screen after "New game": pick the episode, native Doom flow. The episodes
 * are detected from the WAD's level codes and named by the game profile
 * (WadRegistry.getEpisodes), read by the navigator before it shows the screen:
 * a WAD of a single episode skips it.
 */
class EpisodeScreen extends AbstractMenuScreen {
    /**
     * @param {MenuNavigator} navigator
     * @param {AppMenuDisplay}   display
     */
    constructor(navigator, display) {
        super(navigator, display);

        this._wadMeta  = null;
        this._episodes = [];
        this._error    = null;
    }

    /**
     * @param {object}      meta
     * @param {object[]}    episodes - [{episode, firstLevel, name}]
     * @param {Error|null}  error    - why they could not be read
     */
    setWad(meta, episodes, error = null) {
        this._wadMeta  = meta;
        this._episodes = episodes;
        this._error    = error;

        return this;
    }

    _build() {
        const {listEl} = this._buildWadMenu(this._wadMeta, appTranslator.get('menu.episode.title'));

        if (this._error !== null) {
            this._addStatus();
            this._showError(this._error);
        } else if (this._episodes.length === 0) {
            this._addListEmpty(listEl, appTranslator.get('menu.episode.empty'));
        }
        for (const episode of this._episodes) {
            this._addListItem(listEl, this._episodeLabel(episode), () => {
                this._navigator.openDifficulty(this._wadMeta, episode);
            });
        }
        this._addBackItem(listEl);
        this._nav.selectFirst();
    }

    _onBack() {
        this._navigator.leaveEpisodes(this._wadMeta);
    }

    // "Episode {n}", with " - {name}" appended when the profile names it —
    // the number is translated interface text, the name a raw proper noun.
    _episodeLabel(episode) {
        const label = appTranslator.get('menu.episode.item', {episode: episode.episode});

        return ((episode.name !== null) ? (label + ' - ' + episode.name) : label);
    }
}
