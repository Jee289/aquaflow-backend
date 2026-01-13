const db = require('./db');
const phone = '0000000000';

db.serialize(() => {
    db.get("SELECT * FROM users WHERE phone = ?", [phone], (err, row) => {
        if (err) console.error('Error fetching user:', err);
        else {
            if (row) {
                console.log('Owner User Found:', row);
                if (row.role !== 'OWNER') {
                    console.log('Incorrect role. Fixing...');
                    db.run("UPDATE users SET role = 'OWNER' WHERE phone = ?", [phone], function (err) {
                        if (err) console.error(err);
                        else console.log('Fixed Owner Role.');
                    });
                } else {
                    console.log('Role is correct.');
                }
            } else {
                console.log('Owner User NOT Found (Will be created on first login).');
            }
        }
    });
});
