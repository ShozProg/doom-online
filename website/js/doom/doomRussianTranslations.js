/**
 * Russian & English translation catalog for DOOM Online UI and Multiplayer menus.
 */
class DoomRussianTranslations {
    static get CATALOG() {
        return {
            // General
            'menu.back': { ru: 'Назад', en: 'Back' },
            'menu.close': { ru: 'Закрыть', en: 'Close' },
            'menu.confirm': { ru: 'Подтвердить', en: 'Confirm' },
            'menu.cancel': { ru: 'Отмена', en: 'Cancel' },
            'menu.reset': { ru: 'Сбросить', en: 'Reset' },
            'menu.save': { ru: 'Сохранить', en: 'Save' },
            'menu.delete': { ru: 'Удалить', en: 'Delete' },
            'menu.done': { ru: 'Готово', en: 'Done' },

            // Main Menu
            'menu.game.continue': { ru: 'Продолжить', en: 'Continue' },
            'menu.game.newGame': { ru: 'Новая игра', en: 'New Game' },
            'menu.game.load': { ru: 'Загрузить игру', en: 'Load Game' },
            'menu.game.multiplayer': { ru: 'Сетевая игра (P2P)', en: 'Multiplayer (P2P)' },
            'menu.game.options': { ru: 'Настройки', en: 'Options' },
            'menu.game.about': { ru: 'Об игре', en: 'About' },
            'menu.game.quit': { ru: 'Выход', en: 'Quit' },
            'menu.game.reportBug': { ru: 'Сообщить о баге', en: 'Report a Bug' },

            // WAD list & management
            'menu.wad.play': { ru: 'Играть', en: 'Play' },
            'menu.wad.newGame': { ru: 'Новая игра', en: 'New Game' },
            'menu.wad.loadGame': { ru: 'Загрузить игру', en: 'Load Game' },
            'menu.wad.multiplayer': { ru: 'Сетевая игра (P2P)', en: 'Multiplayer (P2P)' },
            'menu.wad.options': { ru: 'Настройки', en: 'Options' },
            'menu.wad.quit': { ru: 'Выход', en: 'Quit' },
            'menu.wad.add': { ru: 'Добавить WAD файл', en: 'Add WAD File' },
            'menu.wad.byUrl': { ru: 'По ссылке (URL)', en: 'From URL' },
            'menu.wad.byFile': { ru: 'С устройства', en: 'From Device' },
            'menu.wad.downloading': { ru: 'Загрузка WAD...', en: 'Downloading WAD...' },
            'menu.wad.reading': { ru: 'Чтение файла...', en: 'Reading File...' },
            'menu.wad.version': { ru: 'Версия', en: 'Version' },
            'menu.wad.size': { ru: 'Размер', en: 'Size' },
            'menu.wad.addedAt': { ru: 'Добавлен', en: 'Added' },
            'menu.wad.empty': { ru: 'Нет установленных WAD файлов', en: 'No WAD Files Found' },

            // Multiplayer Screen
            'multiplayer.screenTitle': { ru: 'Сетевая игра', en: 'Multiplayer' },
            'multiplayer.newDeathmatch': { ru: 'Создать Deathmatch', en: 'New Deathmatch' },
            'multiplayer.newCooperative': { ru: 'Создать Кооператив', en: 'New Cooperative' },
            'multiplayer.join': { ru: 'Подключиться по ссылке / коду', en: 'Join Game (Link / Code)' },
            'multiplayer.options': { ru: 'Настройки мультиплеера', en: 'Multiplayer Options' },

            // Lobby & Match
            'multiplayer.lobby.title': { ru: 'Лобби матча ({count}/{capacity})', en: 'Match Lobby ({count}/{capacity})' },
            'multiplayer.lobby.start': { ru: 'НАЧАТЬ ИГРУ', en: 'START GAME' },
            'multiplayer.lobby.leave': { ru: 'Выйти из лобби', en: 'Leave Lobby' },
            'multiplayer.lobby.main': { ru: 'Хост', en: 'Host' },
            'multiplayer.lobby.disconnected': { ru: 'Отключен', en: 'Disconnected' },
            'multiplayer.lobby.add': { ru: 'Пригласить по ссылке', en: 'Invite via Link' },
            'multiplayer.lobby.remove': { ru: 'Исключить', en: 'Kick' },
            'multiplayer.lobby.removeConfirm': { ru: 'Исключить игрока {nickname} из лобби?', en: 'Kick player {nickname} from lobby?' },
            'multiplayer.lobby.player': { ru: 'Игрок {slot}: {nickname}', en: 'Player {slot}: {nickname}' },
            'multiplayer.lobby.ping': { ru: '{ping} мс', en: '{ping} ms' },
            'multiplayer.lobby.pingPending': { ru: 'Пинг...', en: 'Pinging...' },
            'multiplayer.lobby.away': { ru: 'Свернуто', en: 'Away' },
            'multiplayer.lobby.inProgress': { ru: 'Матч уже идет', en: 'Match in progress' },

            // Pairing
            'multiplayer.pairing.connecting': { ru: 'Установка прямого P2P соединения...', en: 'Connecting direct P2P...' },
            'multiplayer.pairing.showToSub': { ru: 'Покажите этот код подключающемуся игроку', en: 'Show this code to joining player' },
            'multiplayer.pairing.readSub': { ru: 'Ответный код игрока', en: 'Player response code' },
            'multiplayer.pairing.showToMain': { ru: 'Покажите этот код хосту', en: 'Show this code to host' },
            'multiplayer.pairing.readMain': { ru: 'Код хоста', en: 'Host code' },

            // Settings Definitions
            'settings.display.language': { ru: 'Язык интерфейса', en: 'Language' },
            'settings.display.renderer': { ru: 'Графический движок', en: 'Renderer' },
            'settings.display.crosshair': { ru: 'Отображение прицела', en: 'Crosshair' },
            'settings.display.showFps': { ru: 'Показывать FPS', en: 'Show FPS' },
            'settings.display.distanceShading': { ru: 'Затенение дальности', en: 'Distance shading' },
            'settings.display.textureSmoothing': { ru: 'Сглаживание текстур', en: 'Texture smoothing' },
            'settings.display.waterEffects': { ru: 'Эффекты воды', en: 'Water effects' },

            'settings.game.fallDamage': { ru: 'Урон от падения', en: 'Fall damage' },
            'settings.game.jump': { ru: 'Прыжки', en: 'Jump' },
            'settings.game.crouch': { ru: 'Приседания', en: 'Crouch' },

            'settings.multiplayer.nickname': { ru: 'Никнейм игрока', en: 'Player nickname' },
            'settings.multiplayer.friendlyFire': { ru: 'Огонь по своим', en: 'Friendly fire' },
            'settings.multiplayer.dmMonsters': { ru: 'Монстры в Deathmatch', en: 'Monsters in Deathmatch' },
            'settings.multiplayer.fragLimit': { ru: 'Лимит фрагов', en: 'Frag limit' },
            'settings.multiplayer.timeLimit': { ru: 'Лимит времени', en: 'Time limit' },
            'settings.multiplayer.dmItems': { ru: 'Правила оружия и предметов', en: 'Deathmatch items' },

            'settings.sound.volumeMusic': { ru: 'Громкость музыки', en: 'Music volume' },
            'settings.sound.volumeEffects': { ru: 'Громкость эффектов', en: 'Effects volume' },

            'value.noLimit': { ru: 'Без ограничений', en: 'No limit' },
            'value.deathmatchItems.weaponsStay': { ru: 'Оружие остается на месте', en: 'Weapons stay' },
            'value.deathmatchItems.itemsRespawn': { ru: 'Предметы и оружие возрождаются', en: 'Items and weapons respawn' },

            // Help & Sections
            'help.display': { ru: 'Экран', en: 'Display' },
            'help.game': { ru: 'Игра', en: 'Game' },
            'help.multiplayer': { ru: 'Мультиплеер', en: 'Multiplayer' },
            'help.sound': { ru: 'Звук', en: 'Sound' },
            'help.controls': { ru: 'Управление', en: 'Controls' },
            'help.reset': { ru: 'Сбросить настройки', en: 'Reset all settings' },
            'help.resetConfirm': { ru: 'Сбросить все сохраненные настройки?', en: 'Reset all saved settings?' },
            'help.about': { ru: 'Об игре', en: 'About' }
        };
    }
}
