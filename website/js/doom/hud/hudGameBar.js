/**
 * Authentic Classic DOOM Status Bar (STBAR) HUD.
 * Renders the original 1993 id Software 320x32 metallic status bar:
 *   - AMMO: Tall red numbers (STTNUM*)
 *   - HEALTH: Tall red numbers + percent (STTPRMNT)
 *   - ARMS: Authentic STARMS panel with yellow weapon slots (STYSNUM*) in coop/singleplayer
 *   - FRAGS: Tall red frags counter in Deathmatch mode directly inside status bar
 *   - DOOMGUY FACE: Animated center face (STFST*, damage stages, god mode, ouch, dead)
 *   - ARMOR: Tall red numbers + percent
 *   - KEYS: Authentic keycards / skulls (STKEYS*)
 *   - AMMO TABLE: Bull, Shel, Rokt, Cell with current/max in yellow numbers
 *
 * Full-width solid metallic status bar pinned to the bottom (16% screen height).
 * No floating bars/boxes in the top-left for 100% authentic classic Doom visual experience.
 */
class HudGameBar extends AbstractHud {
    constructor(engine) {
        super(engine);
        this._profile      = null;
        this._itemCatalog  = null;
        this._stats        = null;
        this._rules        = null;
        this._bodies       = null;
        this._slotColors   = [];
        this._pingSource   = null;
        this._root         = null;
        this._canvas       = null;
        this._ctx          = null;
        this._images       = {};
        this._imagesLoaded = false;
        this._els          = {};
        this._effectEls    = {};

        // Animation state for Doomguy face
        this._faceLookTick = 0;
        this._faceLookDir  = 0; // 0 = straight, 1 = right, 2 = left
        this._lastEnergy   = 100;
        this._ouchTicks    = 0;

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
        const total = assetNames.length;

        // Base URL fallback if embedded base64 is somehow absent
        let basePath = './assets/';
        try {
            if (typeof window !== 'undefined' && window.location) {
                const u = new URL(window.location.href);
                let p = u.pathname;
                if (!p.endsWith('/')) {
                    const lastSlash = p.lastIndexOf('/');
                    const lastSeg = p.substring(lastSlash + 1);
                    p = lastSeg.includes('.') ? p.substring(0, lastSlash + 1) : (p + '/');
                }
                basePath = u.origin + p + 'assets/';
            }
        } catch (_) {}

        for (const name of assetNames) {
            const img = new Image();
            img.onload = () => {
                loadedCount++;
                if (loadedCount >= total) {
                    this._imagesLoaded = true;
                }
            };
            img.onerror = () => {
                // Ignore error safely: safeDraw checks naturalWidth > 0
            };

            // Use embedded Base64 Data URI if available (100% synchronous & instant)
            if (typeof DOOM_STBAR_ASSETS !== 'undefined' && DOOM_STBAR_ASSETS[name]) {
                img.src = DOOM_STBAR_ASSETS[name];
            } else {
                img.src = basePath + name + '.png';
            }
            this._images[name] = img;
        }
    }

    _safeDraw(ctx, img, dx, dy, dw, dh) {
        if (!img || !img.complete || !img.naturalWidth) return false;
        try {
            if (dw !== undefined && dh !== undefined) {
                ctx.drawImage(img, dx, dy, dw, dh);
            } else {
                ctx.drawImage(img, dx, dy);
            }
            return true;
        } catch (_) {
            return false;
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
            overflow: 'hidden'
        });
        container.appendChild(this._root);

        // Native 320x32 authentic Doom status bar canvas at bottom (16% of screen height)
        this._canvas = document.createElement('canvas');
        this._canvas.width  = 320;
        this._canvas.height = 32;
        this._canvas.style.cssText = 'position: absolute; bottom: 0; left: 0; width: 100%; height: 16%; '
            + 'image-rendering: pixelated; image-rendering: crisp-edges; pointer-events: none; z-index: 10; display: block; background: #000;';
        this._ctx = this._canvas.getContext('2d');
        if (this._ctx) {
            this._ctx.imageSmoothingEnabled = false;
        }
        this._root.appendChild(this._canvas);

        // Top center power-up effects overlay
        this._buildTopCenterEffects();
        // Top right FPS/ping readout (toggleable in settings)
        this._buildFps();
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

        try {
            const user = this._user;
            this._renderStatusBar(user);
            this._updateEffects(user);
            this._updateFps();
        } catch (err) {
            console.error('Error in HudGameBar.update:', err);
        }
    }

    _renderStatusBar(user) {
        const ctx = this._ctx;
        const imgs = this._images;

        // 1. Draw base STBAR background (320x32)
        if (!this._safeDraw(ctx, imgs.stbar, 0, 0, 320, 32)) {
            // Metallic DOOM-grey fallback
            ctx.fillStyle = '#222222';
            ctx.fillRect(0, 0, 320, 32);
            ctx.fillStyle = '#3a3a3a';
            ctx.fillRect(0, 0, 320, 2);
            ctx.fillStyle = '#111111';
            ctx.fillRect(0, 30, 320, 2);
        }

        const scoresFrags = Boolean(this._rules && typeof this._rules.scoresFrags === 'function' && this._rules.scoresFrags());

        // 2. Active Weapon AMMO (tall red numbers ending at X = 44, Y = 3)
        const weaponCode = (typeof user.getActiveWeapon === 'function') ? user.getActiveWeapon() : null;
        const weapon = (this._itemCatalog && weaponCode) ? this._itemCatalog.getWeapon(weaponCode) : null;
        const ammoType = weapon ? weapon.getAmmoType() : null;
        if (ammoType !== null) {
            const currentAmmo = (typeof user.getAmmo === 'function') ? user.getAmmo(ammoType) : 0;
            this._drawTallRedNumber(ctx, currentAmmo, 44, 3);
        }

        // 3. HEALTH (tall red numbers ending at X = 88, Y = 3, percent at 90, 3)
        const energy = (typeof user.getEnergy === 'function') ? user.getEnergy() : 100;
        this._drawTallRedNumber(ctx, Math.ceil(energy), 88, 3);
        this._safeDraw(ctx, imgs.sttprcnt, 90, 3);

        // 4. ARMS or FRAGS (X = 104 to 143)
        if (scoresFrags) {
            // Deathmatch: STBAR has "FRAGS" header at (104..143).
            // Draw player frags ending at X = 138, Y = 3
            const ownFrags = (this._stats && typeof this._stats.fragScore === 'function' && typeof user.getPlayerId === 'function')
                ? this._stats.fragScore(user.getPlayerId()) : 0;
            this._drawTallRedNumber(ctx, ownFrags, 138, 3);
        } else {
            // Single-player / Coop: Draw STARMS background & weapon numbers 2..7
            this._safeDraw(ctx, imgs.starms, 104, 0);
            this._drawArmsWeapons(ctx, user);
        }

        // 5. DOOMGUY FACE (at X = 143, Y = 1, 24x29)
        this._drawDoomguyFace(ctx, user, energy);

        // 6. ARMOR (tall red numbers ending at X = 219, Y = 3, percent at 221, 3)
        const armor = (typeof user.getArmor === 'function') ? user.getArmor() : 0;
        this._drawTallRedNumber(ctx, Math.ceil(armor), 219, 3);
        this._safeDraw(ctx, imgs.sttprcnt, 221, 3);

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
            const r = Math.random();
            this._faceLookDir = (r < 0.7) ? 0 : (r < 0.85 ? 1 : 2);
        }

        let faceKey = 'stfst00';
        if (energy <= 0) {
            faceKey = 'stfdead0';
        } else if (typeof user.isEffectVisible === 'function' && user.isEffectVisible('invulnerability')) {
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

        this._safeDraw(ctx, imgs[faceKey], 143, 1);
    }

    _drawArmsWeapons(ctx, user) {
        const slots = (this._profile && typeof this._profile.weaponSlots === 'function')
            ? this._profile.weaponSlots() : null;
        if (!slots) return;
        const slotByWeapon = slots.byWeapon || {};
        const ownedCodes = (typeof user.getOwnedWeaponCodes === 'function') ? user.getOwnedWeaponCodes() : [];
        const ownedSlots = new Set();
        for (const owned of ownedCodes) {
            const slot = slotByWeapon[owned];
            if (slot !== undefined) ownedSlots.add(slot);
        }

        // Slot positions on starms.png (offset 104, 0)
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
                this._safeDraw(ctx, this._images['stysnum' + s], pos[s].x, pos[s].y);
            }
        }
    }

    _drawKeys(ctx, user) {
        const imgs = this._images;
        const has = (code) => (typeof user.hasItem === 'function' && user.hasItem(code));

        // Blue: Row 1 (Y = 3)
        if (has('blueKey') || has('blueCard') || has('blueSkull')) {
            const img = imgs.stkeys0 || imgs.stkeys3;
            this._safeDraw(ctx, img, 239, 3);
        }
        // Yellow: Row 2 (Y = 13)
        if (has('yellowKey') || has('yellowCard') || has('yellowSkull')) {
            const img = imgs.stkeys1 || imgs.stkeys4;
            this._safeDraw(ctx, img, 239, 13);
        }
        // Red: Row 3 (Y = 23)
        if (has('redKey') || has('redCard') || has('redSkull')) {
            const img = imgs.stkeys2 || imgs.stkeys5;
            this._safeDraw(ctx, img, 239, 23);
        }
    }

    _drawAmmoTable(ctx, user) {
        const ammoRows = [
            { type: 'bullets', y: 5 },
            { type: 'shells',  y: 11 },
            { type: 'rockets', y: 17 },
            { type: 'cells',   y: 23 }
        ];

        for (const row of ammoRows) {
            const cur = (typeof user.getAmmo === 'function') ? user.getAmmo(row.type) : 0;
            const max = (typeof user.getAmmoMax === 'function') ? user.getAmmoMax(row.type) : 0;
            this._drawYellowNumber(ctx, cur, 286, row.y);
            this._drawYellowNumber(ctx, max, 312, row.y);
        }
    }

    _drawTallRedNumber(ctx, value, rightX, y) {
        const num = Math.max(0, Math.floor(Number(value) || 0));
        const str = String(num);
        let curX = rightX;
        for (let i = str.length - 1; i >= 0; i--) {
            const ch = str[i];
            const img = this._images['sttnum' + ch];
            const w = (ch === '1' && img && img.naturalWidth) ? img.naturalWidth : 14;
            curX -= w;
            this._safeDraw(ctx, img, curX, y);
        }
        return curX;
    }

    _drawYellowNumber(ctx, value, rightX, y) {
        const num = Math.max(0, Math.floor(Number(value) || 0));
        const str = String(num);
        let curX = rightX;
        for (let i = str.length - 1; i >= 0; i--) {
            const ch = str[i];
            const img = this._images['stysnum' + ch];
            const w = 4;
            curX -= w;
            this._safeDraw(ctx, img, curX, y);
        }
        return curX;
    }

    _updateEffects(user) {
        const effects = (typeof user.getEffects === 'function') ? user.getEffects() : {};
        for (const effectLine of HudGameBar.EFFECT_LINES) {
            const el = this._effectEls[effectLine.code];
            if (!el) continue;
            const remainingMs = effects[effectLine.code];
            const active = (effectLine.timed ? (remainingMs !== undefined) : (typeof user.hasItem === 'function' && user.hasItem(effectLine.code)));
            el.style.display = (active ? 'block' : 'none');
            if (!active) continue;

            if (effectLine.timed) {
                el.innerText = appTranslator.get(effectLine.labelCode) + ' ' + AppMenuDom.formatClock(Math.ceil(remainingMs / 1000), 1);
                el.style.visibility = ((typeof user.isEffectVisible === 'function' && user.isEffectVisible(effectLine.code)) ? 'visible' : 'hidden');
            } else {
                el.innerText = appTranslator.get(effectLine.labelCode);
            }
        }
    }

    _updateFps() {
        const visible = (typeof doomSettings !== 'undefined' && typeof doomSettings.getDisplayShowFps === 'function' && doomSettings.getDisplayShowFps());
        this._els.fpsBlock.style.display = (visible ? 'block' : 'none');
        if (!visible) return;

        const fps  = (this._engine && typeof this._engine.getFps === 'function') ? this._engine.getFps() : 60;
        const ping = (this._pingSource !== null ? this._pingSource() : null);
        this._els.fpsValue.innerText = (ping !== null
            ? appTranslator.get('hud.fpsPing', { value: fps, ping: Math.round(ping) })
            : appTranslator.get('hud.fps', { value: fps }));
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
