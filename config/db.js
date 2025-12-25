// config/db.js
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '884560',
    database: process.env.DB_NAME || 'cs2_utility',
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONN_LIMIT) || 20,
    queueLimit: 0,
    timezone: 'Z', // 使用 UTC 时间，避免时区问题
});

// 2. 测试连接（验证 Promise 接口可用，正确解构结果）
async function testDBConnection() {
  try {
    // mysql2/promise 的 query 返回 [results, fields]，必须解构（哪怕不用 fields）
    const [rows] = await pool.query('SELECT 1 AS test'); 
    console.log('✅ MySQL2/promise 连接池创建成功！查询测试通过');
  } catch (error) {
    console.error('❌ MySQL2/promise 连接失败：', error.message);
    process.exit(1); // 连接失败直接退出，避免后续错误
  }
}

module.exports = pool;