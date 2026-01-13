const db = require('./db');

db.serialize(() => {
    db.run("ALTER TABLE users ADD COLUMN address TEXT", (err) => {
        if (err) {
            console.log('Column might already exist or error:', err.message);
        } else {
            console.log('Added address column to users table.');
        }
    });
});
