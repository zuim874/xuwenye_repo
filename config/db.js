// config/db.js
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '884560',
    database: process.env.DB_NAME || 'cs2_utility',
    waitForConnections: true,
    charset: 'utf8mb4',
    connectionLimit: Number(process.env.DB_CONN_LIMIT) || 20,
    queueLimit: 0,
    timezone: 'Z', // 使用 UTC 时间，避免时区问题
});

pool.on('connection', function(connection) {
    connection.query('SET NAMES utf8mb4');
});

module.exports = pool;