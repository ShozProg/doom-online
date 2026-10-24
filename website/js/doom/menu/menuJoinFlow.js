/**
 * Joining a main's game, from the WAD list or from a WAD's Multiplayer screen:
 * Supports both online P2P connection via room code / link, and local QR code pairing.
 */
class MenuJoinFlow {
    /**
     * @param {MenuNavigator}       navigator
     * @param {AppMenuDisplay}      display
     * @param {NetGameLinks}        links
     * @param {NetGameAvailability} availability
     */
    constructor(navigator, display, links, availability) {
        this._navigator    = navigator;
        this._display      = display;
        this._links        = links;
        this._availability = availability;
    }

    greyWhenUnavailable(item) {
        AppMenuNetGate.greyWhenUnavailable(item, () => this._availability.unavailableReason());

        return this;
    }

    start(prefilledRoomCode = null) {
        AppMenuNetGate.enter(this._display, () => this._availability.unavailableReason(), doomSettings, async (nickname) => {
            const wads = await this._navigator.getIdentifiedWads();
            if (prefilledRoomCode) {
                this.startOnline(prefilledRoomCode, nickname, wads);
                return;
            }

            // Ask user for Room Code / Link or QR Code
            this._askJoinMethod(nickname, wads);
        });
    }

    _askJoinMethod(nickname, wads) {
        const modal = new MenuModal(this._display);
        modal.choose('ПОДКЛЮЧЕНИЕ К ЛОББИ', [
            {
                icon: 'link',
                label: 'Подключиться по коду / ссылке (P2P)',
                hint: 'Введите код комнаты (например DM-1234) или ссылку от друга',
                action: () => this._askRoomCode(nickname, wads)
            },
            {
                icon: 'camera',
                label: 'Сканировать QR-код камерой',
                hint: 'Для игры на устройствах рядом',
                action: () => this._pair(new DoomNetSubSession(this._links, wads, nickname))
            }
        ]);
    }

    _askRoomCode(nickname, wads) {
        const {modal} = new MenuModal(this._display)._createShell(
            'ВВЕДИТЕ КОД КОМНАТЫ',
            'app-menu-modal app-menu-modal-fit app-menu-modal-confirm',
            'app-menu-modal-message app-menu-modal-title'
        );

        const hintEl = AppMenuDom.addText(modal, 'app-menu-modal-message', 'Введите 4-значный код комнаты (например: DM-4821) или вставьте полную ссылку:');
        hintEl.style.fontSize = '0.9rem';

        const input = AppMenuDom.addElement(modal, 'input', 'app-menu-input');
        input.type = 'text';
        input.placeholder = 'DM-1234 или ссылка';
        input.autocomplete = 'off';
        input.style.textAlign = 'center';
        input.style.fontSize = '1.2rem';
        input.style.letterSpacing = '2px';
        input.style.textTransform = 'uppercase';

        const errorEl = AppMenuDom.addText(modal, 'app-menu-modal-message app-menu-modal-error', '');

        const actions = AppMenuDom.addElement(modal, 'div', 'app-menu-modal-actions');
        const backBtn = AppMenuDom.addButton(actions, 'app-menu-button app-menu-button-secondary', 'Назад', () => this.start());
        const joinBtn = AppMenuDom.addButton(actions, 'app-menu-button', 'Подключиться', () => {
            let val = input.value.trim();
            if (!val) {
                errorEl.textContent = 'Введите код комнаты';
                input.focus();
                return;
            }
            // Parse room code from URL or direct code
            let roomCode = val;
            let brokerParam = null;
            if (val.includes('room=')) {
                try {
                    const parsedUrl = new URL(val);
                    roomCode = parsedUrl.searchParams.get('room') || roomCode;
                    brokerParam = parsedUrl.searchParams.get('b') || null;
                } catch (_) {
                    const match = val.match(/room=([A-Za-z0-9_-]+)/);
                    if (match) roomCode = match[1];
                    const bMatch = val.match(/b=([A-Za-z0-9_-]+)/);
                    if (bMatch) brokerParam = bMatch[1];
                }
            } else if (val.includes('#')) {
                roomCode = val.split('#').pop().replace('room=', '');
            }

            if (brokerParam) {
                window._doomCurrentBrokerKey = brokerParam;
            }

            modal.closest('.app-menu-overlay')?.remove();
            this.startOnline(roomCode, nickname, wads);
        });

        input.addEventListener('keydown', (e) => {
            if (e.code === 'Enter' || e.code === 'NumpadEnter') {
                e.preventDefault();
                joinBtn.click();
            } else if (e.code === 'Escape') {
                e.preventDefault();
                backBtn.click();
            }
        });

        setTimeout(() => input.focus(), 50);
    }

    async startOnline(roomCode, nickname = null, wads = null) {
        if (!nickname) {
            AppMenuNetGate.enter(this._display, () => this._availability.unavailableReason(), doomSettings, async (nick) => {
                const w = await this._navigator.getIdentifiedWads();
                this.startOnline(roomCode, nick, w);
            });
            return;
        }

        wads = wads || (await this._navigator.getIdentifiedWads());
        const session = new DoomNetSubSession(this._links, wads, nickname);
        window._doomCurrentRoomCode = roomCode;

        const loadingModal = new MenuModal(this._display);
        loadingModal.showLoading('Подключение к лобби ' + roomCode + ' через P2P...');

        try {
            const guestId = 'g-' + Math.random().toString(36).substring(2, 8);
            const signaling = new NetOnlineSignalingChannel();
            window._doomActiveSignaling = signaling;

            let preferredBroker = window._doomCurrentBrokerKey || null;
            try {
                const urlParams = new URLSearchParams(window.location.search);
                preferredBroker = urlParams.get('b') || preferredBroker;
            } catch (_) {}

            await signaling.connect(roomCode, guestId, false, preferredBroker);
            signaling.subscribe(signaling.getGuestTopic(guestId));

            // Setup online pairing adapter
            const codeChannel = signaling.createGuestCodeChannel();
            const view = new OnlinePairingView(codeChannel);

            // Announce presence to host repeatedly until joined
            let helloInterval = null;
            const sendHello = () => {
                signaling.publish(signaling.getHostTopic(), {
                    type: 'hello',
                    guestId: guestId,
                    nickname: nickname
                });
            };

            setTimeout(sendHello, 200);
            helloInterval = setInterval(sendHello, 1500);

            // Join session through online pairing
            try {
                await session.join(view);
            } finally {
                if (helloInterval) {
                    clearInterval(helloInterval);
                    helloInterval = null;
                }
            }

            loadingModal.close();
            this._showLobby(session);
        } catch (err) {
            console.error('Failed to join online room ' + roomCode + ':', err);
            loadingModal.close();
            session.dispose();
            new MenuModal(this._display).showError(
                'Ошибка подключения к лобби ' + roomCode,
                err.message || 'Хост недоступен или не отвечает. Проверьте код и попробуйте снова.',
                () => {}
            );
        }
    }

    _pair(session) {
        new AppMenuPairingModal(this._display).openForSub(session, () => this._showLobby(session), () => session.dispose());
    }

    _showLobby(session) {
        const lobby = new AppMenuLobbyModal(this._display);
        session.setOnEnd((reason) => {
            lobby.close();
            AppMenuNetMessages.showEnd(this._display, reason);
        });
        session.setCycle({
            levelLoad: (level) => {
                lobby.setOnClose(null).close();
                this._navigator.joinSharedGame(session.getWad(), session, level);
            }
        });
        lobby.openSub(session, {leave: () => session.leave()});
    }
}
