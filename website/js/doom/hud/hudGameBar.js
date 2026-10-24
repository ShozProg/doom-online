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
        let basePath = './assets/';
        try {
            basePath = new URL('assets/', window.location.href).href;
        } catch (_) {}

        for (const name of assetNames) {
            const img = new Image();
            img.onload = () => {
                loadedCount++;
                if (loadedCount >= assetNames.length) {
                    this._imagesLoaded = true;
                }
            };
            img.src = basePath + name + '.png';
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

        const user = this._user;
        this._renderStatusBar(user);
        this._updateEffects(user);
        this._updateFps();
    }

    _renderStatusBar(user) {
        const ctx = this._ctx;
        const imgs = this._images;

        // 1. Draw base STBAR background (320x32)
        if (imgs.stbar && imgs.stbar.complete) {
            ctx.drawImage(imgs.stbar, 0, 0, 320, 32);
        } else {
            ctx.fillStyle = '#222222';
            ctx.fillRect(0, 0, 320, 32);
            ctx.fillStyle = '#3a3a3a';
            ctx.fillRect(0, 0, 320, 2);
        }

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