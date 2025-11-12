const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../config/db');

// POST /api/register（注册接口，仅支持用户名+密码注册）
router.post('/', async (req, res) => {
    try {
        const { username, password } = req.body || {};

        // 1. 后端参数校验（密码改为：至少6位数字）
        if (!username || !password) {
            return res.status(400).json({ message: '用户名和密码不能为空' });
        }
        if (username.length < 3 || username.length > 20) {
            return res.status(400).json({ message: '用户名必须为3-20个字符' });
        }
        // 核心修改：密码正则改为「至少6位数字」
        if (!/^\d{6,}$/.test(password)) {
            return res.status(400).json({ message: '密码必须至少6位数字' });
        }

        // 2. 校验用户名是否已存在（保持不变）
        const [existingUsers] = await pool.execute(
            'SELECT username FROM users WHERE username = ? LIMIT 1',
            [username]
        );
        if (existingUsers.length > 0) {
            return res.status(400).json({ message: '用户名已被注册，请更换其他用户名' });
        }

        // 3. 密码bcrypt加密（保持不变，与登录接口兼容）
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);

        // 4. 插入用户数据到数据库（保持不变）
        await pool.execute(
            'INSERT INTO users (username, password_hash) VALUES (?, ?)',
            [username, password_hash]
        );

        // 5. 返回成功响应（保持不变）
        return res.status(200).json({ message: '注册成功' });

    } catch (err) {
        console.error('注册接口错误:', err);
        return res.status(500).json({ message: '服务器内部错误，注册失败' });
    }
});

module.exports = router;