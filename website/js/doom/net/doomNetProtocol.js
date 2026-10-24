/**
 * The messages of a Doom multiplayer session, beyond those of every game
 * session (NetGameProtocol, inherited): its modes, its phases without turns
 * and its own end reason.
 */
class DoomNetProtocol extends NetGameProtocol {
    /**
     * @param {int} mode - DoomNetProtocol.MODE_*
     * @returns {boolean} whether every sub of a session in that mode plays its own player, rather than watching the main's
     */
    static subsPlayOwnPlayers(mode) {
        return (mode !== DoomNetProtocol.MODE_SCREEN_SHARING);
    }
}

// Main → every sub in the cycle: the level is over (secret, stats) — the tally.
DoomNetProtocol.INTERMISSION   = 'intermission';
// Main → every sub in the cycle: the tally gives way to the chapter's story text (secret, stats again).
DoomNetProtocol.FINALE         = 'finale';

DoomNetProtocol.END_MATCH_OVER = 'matchOver'; // the deathmatch is over: its last level, or no opponent left

DoomNetProtocol.MODE_SCREEN_SHARING = 1;
DoomNetProtocol.MODE_COOPERATIVE    = 2;
DoomNetProtocol.MODE_DEATHMATCH     = 3;
