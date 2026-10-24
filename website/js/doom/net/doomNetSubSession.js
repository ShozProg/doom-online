/**
 * The session of a sub of a Doom game (NetGameSubSession): it takes the
 * main's invite for the stored WAD the main plays — refused when there is
 * none —, views the main's player in screen sharing, and follows the tally
 * and the finale besides the pause.
 */
class DoomNetSubSession extends NetGameSubSession {
    /**
     * @param {NetGameLinks} links
     * @param {object[]}     wads     - the stored WADs, their identity computed
     * @param {string}       nickname
     */
    constructor(links, wads, nickname) {
        super(links, nickname);

        this._wads = wads;
        this._wad  = null;
        this._mode = DoomNetProtocol.MODE_SCREEN_SHARING;
    }

    // The metadata of the stored WAD the main plays, null until its invite is read.
    getWad() {
        return this._wad;
    }

    _subsPlayOwnPlayers(mode) {
        return DoomNetProtocol.subsPlayOwnPlayers(mode);
    }

    _acceptInvite(bytes) {
        this._wad = DoomNetWadMatch.find(this._wads, DoomNetInvite.decodeInvite(bytes));
    }

    _phases() {
        return [DoomNetProtocol.PAUSE, DoomNetProtocol.INTERMISSION, DoomNetProtocol.FINALE];
    }
}
