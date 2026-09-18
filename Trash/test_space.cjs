const { spawn } = require('child_process');
const fs = require('fs');
fs.mkdirSync('/tmp/New Volume', { recursive: true });
const args = [
    '-f', 'lavfi', '-i', 'testsrc=duration=5',
    '-c:v', 'libx264',
    '-f', 'segment',
    '-segment_time', '2',
    '-strftime', '1',
    '/tmp/New Volume/%Y-%m-%d_%H-%M-%S.mp4'
];
const child = spawn('ffmpeg', args);
child.stderr.on('data', d => console.log(d.toString()));
child.on('close', c => console.log('Exited with', c));
