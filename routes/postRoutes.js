const express = require('express');
const router = express.Router();
const multer = require('multer');
const pool = require('../config/db'); // 你的数据库连接配置（和 login.js 一致）
const path = require('path');
const fs = require('fs');

// 1. 配置 multer：设置视频存储路径和文件名
const videoStorage = multer.diskStorage({
    // 存储目录（需提前创建 uploads/videos 文件夹，否则报错）
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/videos');
        // 若目录不存在则创建
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    // 文件名：避免重复（用时间戳+原文件名）
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.random().toString(36).substr(2, 9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

// 2. 配置文件过滤：只允许 MP4、WebM 格式，限制 50MB
const videoFilter = (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/webm'];
    const fileSize = req.headers['content-length'] ? parseInt(req.headers['content-length']) : 0;
    const maxSize = 50 * 1024 * 1024; // 50MB

    if (!allowedTypes.includes(file.mimetype)) {
        return cb(new Error('仅支持 MP4、WebM 格式的视频'), false);
    }
    if (fileSize > maxSize) {
        return cb(new Error('视频大小不能超过 50MB'), false);
    }
    cb(null, true);
};

// 3. 创建 multer 实例
const uploadVideo = multer({
    storage: videoStorage,
    fileFilter: videoFilter,
    limits: { fileSize: 50 * 1024 * 1024 } // 再次限制大小（双重保险）
});

// 4. 帖子提交接口：POST /api/posts/create
router.post('/create', uploadVideo.single('video'), async (req, res) => {
    try {
        // 4.1 接收前端传递的字段（FormData 中的数据）
        const { userId, title, content, tags } = req.body;
        // 4.2 接收 multer 处理后的视频文件信息（req.file 是视频文件对象）
        const videoFile = req.file;

        // 4.3 后端校验（防止前端跳过验证直接提交）
        if (!userId || !title || !content || !tags || !videoFile) {
            return res.status(400).json({
                code: 400,
                message: '参数不全：userId、标题、内容、标签、视频均为必填项'
            });
        }

        // 4.4 校验 userId 是否存在（防止伪造 userId）
        const [userRows] = await pool.execute(
            'SELECT id FROM users WHERE id = ? LIMIT 1',
            [userId]
        );
        if (userRows.length === 0) {
            return res.status(403).json({
                code: 403,
                message: '无效的用户ID，发布失败'
            });
        }

        // 4.5 组装视频访问路径（前端后续播放视频用）
        // 示例：服务器域名 + /uploads/videos/ + 文件名 → http://localhost:3000/uploads/videos/1699999999999-abc123.mp4
        const videoUrl = `/uploads/videos/${videoFile.filename}`;

        // 4.6 插入数据库（核心：将所有数据存入 posts 表）
        const [result] = await pool.execute(
            `INSERT INTO posts (user_id, title, content, tags, video_url, created_at) 
             VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [userId, title, content, tags, videoUrl] // 按顺序对应 SQL 中的 ?
        );

        // 4.7 返回成功响应
        res.status(200).json({
            code: 200,
            message: '帖子发布成功',
            data: {
                postId: result.insertId, // 新增帖子的 ID（数据库自增主键）
                videoUrl: videoUrl
            }
        });

    } catch (err) {
        // 4.8 错误处理（含文件上传失败的回滚）
        console.error('帖子发布接口错误：', err);
        
        // 若视频已上传成功，但数据库插入失败，删除已上传的视频文件
        if (req.file) {
            try {
            fs.unlinkSync(req.file.path);
            } catch (unlinkErr) {
            console.error('删除失败视频文件异常：', unlinkErr);
            }
        }

        res.status(500).json({
            code: 500,
            message: '服务器内部错误，发布失败',
            error: process.env.NODE_ENV === 'development' ? err.message : '' // 生产环境隐藏错误详情
        });
    }
});

// 1. 新增：获取帖子列表接口（GET /api/posts）
router.get('/', async (req, res) => {
  try {
    // 确保参数是数字类型
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10)); // 限制最大50条
    const offset = (page - 1) * limit;

    console.log(`分页参数: page=${page}, limit=${limit}, offset=${offset}`);

    // 移除SQL中的注释，简化查询
    const sql = `
      SELECT 
        p.id, p.user_id, p.title, p.content, p.tags, p.video_url, p.created_at,
        IFNULL(p.like_count, 0) AS like_count,
        IFNULL(p.comment_count, 0) AS comment_count,
        IFNULL(p.view_count, 0) AS view_count,
        u.username AS author_name
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.is_deleted = 0
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;

    // 明确指定参数类型
    const [posts] = await pool.execute(sql, [
      limit.toString(),  // 明确转换为字符串
      offset.toString()  // 明确转换为字符串
    ]);

    // 查询总帖子数
    const [totalResult] = await pool.execute('SELECT COUNT(*) AS total FROM posts WHERE is_deleted = 0');
    const total = totalResult[0].total;

    // 格式化标签
    const formattedPosts = posts.map(post => ({
      ...post,
      tags: post.tags ? post.tags.split(',').map(tag => tag.trim()) : []
    }));

    res.status(200).json({
      code: 200,
      message: '获取帖子列表成功',
      data: {
        posts: formattedPosts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (err) {
    console.error('获取帖子列表接口错误：', err);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误，获取帖子失败',
      error: process.env.NODE_ENV === 'development' ? err.message : ''
    });
  }
});

module.exports = router;