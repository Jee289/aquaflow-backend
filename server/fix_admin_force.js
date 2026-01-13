const db = require('./db');

const phone = '9999999999';

db.serialize(() => {
    db.run("UPDATE users SET role = 'ADMIN' WHERE phone = ?", [phone], (err) => {
        if (err) console.error(err);
        else console.log(`Updated ${phone} to ADMIN`);
    });

    db.get("SELECT * FROM users WHERE phone = ?", [phone], (err, row) => {
        console.log('Final User Row:', row);
    });
});
