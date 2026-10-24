function loadApp()
{
    new AppViewportStabilizer().install();

    // Register translation catalogs (Russian default, fallback to English)
    appTranslator.addCatalog(AppMenuTranslations.CATALOG)
        .addCatalog(DoomTranslations.CATALOG)
        .addCatalog(DoomRussianTranslations.CATALOG)
        .setFallbackLanguage('en')
        .setLanguage('ru');

    doomImageAssets.load();
    doomFinaleTexts.load();
    doomLevelPatches.load();

    AppMenuSound.setPlayer((event) => doomSound.playUi('menu/' + event));

    loader.world().setUserClass(DoomUser);

    const menu = new MenuNavigator();
    menu.start();
}

appBootstrap.setReadyCallback(loadApp);
