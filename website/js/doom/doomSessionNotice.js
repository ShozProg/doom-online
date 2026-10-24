/**
 * The one message of a Doom session over the game (NetSessionNotice): its
 * prompt is the local player's respawn, its status the host's death.
 */
class DoomSessionNotice extends NetSessionNotice {
    constructor() {
        super();

        this._mainDead = false;
        this._respawn  = false;   // the local player is dead and may respawn
    }

    // A turn state came: the wait and the host's pause are over.
    turnArrived(mainDead) {
        this._mainDead = mainDead;
        super.turnArrived();
    }

    setMainDead(dead) {
        this._mainDead = dead;
        this._refresh();
    }

    // Called every frame while the local player is dead or just revived.
    setRespawnPrompt(shown) {
        if (shown === this._respawn) {
            return;
        }
        this._respawn = shown;
        this._refresh();
    }

    clear() {
        this._mainDead = false;
        this._respawn  = false;
        super.clear();
    }

    _promptText() {
        return ((this._respawn) ? appTranslator.get('multiplayer.respawnPrompt') : null);
    }

    _statusText() {
        return ((this._mainDead) ? appTranslator.get('multiplayer.mainDead') : null);
    }
}
