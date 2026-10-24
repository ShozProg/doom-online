/**
 * Pairing view for seamless online P2P matchmaking over NetOnlineSignalingChannel.
 * Implements the view contract of NetPairing (NetHostPairing & NetGuestPairing)
 * without requiring camera or QR scanner.
 */
class OnlinePairingView {
    /**
     * @param {NetOnlineCodeChannelAdapter} codeChannel
     */
    constructor(codeChannel) {
        this._codeChannel = codeChannel;
    }

    async prepare() {
        // No camera or hardware initialization needed
    }

    /**
     * @param {Uint8Array} bytes
     * @param {NetLink} link
     */
    async showCode(bytes, link) {
        this._codeChannel.publish(bytes);
        if (link && typeof this._codeChannel.bindLink === 'function') {
            this._codeChannel.bindLink(link);
        }
    }

    /**
     * @param {function(Uint8Array): boolean} accept
     * @returns {Promise<Uint8Array>}
     */
    async readCode(accept) {
        return await this._codeChannel.read(accept);
    }

    cancelRead() {
        this._codeChannel.cancelRead();
    }

    hideCode() {
    }

    connecting(payload) {
    }

    finish() {
        this._codeChannel.close();
    }
}