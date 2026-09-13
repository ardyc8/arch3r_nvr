const fs = require('fs');
let code = fs.readFileSync('public/superadmin.js', 'utf8');

const oldCode = `        } catch (err) {
            console.error('Gagal memuat setting superadmin', err);
        }
    } catch (err) {
            console.error('Gagal memuat setting superadmin', err);
        }
    }`;

const newCode = `        } catch (err) {
            console.error('Gagal memuat setting superadmin', err);
        }
    }`;

code = code.replace(oldCode, newCode);
fs.writeFileSync('public/superadmin.js', code);
console.log('Fixed extra catch block');
