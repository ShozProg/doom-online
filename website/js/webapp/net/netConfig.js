/**
 * Constants of the network layer.
 */
class NetConfig {
}

// Global public STUN servers for robust NAT traversal across different networks
NetConfig.STUN_SERVERS              = [
    'stun:stun.l.google.com:19302',
    'stun:stun1.l.google.com:19302',
    'stun:stun2.l.google.com:19302',
    'stun:stun3.l.google.com:19302',
    'stun:stun4.l.google.com:19302',
    'stun:stun.cloudflare.com:3478'
];
NetConfig.GATHER_TIMEOUT_MS         = 2000;
NetConfig.CONNECT_TIMEOUT_MS        = 15000;
NetConfig.ANSWER_CONNECT_TIMEOUT_MS = 35000;
NetConfig.CHANNEL_NAME              = 'net';
NetConfig.LOOPBACK_PREFIX           = 'spipu-net-';
NetConfig.PING_PERIOD_MS            = 1000;
NetConfig.PING_AVERAGE_COUNT        = 10;
NetConfig.LIVENESS_TIMEOUT_MS       = 15000;
// Well under the 64 KiB message size every browser accepts when none is negotiated (RFC 8841).
NetConfig.CHUNK_SIZE                = 16384;
