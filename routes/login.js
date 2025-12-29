const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../config/db');

/**
 * 用户登录接口
 * POST /api/login
 * 请求体: { username, password }
 */
router.post('/', async (req, res) => {
    const { username, password } = req.body || {};
    
    // 参数校验
    if (!username || !password) {
        return res.status(400).json({ code: 400, message: '请输入用户名和密码以登录' });
    }

    try {
        // 查询用户信息
        const [rows] = await pool.execute(
            'SELECT id, username, password_hash, user_power FROM users WHERE username = ? LIMIT 1',
            [username]
        );
        
        const user = rows[0];
        if (!user) {
            return res.status(401).json({ message: '用户名或密码错误' });
        }

        // 密码验证
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.status(401).json({ message: '用户名或密码错误' });
        }

        // 登录成功，更新用户状态
        await pool.execute(
            `UPDATE users 
             SET is_online = 1, 
                 last_login = CURRENT_TIMESTAMP, 
                 last_active = CURRENT_TIMESTAMP 
             WHERE username = ?`,
            [username]
        );

        // 返回成功响应
        res.status(200).json({
            code: 200,
            message: '登录成功！欢迎回来',
            data: { 
                username: user.username,
                user_id: user.id,
                user_power: user.user_power
            }
        });

    } catch (err) {
        console.error('登录接口错误:', err);
        res.status(500).json({ code: 500, message: '服务器内部错误，登录失败，请稍后重试' });
    }
});

module.exports = router;