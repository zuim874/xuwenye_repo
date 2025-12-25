const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../config/db');
const emailService = require('../services/emailService.js');

// 验证码存储Map（实际生产环境建议使用Redis）
const verificationCodes = new Map();

// 验证码有效期（10分钟）
const CODE_EXPIRY_TIME = 10 * 60 * 1000;

/**
 * 发送邮箱验证码接口 - 修正路径
 * POST /api/register/send-verification-code
 */
router.post('/send-verification-code', async (req, res) => {
    try {
        const { email } = req.body || {};

        // 参数校验
        if (!email) {
            return res.status(400).json({ message: '邮箱不能为空' });
        }

        // 邮箱格式验证
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: '请输入有效的邮箱地址' });
        }

        // 检查邮箱是否已被注册
        const [existingEmails] = await pool.execute(
            'SELECT email FROM users WHERE email = ? LIMIT 1',
            [email]
        );
        if (existingEmails.length > 0) {
            return res.status(400).json({ message: '该邮箱已被注册，请使用其他邮箱' });
        }

        // 检查是否已发送验证码且未过期
        const existingCode = verificationCodes.get(email);
        if (existingCode && (Date.now() - existingCode.timestamp) < 60000) {
            return res.status(400).json({ message: '验证码发送过于频繁，请1分钟后再试' });
        }

        // 生成6位数字验证码
        const verificationCode = Math.random().toString().slice(2, 8);
        const timestamp = Date.now();

        // 存储验证码
        verificationCodes.set(email, {
            code: verificationCode,
            timestamp: timestamp
        });

        // 清理过期验证码
        cleanupExpiredCodes();

        // 调用邮件服务发送验证码
        try {
            await emailService.sendVerificationCode(email, verificationCode);
            console.log(`验证码已发送到 ${email}`);
            
            res.status(200).json({ 
                message: '验证码发送成功'
            });
        } catch (emailError) {
            console.error('发送邮件失败:', emailError);
            // 如果邮件发送失败，删除存储的验证码
            verificationCodes.delete(email);
            return res.status(500).json({ message: '验证码发送失败，请稍后重试' });
        }

    } catch (err) {
        console.error('发送验证码错误:', err);
        return res.status(500).json({ message: '服务器内部错误，发送验证码失败' });
    }
});

/**
 * 验证验证码接口 - 统一字段名
 * POST /api/register/verify-code
 */
router.post('/verify-code', async (req, res) => {
    try {
        const { email, verificationCode } = req.body || {};

        // 参数校验
        if (!email || !verificationCode) {
            return res.status(400).json({ message: '邮箱和验证码不能为空' });
        }

        // 验证验证码
        const verificationResult = verifyVerificationCode(email, verificationCode);
        if (!verificationResult.valid) {
            return res.status(400).json({ message: verificationResult.message });
        }

        res.status(200).json({ 
            message: '验证码验证成功'
        });

    } catch (err) {
        console.error('验证验证码错误:', err);
        return res.status(500).json({ message: '服务器内部错误，验证验证码失败' });
    }
});

/**
 * 注册接口（增加验证码验证）
 * POST /api/register
 */
router.post('/', async (req, res) => {
    try {
        const { username, password, email, verificationCode } = req.body || {};

        // 1. 后端参数校验
        if (!username || !password || !email || !verificationCode) {
            return res.status(400).json({ message: '用户名、邮箱、密码和验证码不能为空' });
        }
        
        // 用户名验证
        if (username.length < 3 || username.length > 20) {
            return res.status(400).json({ message: '用户名必须为3-20个字符' });
        }
        
        // 用户名格式验证
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        if (!usernameRegex.test(username)) {
            return res.status(400).json({ message: '用户名只能包含字母、数字和下划线' });
        }
        
        // 邮箱格式验证
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: '请输入有效的邮箱地址' });
        }
        
        // 密码验证：至少6位数字
        if (!/^\d{6,}$/.test(password)) {
            return res.status(400).json({ message: '密码必须至少6位数字' });
        }

        // 验证验证码
        const codeVerification = verifyVerificationCode(email, verificationCode);
        if (!codeVerification.valid) {
            return res.status(400).json({ message: codeVerification.message });
        }

        // 2. 校验用户名是否已存在
        const [existingUsers] = await pool.execute(
            'SELECT username FROM users WHERE username = ? LIMIT 1',
            [username]
        );
        if (existingUsers.length > 0) {
            return res.status(400).json({ message: '用户名已被注册，请更换其他用户名' });
        }

        // 3. 校验邮箱是否已存在
        const [existingEmails] = await pool.execute(
            'SELECT email FROM users WHERE email = ? LIMIT 1',
            [email]
        );
        if (existingEmails.length > 0) {
            return res.status(400).json({ message: '该邮箱已被注册，请使用其他邮箱' });
        }

        // 4. 密码bcrypt加密
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);

        // 5. 插入用户数据到数据库
        await pool.execute(
            'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
            [username, email, password_hash]
        );

        // 6. 注册成功后删除验证码
        verificationCodes.delete(email);

        // 7. 返回成功响应
        return res.status(200).json({ 
            message: '注册成功',
            data: {
                username: username,
                email: email
            }
        });

    } catch (err) {
        console.error('注册接口错误:', err);
        
        // 处理数据库唯一约束错误
        if (err.code === 'ER_DUP_ENTRY') {
            if (err.sqlMessage.includes('username')) {
                return res.status(400).json({ message: '用户名已被注册' });
            }
            if (err.sqlMessage.includes('email')) {
                return res.status(400).json({ message: '邮箱已被注册' });
            }
        }
        
        return res.status(500).json({ message: '服务器内部错误，注册失败' });
    }
});

/**
 * 验证验证码的辅助函数 - 修正字段名
 */
function verifyVerificationCode(email, verificationCode) {
    const storedCode = verificationCodes.get(email);
    
    if (!storedCode) {
        return { valid: false, message: '请先获取验证码' };
    }
    
    // 检查验证码是否过期
    if (Date.now() - storedCode.timestamp > CODE_EXPIRY_TIME) {
        verificationCodes.delete(email);
        return { valid: false, message: '验证码已过期，请重新获取' };
    }
    
    // 检查验证码是否正确
    if (storedCode.code !== verificationCode) {
        return { valid: false, message: '验证码错误' };
    }
    
    return { valid: true };
}

/**
 * 清理过期验证码的辅助函数
 */
function cleanupExpiredCodes() {
    const now = Date.now();
    for (const [email, data] of verificationCodes.entries()) {
        if (now - data.timestamp > CODE_EXPIRY_TIME) {
            verificationCodes.delete(email);
        }
    }
}

// 每5分钟清理一次过期验证码
setInterval(cleanupExpiredCodes, 5 * 60 * 1000);

module.exports = router;