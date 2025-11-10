const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../config/db');

// POST /api/register
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body || {};
    if (!username || !email || !password) {
        return res.status(400).json({ message: '用户名、邮箱和密码为必填项' });
    }
    if (password.length < 6) {
        return res.status(400).json({ message: '密码长度至少6位' });
    }

    try {
        // 检查是否已存在用户（参数化查询防注入）
        const [exist] = await pool.execute('SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1', [username, email]);
        if (exist.length) return res.status(409).json({ message: '用户名或邮箱已被注册' });

        const hash = await bcrypt.hash(password, 10);
        await pool.execute(
            'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
            [username, email, hash]
        );

        return res.status(201).json({ message: '注册成功' });
    } catch (err) {
        console.error('注册错误:', err);
        return res.status(500).json({ message: '服务器内部错误' });
    }
});

module.exports = router;