/**
 * Screen after the episode choice: pick the skill, then the new game starts on
 * the episode's first level. The converter filters the THINGS lump by that
 * skill like vanilla does.
 */
class DifficultyScreen extends AbstractMenuScreen {
    /**
     * @param {MenuNavigator} navigator
     * @param {AppMenuDisplay}   display
     */
    constructor(navigator, display) {
        super(navigator, display);

        this._wadMeta     = null;
        this._episode     = null;
        this._showEpisode = false;

        // Skill 0 is our own exploration mode: the skill-1 world without
        // monsters. The names are a generic scale, not the vanilla titles.
        this._skills = [0, 1, 2, 3, 4, 5];
    }

    /**
     * @param {object}  meta
     * @param {object}  episode     chosen episode ({episode, firstLevel, name})
     * @param {boolean} showEpisode the WAD has several: the header names the one chosen
     */
    setWad(meta, episode, showEpisode) {
        this._wadMeta     = meta;
        this._episode     = episode;
        this._showEpisode = showEpisode;

        return this;
    }

    _build() {
        const episodeLabel = ((this._showEpisode) ? appTranslator.get('menu.episode.item', {episode: this._episode.episode}) : null);
        const {listEl}     = this._buildWadMenu(this._wadMeta, appTranslator.get('menu.difficulty.title'), episodeLabel);

        for (const skill of this._skills) {
            this._addListItem(listEl, appTranslator.get('difficulty.' + skill), () => {
                this._onSelectSkill(skill);
            });
        }
        this._addBackItem(listEl);

        this._selectCurrentSkill();
    }

    _onBack() {
        this._navigator.leaveDifficulty(this._wadMeta);
    }

    _onSelectSkill(skill) {
        this._navigator.startNewGame(this._wadMeta, this._episode.firstLevel, skill);
    }

    _selectCurrentSkill() {
        const current = this._navigator.getSelectedDifficulty();
        const index   = this._skills.indexOf(current);

        this._nav.selectIndex(((index >= 0) ? index : 0));
    }
}
