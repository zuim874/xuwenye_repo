const express = require('express');
const router = express.Router();
const pool = require('../config/db');

/**
 * 用户注销接口
 * POST /api/logout
 * 请求体: { username }
 */
router.post('/', async (req, res) => {
    try {
        const { username } = req.body;
        
        // 参数校验
        if (!username) {
            return res.status(400).json({ code: 400, message: '缺少用户名参数' });
        }

        // 更新用户为离线状态
        await pool.execute(
            `UPDATE users 
             SET is_online = 0, 
                 last_active = NULL 
             WHERE username = ?`,
            [username]
        );

        res.status(200).json({ code: 200, message: '注销成功' });
    } catch (err) {
        console.error('注销接口错误:', err);
        res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
});

module.exports = router;