const db = require('./db');

db.get("SELECT * FROM users WHERE phone = ?", ['9999999999'], (err, row) => {
    if (err) console.error(err);
    console.log('Admin User Status:', row);
});
