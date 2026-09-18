const http = require('http');

const data = JSON.stringify({
    name: "Test Cam",
    mainStreamUrl: "demo",
    subStreamUrl: "demo",
    enabled: true
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/cameras',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, res => {
    console.log(`STATUS: ${res.statusCode}`);
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => console.log('BODY:', body));
});

req.on('error', error => console.error('ERROR:', error.message));
req.write(data);
req.end();
