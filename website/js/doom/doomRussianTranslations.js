/**
 * Russian translation catalog for DOOM Online UI and Multiplayer menus.
 */
class DoomRussianTranslations {
    static get CATALOG() {
        return {
            'menu.back': { ru: 'Назад' },
            'menu.close': { ru: 'Закрыть' },
            'menu.confirm': { ru: 'Подтвердить' },
            'menu.cancel': { ru: 'Отмена' },
            'menu.reset': { ru: 'Сбросить' },
            'menu.save': { ru: 'Сохранить' },
            'menu.delete': { ru: 'Удалить' },
            'menu.done': { ru: 'Готово' },

            'menu.wad.play': { ru: 'Играть' },
            'menu.wad.newGame': { ru: 'Новая игра' },
            'menu.wad.loadGame': { ru: 'Загрузить игру' },
            'menu.wad.multiplayer': { ru: 'Мультиплеер (P2P)' },
            'menu.wad.options': { ru: 'Настройки' },
            'menu.wad.quit': { ru: 'Выход' },
            'menu.wad.add': { ru: 'Добавить WAD файл' },
            'menu.wad.byUrl': { ru: 'По ссылке (URL)' },
            'menu.wad.byFile': { ru: 'С устройства' },
            'menu.wad.downloading': { ru: 'Загрузка WAD...' },
            'menu.wad.reading': { ru: 'Чтение файла...' },
            'menu.wad.version': { ru: 'Версия' },
            'menu.wad.size': { ru: 'Размер' },
            'menu.wad.addedAt': { ru: 'Добавлен' },
            'menu.wad.empty': { ru: 'Нет установленных WAD файлов' },

            'multiplayer.newDeathmatch': { ru: '☠ Создать лобби Deathmatch' },
            'multiplayer.newCooperative': { ru: '👥 Создать лобби Кооператив' },
            'multiplayer.join': { ru: '🔗 Подключиться по коду / ссылке' },
            'multiplayer.options': { ru: '⚙ Настройки мультиплеера' },

            'multiplayer.lobby.title': { ru: 'Лобби матча ({count}/{capacity})' },
            'multiplayer.lobby.start': { ru: 'НАЧАТЬ ИГРУ' },
            'multiplayer.lobby.leave': { ru: 'Выйти из лобби' },
            'multiplayer.lobby.main': { ru: 'Хост' },
            'multiplayer.lobby.disconnected': { ru: 'Отключен' },
            'multiplayer.lobby.add': { ru: 'Подключить по QR' },
            'multiplayer.lobby.remove': { ru: 'Исключить' },
            'multiplayer.lobby.removeConfirm': { ru: 'Исключить игрока {nickname} из лобби?' },
            'multiplayer.lobby.player': { ru: 'Игрок {slot}: {nickname}' },
            'multiplayer.lobby.ping': { ru: '{ping} мс' },
            'multiplayer.lobby.pingPending': { ru: 'Пинг...' },
            'multiplayer.lobby.away': { ru: 'Свернуто' },
            'multiplayer.lobby.inProgress': { ru: 'Матч уже идет' },

            'multiplayer.pairing.connecting': { ru: 'Установка прямого P2P соединения...' },
            'multiplayer.pairing.showToSub': { ru: 'Покажите этот код подключающемуся игроку' },
            'multiplayer.pairing.readSub': { ru: 'Наведите камеру на ответный код игрока' },
            'multiplayer.pairing.showToMain': { ru: 'Покажите этот код хосту' },
            'multiplayer.pairing.readMain': { ru: 'Наведите камеру на код хоста' },

            'setting.multiplayer.nickname': { ru: 'Никнейм игрока' },
            'setting.multiplayer.frag_limit': { ru: 'Лимит фрагов' },
            'setting.multiplayer.time_limit': { ru: 'Лимит времени' },
            'setting.multiplayer.dm_monsters': { ru: 'Монстры в Deathmatch' },
            'setting.multiplayer.dm_items': { ru: 'Правила оружия и предметов' },
            'setting.multiplayer.friendly_fire': { ru: 'Огонь по своим' },

            'help.multiplayer': { ru: 'Сетевая игра DOOM через WebRTC P2P: создайте лобби, скопируйте ссылку и играйте вместе без выделенных серверов!' }
        };
    }
}
