/**
 * The session of the main of a Doom game (NetGameMainSession): its invites
 * carry the WAD every sub must hold and the mode, its subs play their own
 * players except in screen sharing, and a player lost against its will keeps
 * its seat for its return.
 */
class DoomNetMainSession extends NetGameMainSession {
    /**
     * @param {object}       config    - see NetGameMainSession, its mode a DoomNetProtocol.MODE_*, plus:
     * @param {string}       config.wadSha256 - identity of the WAD every sub must hold
     * @param {string}       config.wadLabel  - its title and version, named in a sub's refusal
     * @param {string}       config.wadTitle  - its game and edition, '' for an unknown WAD: a sub holding another version says so
     */
    constructor(config) {
        super(config);

        this._wadSha256 = config.wadSha256;
        this._wadLabel  = config.wadLabel;
        this._wadTitle  = config.wadTitle;
    }

    _subsPlayOwnPlayers(mode) {
        return DoomNetProtocol.subsPlayOwnPlayers(mode);
    }

    _holdsSeats() {
        return true;
    }

    _invitePayload() {
        return DoomNetInvite.encodeInvite(this._wadSha256, this.getMode(), this._wadLabel, this._wadTitle);
    }
}
