/**
 * Arch3r NVR - Macrovideo V380 Camera Native Driver
 * Version: 9.9.3
 * 
 * Hardware Abstraction Driver untuk mengontrol motor PTZ kamera V380 / V380 Pro
 * secara langsung melalui TCP Socket biner (Port 8800) tanpa ketergantungan pada protokol ONVIF XML.
 * Dilengkapi dengan multi-packet header variant (Standard Macrovideo V380 0x284A & V380 Pro 0x2710)
 * Kompatibel dengan firmware Macrovideo dan Armbian Linux STB.
 */

import net from 'net';

/**
 * Membuat paket biner PTZ Macrovideo V380 standar (Format 1: 0x284a)
 * @param {string} direction - 'up' | 'down' | 'left' | 'right' | 'stop' | 'zoom_in' | 'zoom_out'
 * @param {number} speed - 1 s/d 10 (kecepatan gerak)
 * @returns {Buffer} Payload biner 32 bytes untuk socket port 8800
 */
export function buildV380PtzPacket(direction, speed = 5) {
    let cmdCode = 0x00; // Stop / No-op

    switch (direction) {
        case 'up':
            cmdCode = 0x01; // PTZ_UP
            break;
        case 'down':
            cmdCode = 0x02; // PTZ_DOWN
            break;
        case 'left':
            cmdCode = 0x03; // PTZ_LEFT
            break;
        case 'right':
            cmdCode = 0x04; // PTZ_RIGHT
            break;
        case 'zoom_in':
        case 'focus_in':
            cmdCode = 0x05; // PTZ_ZOOM_IN
            break;
        case 'zoom_out':
        case 'focus_out':
            cmdCode = 0x06; // PTZ_ZOOM_OUT
            break;
        case 'stop':
        default:
            cmdCode = 0x00; // PTZ_STOP
            break;
    }

    const safeSpeed = Math.max(1, Math.min(10, Math.round(speed)));

    // Struktur paket standar Macrovideo PTZ Control Packet (32 Bytes)
    const packet = Buffer.alloc(32);
    
    // Header Magic V380 Protocol: 00 00 01 07 20 21 00 00
    packet.writeUInt8(0x00, 0);
    packet.writeUInt8(0x00, 1);
    packet.writeUInt8(0x01, 2);
    packet.writeUInt8(0x07, 3);
    packet.writeUInt8(0x20, 4);
    packet.writeUInt8(0x21, 5);
    packet.writeUInt8(0x00, 6);
    packet.writeUInt8(0x00, 7);

    // Command ID & Payload Type (PTZ Command: 0x284A / Type 0x05)
    packet.writeUInt16BE(0x284a, 8);
    packet.writeUInt16BE(0x0010, 10); // Length: 16 bytes payload

    // Target Camera Channel / Sub-device (Default: 0)
    packet.writeUInt8(0x00, 12);
    // PTZ Direction Opcode
    packet.writeUInt8(cmdCode, 13);
    // PTZ Speed Parameter
    packet.writeUInt8(safeSpeed, 14);
    // Action Flag: 0 = Stop, 1 = Start Continuous Move
    packet.writeUInt8(cmdCode === 0 ? 0x00 : 0x01, 15);

    // Reserved params / step timing
    packet.writeUInt32BE(0x00000000, 16);
    packet.writeUInt32BE(0x00000000, 20);
    packet.writeUInt32BE(0x00000000, 24);
    packet.writeUInt32BE(0x00000000, 28);

    return packet;
}

/**
 * Membuat paket biner PTZ V380 Pro V2 Variant (Format 2: 0x2710 Little-Endian & Streamlined Opcode)
 * @param {string} direction - 'up' | 'down' | 'left' | 'right' | 'stop' | 'zoom_in' | 'zoom_out'
 * @param {number} speed - 1 s/d 10
 * @returns {Buffer} Payload biner 24 bytes
 */
export function buildV380PtzVariant2Packet(direction, speed = 5) {
    let ptzAction = 0; // 0: stop, 1: up, 2: down, 3: left, 4: right, 5: zoom+, 6: zoom-
    switch (direction) {
        case 'up': ptzAction = 1; break;
        case 'down': ptzAction = 2; break;
        case 'left': ptzAction = 3; break;
        case 'right': ptzAction = 4; break;
        case 'zoom_in':
        case 'focus_in': ptzAction = 5; break;
        case 'zoom_out':
        case 'focus_out': ptzAction = 6; break;
        case 'stop':
        default: ptzAction = 0; break;
    }

    const safeSpeed = Math.max(1, Math.min(10, Math.round(speed)));
    const packet = Buffer.alloc(24);

    // Magic Header V380 v2: 0x7F, 0x00, 0x00, 0x01
    packet.writeUInt8(0x7F, 0);
    packet.writeUInt8(0x00, 1);
    packet.writeUInt8(0x00, 2);
    packet.writeUInt8(0x01, 3);

    // Opcode PTZ Command (0x2710)
    packet.writeUInt16LE(0x2710, 4);
    // Payload length: 16 bytes
    packet.writeUInt16LE(0x0010, 6);

    // PTZ Action, Speed, Channel, Step
    packet.writeUInt8(ptzAction, 8);
    packet.writeUInt8(safeSpeed, 9);
    packet.writeUInt8(0x00, 10);
    packet.writeUInt8(ptzAction === 0 ? 0x00 : 0x01, 11);

    packet.writeUInt32LE(0x00000000, 12);
    packet.writeUInt32LE(0x00000000, 16);
    packet.writeUInt32LE(0x00000000, 20);

    return packet;
}

/**
 * Mengirimkan perintah PTZ biner langsung ke kamera V380 via TCP Socket (Dual Variant Burst)
 * @param {Object} options
 * @param {string} options.host - IP Address Kamera (misal: 192.168.1.4)
 * @param {number} [options.port=8800] - Port TCP V380 (default: 8800)
 * @param {string} options.direction - 'up'|'down'|'left'|'right'|'stop'
 * @param {number} [options.speed=5] - Kecepatan (1 - 10)
 * @param {number} [options.durationMs=450] - Durasi auto-stop dalam milidetik
 * @param {number} [options.timeoutMs=2500] - Timeout socket koneksi
 * @returns {Promise<{success: boolean, message: string, bytesSent: number}>}
 */
export function sendV380PtzCommand({ host, port = 8800, direction, speed = 5, durationMs = 450, timeoutMs = 2500 }) {
    return new Promise((resolve, reject) => {
        if (!host) {
            return reject(new Error('Host / IP target kamera V380 tidak boleh kosong.'));
        }

        const targetPort = parseInt(port, 10) || 8800;
        const movePacket1 = buildV380PtzPacket(direction, speed);
        const movePacket2 = buildV380PtzVariant2Packet(direction, speed);
        const combinedMove = Buffer.concat([movePacket1, movePacket2]);

        const socket = new net.Socket();
        let isResolved = false;

        const cleanup = () => {
            try {
                socket.removeAllListeners();
                socket.destroy();
            } catch (e) {}
        };

        socket.setTimeout(timeoutMs);

        socket.on('timeout', () => {
            if (!isResolved) {
                isResolved = true;
                cleanup();
                reject(new Error(`Koneksi TCP V380 ke ${host}:${targetPort} timeout setelah ${timeoutMs}ms`));
            }
        });

        socket.on('error', (err) => {
            if (!isResolved) {
                isResolved = true;
                cleanup();
                reject(new Error(`Gagal terhubung ke socket V380 ${host}:${targetPort} - ${err.message}`));
            }
        });

        socket.connect(targetPort, host, () => {
            // Tembakkan paket gerak biner gabungan untuk menjamin kompatibilitas semua varian Macrovideo
            socket.write(combinedMove, (writeErr) => {
                if (writeErr) {
                    if (!isResolved) {
                        isResolved = true;
                        cleanup();
                        reject(writeErr);
                    }
                    return;
                }

                // Jika perintah stop atau tidak ada durasi, tutup langsung
                if (direction === 'stop' || !durationMs || durationMs <= 0) {
                    if (!isResolved) {
                        isResolved = true;
                        cleanup();
                        resolve({
                            success: true,
                            message: `Perintah V380 STOP berhasil dikirim ke ${host}:${targetPort}`,
                            bytesSent: combinedMove.length
                        });
                    }
                    return;
                }

                // Jika perintah gerak kontinu, jadwalkan paket STOP sebelum menutup socket
                const stopPacket1 = buildV380PtzPacket('stop', 0);
                const stopPacket2 = buildV380PtzVariant2Packet('stop', 0);
                const combinedStop = Buffer.concat([stopPacket1, stopPacket2]);

                setTimeout(() => {
                    try {
                        socket.write(combinedStop, () => {
                            if (!isResolved) {
                                isResolved = true;
                                cleanup();
                                resolve({
                                    success: true,
                                    message: `Perintah V380 PTZ '${direction}' (${durationMs}ms) berhasil dikirim ke ${host}:${targetPort}`,
                                    bytesSent: combinedMove.length + combinedStop.length
                                });
                            }
                        });
                    } catch (e) {
                        if (!isResolved) {
                            isResolved = true;
                            cleanup();
                            resolve({
                                success: true,
                                message: `Perintah V380 PTZ '${direction}' terkirim ke ${host}:${targetPort}`,
                                bytesSent: combinedMove.length
                            });
                        }
                    }
                }, Math.max(100, Math.min(3000, durationMs)));
            });
        });
    });
}

/**
 * Melakukan probe / diagnostik konektivitas socket port 8800 V380
 * @param {Object} options
 * @param {string} options.host
 * @param {number} [options.port=8800]
 * @param {number} [options.timeoutMs=2000]
 * @returns {Promise<{success: boolean, port: number, responseTimeMs: number, message: string}>}
 */
export function probeV380Socket({ host, port = 8800, timeoutMs = 2000 }) {
    return new Promise((resolve) => {
        const targetPort = parseInt(port, 10) || 8800;
        const socket = new net.Socket();
        const start = Date.now();
        let isDone = false;

        const finish = (success, message, err = null) => {
            if (isDone) return;
            isDone = true;
            try {
                socket.removeAllListeners();
                socket.destroy();
            } catch(e) {}

            resolve({
                success,
                host,
                port: targetPort,
                responseTimeMs: Date.now() - start,
                message: success ? message : (err ? err.message : message),
                error: success ? null : (err ? err.message : message)
            });
        };

        socket.setTimeout(timeoutMs);

        socket.on('timeout', () => {
            finish(false, `Timeout ${timeoutMs}ms port ${targetPort}`);
        });

        socket.on('error', (err) => {
            finish(false, `Port ${targetPort} tidak terbuka / ditolak`, err);
        });

        socket.connect(targetPort, host, () => {
            finish(true, `Port V380 ${targetPort} terbuka & aktif merespon soket TCP`);
        });
    });
}

export default {
    buildV380PtzPacket,
    buildV380PtzVariant2Packet,
    sendV380PtzCommand,
    probeV380Socket
};
