/**
 * The payload of the main's invite code: the WAD identity, the mode, the
 * WAD's label and edition title. A sub refuses an invite before any answer
 * exists; its answer carries its nickname (NetGameAnswer).
 */
class DoomNetInvite {
    /**
     * @param {string} wadSha256 - hexadecimal SHA-256 of the WAD
     * @param {int}    mode      - DoomNetProtocol.MODE_*
     * @param {string} wadLabel  - title and version of the WAD, for the sub's refusal message
     * @param {string} wadTitle  - game and edition of a known WAD (DoomWadEditions), '' for an unknown one
     * @returns {Uint8Array}
     */
    static encodeInvite(wadSha256, mode, wadLabel, wadTitle) {
        return new NetByteWriter().bytes(NetHex.toBytes(wadSha256)).u8(mode)
            .ascii(DoomNetInvite.asciiLabel(wadLabel)).ascii(DoomNetInvite.asciiLabel(wadTitle)).toBytes();
    }

    // The label of an unknown WAD is its file name: any language, any length.
    static asciiLabel(label) {
        return label.normalize('NFD')
            .replace(DoomNetInvite.DIACRITICS, '')
            .replace(DoomNetInvite.NON_ASCII, DoomNetInvite.NON_ASCII_SUBSTITUTE)
            .substring(0, DoomNetInvite.MAX_LABEL_LENGTH);
    }

    /**
     * @returns {{wadSha256: string, mode: int, wadLabel: string, wadTitle: string}}
     */
    static decodeInvite(bytes) {
        const reader = new NetByteReader(bytes);
        const invite = {wadSha256: NetHex.fromBytes(reader.bytes(DoomNetInvite.SHA256_BYTES)), mode: reader.u8(), wadLabel: reader.ascii(), wadTitle: reader.ascii()};
        DoomNetInvite._checkEnd(reader);

        return invite;
    }

    static _checkEnd(reader) {
        if (!reader.isAtEnd()) {
            throw new NetError(NetError.INVALID_CODE, 'Unexpected bytes after the pairing payload');
        }
    }
}

DoomNetInvite.SHA256_BYTES         = 32;
DoomNetInvite.MAX_LABEL_LENGTH     = 64;
DoomNetInvite.DIACRITICS           = /[\u0300-\u036f]/g;
DoomNetInvite.NON_ASCII            = /[^\x20-\x7e]/g;
DoomNetInvite.NON_ASCII_SUBSTITUTE = '?';
