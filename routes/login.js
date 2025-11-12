const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../config/db');

// POST /api/login（登录接口）
router.post('/', async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
        return res.status(400).json({ message: '用户名和密码为必填项' });
    }

    try {
        const [rows] = await pool.execute(
            'SELECT id, username, password_hash FROM users WHERE username = ? LIMIT 1',
            [username]
        );
        const user = rows[0];
        if (!user) {
            return res.status(401).json({ message: '用户名或密码错误' });
        }

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.status(401).json({ message: '用户名或密码错误' });
        }

    // 3. 登录成功：同步更新 is_online、last_login、last_active
    await pool.execute(
      `UPDATE users 
       SET is_online = 1, 
           last_login = CURRENT_TIMESTAMP, 
           last_active = CURRENT_TIMESTAMP 
       WHERE username = ?`,
      [username]
    );

    // 4. 返回响应
    res.status(200).json({
      code: 200,
      message: '登录成功',
      data: { username: user.username }
    });

  } catch (err) {
    console.error('登录接口错误:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

module.exports = router;