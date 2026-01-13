const db = require('./db');
const phone = '9999999999';

db.serialize(() => {
    // 1. Check current state
    db.get("SELECT * FROM users WHERE phone = ?", [phone], (err, row) => {
        if (err) console.error('Error fetching user:', err);
        else console.log('Current User State:', row);

        // 2. Update to ADMIN
        db.run("UPDATE users SET role = 'ADMIN' WHERE phone = ?", [phone], function (err) {
            if (err) console.error('Error updating:', err);
            else {
                console.log(`Updated ${this.changes} rows. Role set to ADMIN for ${phone}`);

                // 3. Verify update
                db.get("SELECT * FROM users WHERE phone = ?", [phone], (err, row) => {
                    console.log('New User State:', row);
                });
            }
        });
    });
});
