/**
 * Doom picture decoding (transposition of patch_to_rgba / flat_to_image of
 * convert_wad.py), producing ImageData usable directly by the engine textures.
 */
class WadPicture {
    /**
     * Decode a Doom picture (patch) into a transparent RGBA ImageData.
     * Column format: top_delta, count, unused pad, pixels…, unused pad.
     * top_delta == PATCH_END_COLUMN marks the end of the column.
     *
     * @param {DataView}   dv
     * @param {WadPalette} palette
     * @returns {ImageData}
     */
    static patchToImageData(dv, palette) {
        const w = dv.getUint16(0, true);
        const h = dv.getUint16(2, true);
        const image = new ImageData(w, h);
        const pixels = image.data;

        for (let x = 0; x < w; x++) {
            let off = dv.getUint32(8 + x * 4, true);
            while (true) {
                const topDelta = dv.getUint8(off);
                off += 1;
                if (topDelta === WadConstants.PATCH_END_COLUMN) {
                    break;
                }
                const count = dv.getUint8(off);
                off += 2;
                for (let j = 0; j < count; j++) {
                    const y = topDelta + j;
                    if ((y >= 0) && (y < h)) {
                        const color = palette.getColor(dv.getUint8(off));
                        const p = (y * w + x) * 4;
                        pixels[p]     = color[0];
                        pixels[p + 1] = color[1];
                        pixels[p + 2] = color[2];
                        pixels[p + 3] = 255;
                    }
                    off += 1;
                }
                off += 1;
            }
        }

        return image;
    }

    /**
     * Decode a Doom flat (64x64 raw palette indices) into an opaque ImageData.
     *
     * @param {DataView}   dv
     * @param {WadPalette} palette
     * @returns {ImageData}
     */
    static flatToImageData(dv, palette) {
        const image = new ImageData(64, 64);
        const pixels = image.data;

        for (let y = 0; y < 64; y++) {
            for (let x = 0; x < 64; x++) {
                const color = palette.getColor(dv.getUint8(y * 64 + x));
                const p = (y * 64 + x) * 4;
                pixels[p]     = color[0];
                pixels[p + 1] = color[1];
                pixels[p + 2] = color[2];
                pixels[p + 3] = 255;
            }
        }

        return image;
    }

    /**
     * The title screen of a WAD: TITLEPIC, a picture (Doom) or a PNG (a
     * modern PWAD), or TITLE, a raw 320x200 screen of palette indices
     * (Heretic).
     *
     * @param {WadFile} wadFile
     * @returns {ImageData|Blob|null} null when the WAD has none or its picture does not hold together
     */
    static titleImage(wadFile) {
        const palette = new WadPalette(wadFile);
        const picture = wadFile.getLump('TITLEPIC');
        if (picture !== null) {
            if (WadPicture.isPng(picture)) {
                return new Blob([new Uint8Array(picture.buffer, picture.byteOffset, picture.byteLength)], {type: 'image/png'});
            }

            return ((WadPicture.isPatch(picture)) ? WadPicture.patchToImageData(picture, palette) : null);
        }
        const raw = wadFile.getLump('TITLE');
        if ((raw === null) || (raw.byteLength !== WadPicture.SCREEN_WIDTH * WadPicture.SCREEN_HEIGHT)) {
            return null;
        }
        const image = new ImageData(WadPicture.SCREEN_WIDTH, WadPicture.SCREEN_HEIGHT);
        for (let i = 0; i < raw.byteLength; i++) {
            const color = palette.getColor(raw.getUint8(i));
            image.data[i * 4]     = color[0];
            image.data[i * 4 + 1] = color[1];
            image.data[i * 4 + 2] = color[2];
            image.data[i * 4 + 3] = 255;
        }

        return image;
    }

    static isPng(dv) {
        return ((dv.byteLength >= WadPicture.PNG_SIGNATURE_BYTES) && (dv.getUint32(0) === WadPicture.PNG_SIGNATURE));
    }

    // A header that holds together before anything is allocated: a lump of another format read as a patch would
    // ask for a picture of gigabytes.
    static isPatch(dv) {
        if (dv.byteLength < WadPicture.PATCH_HEADER_BYTES) {
            return false;
        }
        const width  = dv.getUint16(0, true);
        const height = dv.getUint16(2, true);
        if ((width === 0) || (height === 0) || (width > WadPicture.PATCH_MAX_SIDE) || (height > WadPicture.PATCH_MAX_SIDE)
            || (dv.byteLength < WadPicture.PATCH_HEADER_BYTES + width * 4)) {
            return false;
        }
        for (let x = 0; x < width; x++) {
            if (dv.getUint32(WadPicture.PATCH_HEADER_BYTES + x * 4, true) >= dv.byteLength) {
                return false;
            }
        }

        return true;
    }

    /**
     * Paste a patch into a destination ImageData (equivalent of PIL paste with
     * alpha mask): only the opaque pixels of the patch are copied, with clipping.
     *
     * @param {ImageData} dest
     * @param {ImageData} src
     * @param {int}       ox
     * @param {int}       oy
     */
    static pastePatch(dest, src, ox, oy) {
        for (let y = 0; y < src.height; y++) {
            const dy = oy + y;
            if ((dy < 0) || (dy >= dest.height)) {
                continue;
            }
            for (let x = 0; x < src.width; x++) {
                const dx = ox + x;
                if ((dx < 0) || (dx >= dest.width)) {
                    continue;
                }
                const s = (y * src.width + x) * 4;
                if (src.data[s + 3] === 0) {
                    continue;
                }
                const d = (dy * dest.width + dx) * 4;
                dest.data[d]     = src.data[s];
                dest.data[d + 1] = src.data[s + 1];
                dest.data[d + 2] = src.data[s + 2];
                dest.data[d + 3] = src.data[s + 3];
            }
        }
    }
}

WadPicture.SCREEN_WIDTH        = 320;
WadPicture.SCREEN_HEIGHT       = 200;
WadPicture.PATCH_HEADER_BYTES  = 8;
WadPicture.PATCH_MAX_SIDE      = 2048;
// "\x89PNG", the first four of the eight bytes of a PNG signature.
WadPicture.PNG_SIGNATURE       = 0x89504E47;
WadPicture.PNG_SIGNATURE_BYTES = 8;
