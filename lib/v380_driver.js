/**
 * Arch3r NVR - Macrovideo V380 Camera Native Driver
 * Version: 9.9.2
 * 
 * Hardware Abstraction Driver untuk mengontrol motor PTZ kamera V380 / V380 Pro
 * secara langsung melalui TCP Socket biner (Port 8800) tanpa ketergantungan pada protokol ONVIF XML.
 * Kompatibel dengan firmware Macrovideo dan Armbian Linux STB.
 */

import net from 'net';

/**
 * Membuat paket biner PTZ Macrovideo V380
 * @param {string} direction - 'up' | 'down' | 'left' | 'right' | 'stop' | 'zoom_in' | 'zoom_out'
 * @param {number} speed - 1 s/d 10 (kecepatan gerak)
 * @returns {Buffer} Payload biner untuk socket port 8800
 */
export function buildV380PtzPacket(direction, speed = 5) {
    // Opcode mapping Macrovideo PTZ Command
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
    // Header Magic: 0x00, 0x00, 0x01, 0x07, 0x20, 0x21, 0x00, 0x00
    const packet = Buffer.alloc(32);
    
    // Header Magic V380 Protocol
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

    // Optional Step & Duration (Reserved)
    packet.writeUInt32BE(0x00000000, 16);
    packet.writeUInt32BE(0x00000000, 20);
    packet.writeUInt32BE(0x00000000, 24);
    packet.writeUInt32BE(0x00000000, 28);

    return packet;
}

/**
 * Mengirimkan perintah PTZ biner langsung ke kamera V380 via TCP Socket
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
        const movePacket = buildV380PtzPacket(direction, speed);
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
            // Tembakkan paket gerak biner
            socket.write(movePacket, (writeErr) => {
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
                            bytesSent: movePacket.length
                        });
                    }
                    return;
                }

                // Jika perintah gerak kontinu, jadwalkan paket STOP sebelum menutup socket
                const stopPacket = buildV380PtzPacket('stop', 0);
                setTimeout(() => {
                    try {
                        socket.write(stopPacket, () => {
                            if (!isResolved) {
                                isResolved = true;
                                cleanup();
                                resolve({
                                    success: true,
                                    message: `Perintah V380 PTZ '${direction}' (${durationMs}ms) berhasil dikirim ke ${host}:${targetPort}`,
                                    bytesSent: movePacket.length + stopPacket.length
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
                                bytesSent: movePacket.length
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
    sendV380PtzCommand,
    probeV380Socket
};
