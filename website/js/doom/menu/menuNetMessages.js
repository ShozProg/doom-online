/**
 * The messages of the Doom multiplayer flows beyond those of every game
 * (AppMenuNetMessages, AppMenuPairingModal): the WAD whose identity this
 * device cannot compute, and the texts of Doom's own end reason and invite
 * refusals, registered with the shared menus.
 */
class MenuNetMessages {
    static showNoIdentity(display) {
        doomSound.playUi('menu/invalid');
        new MenuModal(display).info(appTranslator.get('multiplayer.error.identity'));
    }
}

AppMenuNetMessages.registerEnd(DoomNetProtocol.END_MATCH_OVER, 'multiplayer.end.matchOver');
AppMenuPairingModal.registerError(DoomNetWadMatch.MISSING, 'multiplayer.error.wadMissing', 'wad');
AppMenuPairingModal.registerError(DoomNetWadMatch.OTHER_VERSION, 'multiplayer.error.wadVersion', 'wad');
