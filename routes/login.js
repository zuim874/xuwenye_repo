const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../config/db');

// POST /api/login（登录接口）
router.post('/login', async (req, res) => {
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

        // 登录成功：此处可生成 JWT / session；示例返回最小信息
        return res.status(200).json({ message: '登录成功', user: { id: user.id, username: user.username } });
    } catch (err) {
        console.error('登录错误:', err);
        return res.status(500).json({ message: '服务器内部错误' });
    }
});

module.exports = router;