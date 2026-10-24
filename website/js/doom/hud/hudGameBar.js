/**
 * Authentic Classic DOOM Status Bar (STBAR) HUD.
 * Renders the original 1993 id Software 320x32 metallic status bar:
 *   - AMMO: Tall red numbers (STTNUM*)
 *   - HEALTH: Tall red numbers + percent (STTPRMNT)
 *   - ARMS: Authentic STARMS panel with yellow weapon slots (STYSNUM*) in coop/singleplayer
 *   - FRAGS: Tall red frags counter in Deathmatch mode
 *   - DOOMGUY FACE: Animated center face (STFST*, damage stages, god mode, ouch, dead)
 *   - ARMOR: Tall red numbers + percent
 *   - KEYS: Authentic keycards / skulls (STKEYS*)
 *   - AMMO TABLE: Bull, Shel, Rokt, Cell with current/max in yellow numbers
 *
 * Rendered on a native 320x32 pixel canvas with pixelated scaling, plus
 * lightweight retro floating overlays for FPS/ping, power-up timers, and Deathmatch match stats.
 */
class HudGameBar extends AbstractHud {
    constructor(engine) {
        super(engine);
        this._profile     = null;
        this._itemCatalog = null;
        this._stats       = null;
        this._rules       = null;
        this._bodies      = null;
        this._slotColors  = [];
        this._pingSource  = null;
        this._root        = null;
        this._canvas      = null;
        this._ctx         = null;
        this._images      = {};
        this._imagesLoaded = false;
        this._els         = {};
        this._effectEls   = {};
        this._fragRows    = [];

        // Animation state for Doomguy face
        this._faceLookTick   = 0;
        this._faceLookDir    = 0; // 0 = straight, 1 = right, 2 = left
        this._lastEnergy     = 100;
        this._ouchTicks      = 0;

        this._preloadAssets();
    }

    _preloadAssets() {
        const assetNames = [
            'stbar', 'starms',
            'stfst00', 'stfst01', 'stfst02',
            'stfst10', 'stfst20', 'stfst30', 'stfst40',
            'stfdead0', 'stfevl0', 'stfgod0', 'stfouch0',
            'sttnum0', 'sttnum1', 'sttnum2', 'sttnum3', 'sttnum4',
            'sttnum5', 'sttnum6', 'sttnum7', 'sttnum8', 'sttnum9',
            'sttprcnt',
            'stysnum0', 'stysnum1', 'stysnum2', 'stysnum3', 'stysnum4',
            'stysnum5', 'stysnum6', 'stysnum7', 'stysnum8', 'stysnum9',
            'stkeys0', 'stkeys1', 'stkeys2', 'stkeys3', 'stkeys4', 'stkeys5'
        ];

        let loadedCount = 0;
        const basePath = window.location.pathname.endsWith('/')
            ? window.location.pathname
            : window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);

        for (const name of assetNames) {
            const img = new Image();
            img.onload = () => {
                loadedCount++;
                if (loadedCount >= assetNames.length) {
                    this._imagesLoaded = true;
                }
            };
            img.src = basePath + 'assets/' + name + '.png';
            this._images[name] = img;
        }
    }

    bindProfile(profile) {
        this._profile = profile;
        return this;
    }

    bindItemCatalog(itemCatalog) {
        this._itemCatalog = itemCatalog;
        return this;
    }

    bindLevelStats(stats) {
        this._stats = stats;
        return this;
    }

    bindRules(rules) {
        this._rules = rules;
        return this;
    }

    bindPlayerBodies(bodies, slotColors) {
        this._bodies     = bodies;
        this._slotColors = slotColors;
        return this;
    }

    bindPingSource(source) {
        this._pingSource = source;
        return this;
    }

    init(container) {
        super.init(container);

        this._root = this._createEl('div', {
            position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
            pointerEvents: 'none', fontFamily: 'system-ui, sans-serif', color: '#fff',
            containerType: 'size', overflow: 'hidden'
        });
        container.appendChild(this._root);

        // Native 320x32 authentic Doom status bar canvas
        this._canvas = document.createElement('canvas');
        this._canvas.width  = 320;
        this._canvas.height = 32;
        this._canvas.style.cssText = 'position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); '
            + 'width: min(100%, calc(100vh * (320 / 200))); aspect-ratio: 320 / 32; '
            + 'image-rendering: pixelated; image-rendering: crisp-edges; pointer-events: none; z-index: 10;';
        this._ctx = this._canvas.getContext('2d');
        if (this._ctx) {
            this._ctx.imageSmoothingEnabled = false;
        }
        this._root.appendChild(this._canvas);

        // Top overlays (clean retro translucent containers)
        this._buildTopLeftOverlay();
        this._buildTopCenterEffects();
        this._buildFps();
    }

    _buildTopLeftOverlay() {
        const block = this._createEl('div', {
            position: 'absolute', top: '0.6em', left: '0.8em',
            padding: '0.4em 0.7em', borderRadius: '4px',
            backgroundColor: 'rgba(0, 0, 0, 0.65)', border: '1px solid rgba(255, 204, 0, 0.3)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.5)', zIndex: '5'
        });

        // Single-player / coop stats (secrets / kills)
        const scores = this._createEl('div', {
            display: 'grid', gridTemplateColumns: 'auto auto auto auto', justifyContent: 'start', alignItems: 'center',
            columnGap: '0.4em', rowGap: '0.25em', fontSize: '0.85em', fontWeight: 'bold'
        });
        this._els.scores = scores;

        const secrets = this._buildScoreRow(scores, 'star', '#ffd23d');
        this._els.secretsFound = secrets.found;
        this._els.secretsTotal = secrets.total;

        const kills = this._buildScoreRow(scores, 'skull', '#e05f5f');
        this._els.killsFound = kills.found;
        this._els.killsTotal = kills.total;

        block.appendChild(scores);

        // Deathmatch match clock & frags
        const frags = this._createEl('div', { display: 'none' });
        this._els.frags = frags;
        this._els.matchClock = this._createEl('div', {
            textAlign: 'center', fontSize: '1rem', fontWeight: 'bold', color: '#ffcc00', letterSpacing: '1px'
        });
        frags.appendChild(this._els.matchClock);
        block.appendChild(frags);

        this._root.appendChild(block);
    }

    _buildScoreRow(grid, iconName, color) {
        const icon = this._createEl('div', { width: '1em', height: '1em', color: color, justifySelf: 'center' });
        icon.innerHTML = this._iconSvg(iconName);
        const found = this._createEl('div', { textAlign: 'right', color: '#fff' });
        found.innerText = '0';
        const slash = this._createEl('div', { color: '#888' });
        slash.innerText = '/';
        const total = this._createEl('div', { textAlign: 'left', color: '#aaa' });
        total.innerText = '0';
        grid.appendChild(icon);
        grid.appendChild(found);
        grid.appendChild(slash);
        grid.appendChild(total);
        return { found, total };
    }

    _buildTopCenterEffects() {
        const block = this._createEl('div', {
            position: 'absolute', top: '0.6em', left: '50%', transform: 'translateX(-50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', zIndex: '5'
        });

        this._els.effects = block;
        for (const effectLine of HudGameBar.EFFECT_LINES) {
            const el = this._createEl('div', {
                display: 'none', color: '#ffeb3b', textShadow: '0 0 3px #000, 0 0 6px #000',
                fontSize: '0.85em', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase'
            });
            this._effectEls[effectLine.code] = el;
            block.appendChild(el);
        }
        this._root.appendChild(block);
    }

    _buildFps() {
        const block = this._createEl('div', {
            position: 'absolute', top: '0.6em', right: '0.8em',
            padding: '0.3em 0.6em', borderRadius: '4px',
            backgroundColor: 'rgba(0, 0, 0, 0.65)', border: '1px solid rgba(255, 255, 255, 0.2)',
            zIndex: '5', display: 'none'
        });
        this._els.fpsBlock = block;
        this._els.fpsValue = this._createEl('div', { fontSize: '0.8em', fontWeight: 'bold', color: '#ffcc00' });
        block.appendChild(this._els.fpsValue);
        this._root.appendChild(block);
    }

    setVisible(visible) {
        if (this._root !== null) {
            this._root.style.display = (visible ? 'block' : 'none');
        }
    }

    update() {
        if (!this._user || !this._root || !this._ctx) return;

        const user = this._user;
        this._renderStatusBar(user);
        this._updateEffects(user);
        this._updateScores(user);
        this._updateFps();
    }

    _renderStatusBar(user) {
        const ctx = this._ctx;
        const imgs = this._images;
        if (!imgs.stbar || !imgs.stbar.complete) return;

        // 1. Draw base STBAR background (320x32)
        ctx.drawImage(imgs.stbar, 0, 0);

        const scoresFrags = (this._rules !== null && this._rules.scoresFrags());

        // 2. Active Weapon AMMO (tall red numbers ending at X = 44, Y = 3)
        const weaponCode = user.getActiveWeapon();
        const weapon = this._itemCatalog ? this._itemCatalog.getWeapon(weaponCode) : null;
        const ammoType = weapon ? weapon.getAmmoType() : null;
        if (ammoType !== null) {
            const currentAmmo = user.getAmmo(ammoType);
            this._drawTallRedNumber(ctx, currentAmmo, 44, 3);
        }

        // 3. HEALTH (tall red numbers ending at X = 88, Y = 3, percent at 90, 3)
        const energy = user.getEnergy();
        this._drawTallRedNumber(ctx, Math.ceil(energy), 88, 3);
        if (imgs.sttprcnt && imgs.sttprcnt.complete) {
            ctx.drawImage(imgs.sttprcnt, 90, 3);
        }

        // 4. ARMS or FRAGS (X = 104 to 143)
        if (scoresFrags) {
            // Deathmatch: STBAR already has "FRAGS" header at (104..143).
            // Draw player frags ending at X = 138, Y = 3
            const ownFrags = this._stats ? this._stats.fragScore(user.getPlayerId()) : 0;
            this._drawTallRedNumber(ctx, ownFrags, 138, 3);
        } else {
            // Single-player / Coop: Draw STARMS background & weapon numbers 2..7
            if (imgs.starms && imgs.starms.complete) {
                ctx.drawImage(imgs.starms, 104, 0);
            }
            this._drawArmsWeapons(ctx, user);
        }

        // 5. DOOMGUY FACE (at X = 143, Y = 1, 24x29)
        this._drawDoomguyFace(ctx, user, energy);

        // 6. ARMOR (tall red numbers ending at X = 219, Y = 3, percent at 221, 3)
        const armor = user.getArmor();
        this._drawTallRedNumber(ctx, Math.ceil(armor), 219, 3);
        if (imgs.sttprcnt && imgs.sttprcnt.complete) {
            ctx.drawImage(imgs.sttprcnt, 221, 3);
        }

        // 7. KEYS (X = 239)
        this._drawKeys(ctx, user);

        // 8. AMMO TABLE (Bull, Shel, Rokt, Cell at X = 286 / 312)
        this._drawAmmoTable(ctx, user);
    }

    _drawDoomguyFace(ctx, user, energy) {
        const imgs = this._images;

        // Check damage ouch timer
        if (this._lastEnergy - energy > 15) {
            this._ouchTicks = 18;
        }
        this._lastEnergy = energy;
        if (this._ouchTicks > 0) {
            this._ouchTicks--;
        }

        // Animation direction timer
        this._faceLookTick++;
        if (this._faceLookTick > 80) {
            this._faceLookTick = 0;
            // 70% straight, 15% left, 15% right
            const r = Math.random();
            this._faceLookDir = (r < 0.7) ? 0 : (r < 0.85 ? 1 : 2);
        }

        let faceKey = 'stfst00';
        if (energy <= 0) {
            faceKey = 'stfdead0';
        } else if (user.isEffectVisible && user.isEffectVisible('invulnerability')) {
            faceKey = 'stfgod0';
        } else if (this._ouchTicks > 0 && imgs.stfouch0) {
            faceKey = 'stfouch0';
        } else {
            // Health stages
            if (energy >= 80) {
                faceKey = (this._faceLookDir === 1 ? 'stfst01' : (this._faceLookDir === 2 ? 'stfst02' : 'stfst00'));
            } else if (energy >= 60) {
                faceKey = 'stfst10';
            } else if (energy >= 40) {
                faceKey = 'stfst20';
            } else if (energy >= 20) {
                faceKey = 'stfst30';
            } else {
                faceKey = 'stfst40';
            }
        }

        const faceImg = imgs[faceKey];
        if (faceImg && faceImg.complete) {
            ctx.drawImage(faceImg, 143, 1);
        }
    }

    _drawArmsWeapons(ctx, user) {
        const slots = this._profile ? this._profile.weaponSlots() : null;
        if (!slots) return;
        const slotByWeapon = slots.byWeapon;
        const ownedCodes = new Set(user.getOwnedWeaponCodes());
        const ownedSlots = new Set();
        for (const owned of ownedCodes) {
            const slot = slotByWeapon[owned];
            if (slot !== undefined) ownedSlots.add(slot);
        }

        // Slot positions on starms.png (offset 104, 0)
        // Row 1 (weapons 2, 3, 4): Y = 4. X = 111, 123, 135
        // Row 2 (weapons 5, 6, 7): Y = 13. X = 111, 123, 135
        const pos = {
            2: { x: 111, y: 4 },
            3: { x: 123, y: 4 },
            4: { x: 135, y: 4 },
            5: { x: 111, y: 13 },
            6: { x: 123, y: 13 },
            7: { x: 135, y: 13 }
        };

        for (let s = 2; s <= 7; s++) {
            if (ownedSlots.has(s)) {
                const img = this._images['stysnum' + s];
                if (img && img.complete) {
                    ctx.drawImage(img, pos[s].x, pos[s].y);
                }
            }
        }
    }

    _drawKeys(ctx, user) {
        const imgs = this._images;
        // Blue: Row 1 (Y = 3)
        if (user.hasItem('blueKey')) {
            const img = imgs.stkeys0 || imgs.stkeys3;
            if (img && img.complete) ctx.drawImage(img, 239, 3);
        }
        // Yellow: Row 2 (Y = 13)
        if (user.hasItem('yellowKey')) {
            const img = imgs.stkeys1 || imgs.stkeys4;
            if (img && img.complete) ctx.drawImage(img, 239, 13);
        }
        // Red: Row 3 (Y = 23)
        if (user.hasItem('redKey')) {
            const img = imgs.stkeys2 || imgs.stkeys5;
            if (img && img.complete) ctx.drawImage(img, 239, 23);
        }
    }

    _drawAmmoTable(ctx, user) {
        // Types: bullets, shells, rockets, cells
        const ammoRows = [
            { type: 'bullets', y: 5 },
            { type: 'shells',  y: 11 },
            { type: 'rockets', y: 17 },
            { type: 'cells',   y: 23 }
        ];

        for (const row of ammoRows) {
            const cur = user.getAmmo(row.type);
            const max = user.getAmmoMax(row.type);
            this._drawYellowNumber(ctx, cur, 286, row.y);
            this._drawYellowNumber(ctx, max, 312, row.y);
        }
    }

    _drawTallRedNumber(ctx, value, rightX, y) {
        const str = String(Math.max(0, Math.floor(value)));
        let curX = rightX;
        for (let i = str.length - 1; i >= 0; i--) {
            const ch = str[i];
            const img = this._images['sttnum' + ch];
            const w = (ch === '1' && img && img.width) ? img.width : 14;
            curX -= w;
            if (img && img.complete) {
                ctx.drawImage(img, curX, y);
            }
        }
        return curX;
    }

    _drawYellowNumber(ctx, value, rightX, y) {
        const str = String(Math.max(0, Math.floor(value)));
        let curX = rightX;
        for (let i = str.length - 1; i >= 0; i--) {
            const ch = str[i];
            const img = this._images['stysnum' + ch];
            const w = 4;
            curX -= w;
            if (img && img.complete) {
                ctx.drawImage(img, curX, y);
            }
        }
        return curX;
    }

    _updateEffects(user) {
        const effects = user.getEffects();
        for (const effectLine of HudGameBar.EFFECT_LINES) {
            const el = this._effectEls[effectLine.code];
            if (!el) continue;
            const remainingMs = effects[effectLine.code];
            const active = (effectLine.timed ? (remainingMs !== undefined) : user.hasItem(effectLine.code));
            el.style.display = (active ? 'block' : 'none');
            if (!active) continue;

            if (effectLine.timed) {
                el.innerText = appTranslator.get(effectLine.labelCode) + ' ' + AppMenuDom.formatClock(Math.ceil(remainingMs / 1000), 1);
                el.style.visibility = (user.isEffectVisible(effectLine.code) ? 'visible' : 'hidden');
            } else {
                el.innerText = appTranslator.get(effectLine.labelCode);
            }
        }
    }

    _updateScores(user) {
        const scoresFrags = (this._rules !== null && this._rules.scoresFrags());
        this._els.scores.style.display = (scoresFrags ? 'none' : 'grid');
        this._els.frags.style.display  = (scoresFrags ? 'block' : 'none');

        if (scoresFrags) {
            this._updateMatchClock();
            this._updateFragRows(user.getPlayerId());
            return;
        }

        if (this._stats) {
            this._els.secretsFound.innerText = String(this._stats.getSecretsFound());
            this._els.secretsTotal.innerText = String(this._stats.getSecretsTotal());
            this._els.killsFound.innerText   = String(this._stats.getKillsCount());
            this._els.killsTotal.innerText   = String(this._stats.getKillsTotal());
        }
    }

    _updateMatchClock() {
        if (!this._rules || !this._stats) return;
        const limit   = this._rules.timeLimitMs();
        const matchMs = this._stats.getMatchTimeMs();
        const seconds = (limit !== null ? Math.ceil(Math.max(0, limit - matchMs) / 1000) : Math.floor(matchMs / 1000));
        this._els.matchClock.innerText = 'MATCH: ' + AppMenuDom.formatClock(seconds, 2);
    }

    _updateFragRows(ownId) {
        const ids = [];
        for (const view of (this._bodies ?? [])) {
            const id = view.getPlayerId();
            if (id !== null) ids.push(id);
        }
        ids.sort((a, b) => a - b);
        while (this._fragRows.length < ids.length) {
            this._fragRows.push(this._buildFragRow());
        }
        this._fragRows.forEach((entry, i) => {
            const id = (ids[i] ?? null);
            entry.row.style.display = (id !== null ? 'flex' : 'none');
            if (id !== null) {
                entry.row.style.fontWeight = (id === ownId ? 'bold' : 'normal');
                entry.swatch.style.backgroundColor = (this._slotColors[id - 1] ?? '#888');
                entry.value.innerText = String(this._stats ? this._stats.fragScore(id) : 0);
            }
        });
    }

    _buildFragRow() {
        const row = this._createEl('div', {
            display: 'none', alignItems: 'center', gap: '0.4em', marginTop: '0.2em', fontSize: '0.9em'
        });
        const swatch = this._createEl('div', { width: '0.65em', height: '0.65em', border: '1px solid #fff' });
        const value  = this._createEl('div', { marginLeft: 'auto', minWidth: '2em', textAlign: 'right', color: '#ffcc00' });
        value.innerText = '0';
        row.appendChild(swatch);
        row.appendChild(value);
        this._els.frags.appendChild(row);
        return { row, swatch, value };
    }

    _updateFps() {
        const visible = doomSettings.getDisplayShowFps();
        this._els.fpsBlock.style.display = (visible ? 'block' : 'none');
        if (!visible) return;

        const fps  = this._engine.getFps();
        const ping = (this._pingSource !== null ? this._pingSource() : null);
        this._els.fpsValue.innerText = (ping !== null
            ? appTranslator.get('hud.fpsPing', { value: fps, ping: Math.round(ping) })
            : appTranslator.get('hud.fps', { value: fps }));
    }

    _iconSvg(name) {
        return '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor" aria-hidden="true">'
            + HudGameBar.ICONS[name] + '</svg>';
    }

    _createEl(tag, style) {
        const el = document.createElement(tag);
        Object.assign(el.style, style);
        return el;
    }
}

HudGameBar.EFFECT_LINES = [
    { code: 'invulnerability', labelCode: 'effect.invulnerability', timed: true },
    { code: 'radiation',       labelCode: 'effect.radiationSuit',   timed: true },
    { code: 'light',           labelCode: 'effect.light',           timed: true },
    { code: 'invisibility',    labelCode: 'effect.invisibility',    timed: true },
    { code: 'berserk',         labelCode: 'effect.berserk',         timed: false }
];

HudGameBar.ICONS = {
    star:  '<path d="M12 2 L14.9 8.6 L22 9.3 L16.6 14 L18.2 21 L12 17.3 L5.8 21 L7.4 14 L2 9.3 L9.1 8.6 Z"/>',
    skull: '<path fill-rule="evenodd" d="M12 2 C6.8 2 3.2 5.6 3.2 10.3 C3.2 13.2 4.6 15.4 6.8 16.6 V20.2'
          + ' C6.8 21.2 7.6 22 8.6 22 H15.4 C16.4 22 17.2 21.2 17.2 20.2 V16.6 C19.4 15.4 20.8 13.2 20.8 10.3'
          + ' C20.8 5.6 17.2 2 12 2 Z M8.6 9.2 A2.2 2.2 0 1 0 8.6 13.6 A2.2 2.2 0 1 0 8.6 9.2 Z'
          + ' M15.4 9.2 A2.2 2.2 0 1 0 15.4 13.6 A2.2 2.2 0 1 0 15.4 9.2 Z M12 14.2 L10.6 17 H13.4 Z"/>'
};