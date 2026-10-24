/**
 * Lightweight, zero-dependency MQTT 3.1.1 WebSocket client and signaling channel
 * for WebRTC peer-to-peer matchmaking.
 * Connects directly through public WebSocket MQTT brokers (HiveMQ, EMQX)
 * without needing any custom backend server.
 */
class NetOnlineSignalingChannel {
    constructor() {
        this._ws = null;
        this._roomId = null;
        this._clientId = null;
        this._isHost = false;
        this._connected = false;
        this._listeners = new Map();
        this._packetId = 1;
        this._brokerUrls = [
            'wss://broker.hivemq.com:8884/mqtt',
            'wss://broker.emqx.io:8084/mqtt'
        ];
        this._currentBrokerIndex = 0;
        this._pingInterval = null;
    }

    /**
     * @param {string} roomId
     * @param {string} clientId
     * @param {boolean} isHost
     * @returns {Promise<NetOnlineSignalingChannel>}
     */
    async connect(roomId, clientId, isHost = false) {
        this._roomId = roomId;
        this._clientId = clientId || ('p-' + Math.random().toString(36).substring(2, 9));
        this._isHost = isHost;

        let lastError = null;
        for (let i = 0; i < this._brokerUrls.length; i++) {
            const url = this._brokerUrls[i];
            try {
                await this._connectToUrl(url);
                this._currentBrokerIndex = i;
                break;
            } catch (err) {
                console.warn('Signaling broker connection failed (' + url + '):', err);
                lastError = err;
            }
        }

        if (!this._connected) {
            throw new Error('Could not connect to any signaling server: ' + (lastError?.message || 'timeout'));
        }

        // Setup ping interval to keep connection alive
        this._pingInterval = setInterval(() => {
            if (this._ws && this._ws.readyState === WebSocket.OPEN) {
                this._ws.send(new Uint8Array([0xc0, 0x00])); // PINGREQ
            }
        }, 15000);

        return this;
    }

    _connectToUrl(brokerUrl) {
        return new Promise((resolve, reject) => {
            let resolved = false;
            const ws = new WebSocket(brokerUrl, ['mqtt']);
            ws.binaryType = 'arraybuffer';

            const timer = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    try { ws.close(); } catch (_) {}
                    reject(new Error('Connection timeout to ' + brokerUrl));
                }
            }, 6000);

            ws.onopen = () => {
                this._sendConnect(ws, this._clientId);
            };

            ws.onerror = (err) => {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timer);
                    reject(err);
                }
            };

            ws.onclose = () => {
                this._connected = false;
                this._emit('close');
            };

            ws.onmessage = (event) => {
                const buf = new Uint8Array(event.data);
                const packetType = (buf[0] >> 4) & 0x0f;

                if (packetType === 2) { // CONNACK
                    if (!resolved) {
                        resolved = true;
                        clearTimeout(timer);
                        this._ws = ws;
                        this._connected = true;
                        resolve();
                    }
                } else if (packetType === 3) { // PUBLISH
                    this._handlePublish(buf);
                }
            };
        });
    }

    _sendConnect(ws, clientId) {
        const enc = new TextEncoder();
        const cidBytes = enc.encode(clientId);
        const vhdr = new Uint8Array([0x00, 0x04, 0x4d, 0x51, 0x54, 0x54, 0x04, 0x02, 0x00, 0x3c]);
        const payload = new Uint8Array(2 + cidBytes.length);
        payload[0] = (cidBytes.length >> 8) & 0xff;
        payload[1] = cidBytes.length & 0xff;
        payload.set(cidBytes, 2);

        const len = vhdr.length + payload.length;
        const packet = new Uint8Array(2 + len);
        packet[0] = 0x10; // CONNECT
        packet[1] = len;
        packet.set(vhdr, 2);
        packet.set(payload, 2 + vhdr.length);

        ws.send(packet);
    }

    subscribe(topic) {
        if (!this._ws || this._ws.readyState !== WebSocket.OPEN) return;
        const enc = new TextEncoder();
        const topicBytes = enc.encode(topic);
        const pId = this._packetId++;
        const vhdr = new Uint8Array([(pId >> 8) & 0xff, pId & 0xff]);
        const payload = new Uint8Array(2 + topicBytes.length + 1);
        payload[0] = (topicBytes.length >> 8) & 0xff;
        payload[1] = topicBytes.length & 0xff;
        payload.set(topicBytes, 2);
        payload[payload.length - 1] = 0x00; // QoS 0

        const len = vhdr.length + payload.length;
        const packet = new Uint8Array(2 + len);
        packet[0] = 0x82; // SUBSCRIBE
        packet[1] = len;
        packet.set(vhdr, 2);
        packet.set(payload, 2 + vhdr.length);

        this._ws.send(packet);
    }

    publish(topic, messageObj) {
        if (!this._ws || this._ws.readyState !== WebSocket.OPEN) return;
        const enc = new TextEncoder();
        const topicBytes = enc.encode(topic);
        const jsonStr = (typeof messageObj === 'string') ? messageObj : JSON.stringify(messageObj);
        const msgBytes = enc.encode(jsonStr);

        const vhdr = new Uint8Array(2 + topicBytes.length);
        vhdr[0] = (topicBytes.length >> 8) & 0xff;
        vhdr[1] = topicBytes.length & 0xff;
        vhdr.set(topicBytes, 2);

        const len = vhdr.length + msgBytes.length;
        // Remaining length variable encoding
        const remLen = [];
        let l = len;
        do {
            let b = l % 128;
            l = Math.floor(l / 128);
            if (l > 0) b = b | 0x80;
            remLen.push(b);
        } while (l > 0);

        const packet = new Uint8Array(1 + remLen.length + len);
        packet[0] = 0x30; // PUBLISH QoS 0
        packet.set(remLen, 1);
        packet.set(vhdr, 1 + remLen.length);
        packet.set(msgBytes, 1 + remLen.length + vhdr.length);

        this._ws.send(packet);
    }

    _handlePublish(buf) {
        let offset = 1;
        let mult = 1;
        let remLen = 0;
        let b;
        do {
            b = buf[offset++];
            remLen += (b & 0x7f) * mult;
            mult *= 128;
        } while ((b & 0x80) !== 0);

        const topicLen = (buf[offset] << 8) | buf[offset + 1];
        offset += 2;
        const dec = new TextDecoder();
        const topic = dec.decode(buf.subarray(offset, offset + topicLen));
        offset += topicLen;
        const payloadStr = dec.decode(buf.subarray(offset));

        try {
            const data = JSON.parse(payloadStr);
            this._emit('message', { topic, data });
        } catch (_) {
            this._emit('message', { topic, data: payloadStr });
        }
    }

    on(event, handler) {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, []);
        }
        this._listeners.get(event).push(handler);
        return this;
    }

    _emit(event, payload) {
        const handlers = this._listeners.get(event) || [];
        for (const handler of handlers) {
            try {
                handler(payload);
            } catch (e) {
                console.error('Error in signaling handler:', e);
            }
        }
    }

    close() {
        if (this._pingInterval) {
            clearInterval(this._pingInterval);
            this._pingInterval = null;
        }
        if (this._ws) {
            try { this._ws.close(); } catch (_) {}
            this._ws = null;
        }
        this._connected = false;
        this._listeners.clear();
    }

    getRoomId() {
        return this._roomId;
    }

    getClientId() {
        return this._clientId;
    }

    getHostTopic() {
        return 'doom/v1/' + this._roomId + '/host';
    }

    getGuestTopic(guestId) {
        return 'doom/v1/' + this._roomId + '/guest/' + (guestId || this._clientId);
    }

    /**
     * Creates a CodeChannel adapter for host pairing with a specific guest.
     */
    createHostCodeChannel(targetGuestId) {
        return new NetOnlineCodeChannelAdapter(this, this.getGuestTopic(targetGuestId), this.getHostTopic(), targetGuestId);
    }

    /**
     * Creates a CodeChannel adapter for guest pairing with host.
     */
    createGuestCodeChannel() {
        return new NetOnlineCodeChannelAdapter(this, this.getHostTopic(), this.getGuestTopic(this._clientId), 'host');
    }
}

/**
 * Adapter implementing the CodeChannel interface expected by QrPairingView
 * and NetPairing: publish(bytes), read(accept), cancelRead(), close().
 */
class NetOnlineCodeChannelAdapter {
    constructor(signaling, sendTopic, listenTopic, remoteId) {
        this._signaling = signaling;
        this._sendTopic = sendTopic;
        this._listenTopic = listenTopic;
        this._remoteId = remoteId;
        this._endRead = null;

        this._onMessage = (event) => {
            if (event.topic === this._listenTopic) {
                const data = event.data;
                if (data && data.code) {
                    const bytes = NetHex.toBytes(data.code);
                    if (this._acceptCallback && this._acceptCallback(bytes)) {
                        this._resolveRead(bytes);
                    }
                }
            }
        };

        this._signaling.on('message', this._onMessage);
    }

    publish(codeBytes) {
        const hex = NetHex.fromBytes(codeBytes);
        this._signaling.publish(this._sendTopic, {
            type: 'pairing_code',
            sender: this._signaling.getClientId(),
            target: this._remoteId,
            code: hex
        });
    }

    read(accept) {
        this.cancelRead();
        this._acceptCallback = accept;
        return new Promise((resolve, reject) => {
            this._endRead = (code, error) => {
                this._acceptCallback = null;
                this._endRead = null;
                if (error !== null) {
                    reject(error);
                } else {
                    resolve(code);
                }
            };
        });
    }

    _resolveRead(code) {
        if (this._endRead) {
            this._endRead(code, null);
        }
    }

    cancelRead() {
        if (this._endRead) {
            this._endRead(null, null);
        }
    }

    close() {
        this.cancelRead();
    }
}
