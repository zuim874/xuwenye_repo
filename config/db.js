// config/db.js
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '884560',
    database: process.env.DB_NAME || 'cs2_utility',
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONN_LIMIT) || 10,
    timezone: 'Z'
});

module.exports = pool;