const fs = require('fs');
let obj = { a: 1, b: [1,2,3], c: "test" };
let str = JSON.stringify(obj) + "garbage123}";
fs.writeFileSync('test.json', str);

let data = fs.readFileSync('test.json', 'utf8');
let fixed = false;
for (let i = data.length - 1; i >= 0; i--) {
    if (data[i] === '}') {
        try {
            let parsed = JSON.parse(data.substring(0, i + 1));
            console.log("Found valid JSON at", i);
            console.log(parsed);
            fixed = true;
            break;
        } catch(e) {}
    }
}
if (!fixed) console.log("Could not fix");
