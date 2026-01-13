const db = require('./db');
const phone = '8888888888';

db.serialize(() => {
    db.get("SELECT * FROM users WHERE phone = ?", [phone], (err, row) => {
        if (err) console.error('Error fetching user:', err);
        else {
            if (row) {
                console.log('Agent User Found:', row);
                if (row.role !== 'AGENT') {
                    console.log('Incorrect role. Fixing...');
                    db.run("UPDATE users SET role = 'AGENT' WHERE phone = ?", [phone], function (err) {
                        if (err) console.error(err);
                        else console.log('Fixed Agent Role.');
                    });
                } else {
                    console.log('Role is correct.');
                }
            } else {
                console.log('Agent User NOT Found (Will be created on first login).');
            }
        }
    });
});
