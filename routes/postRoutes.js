const express = require('express');
const router = express.Router();
const multer = require('multer');
const pool = require('../config/db');
const path = require('path');
const fs = require('fs');

// 视频存储配置（保持不变）
const videoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/videos');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.random().toString(36).substr(2, 9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

// 视频过滤配置（保持不变）
const videoFilter = (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/webm'];
    const fileSize = req.headers['content-length'] ? parseInt(req.headers['content-length']) : 0;
    const maxSize = 50 * 1024 * 1024;

    if (!allowedTypes.includes(file.mimetype)) {
        return cb(new Error('仅支持 MP4、WebM 格式的视频'), false);
    }
    if (fileSize > maxSize) {
        return cb(new Error('视频大小不能超过 50MB'), false);
    }
    cb(null, true);
};

const uploadVideo = multer({
    storage: videoStorage,
    fileFilter: videoFilter,
    limits: { fileSize: 50 * 1024 * 1024 }
});

// 帖子提交接口（保持不变，依赖前端传递的userId并验证）
router.post('/create', uploadVideo.single('video'), async (req, res) => {
    try {
        const { userId, title, content, tags } = req.body;
        const videoFile = req.file;

        if (!userId || !title || !content || !tags || !videoFile) {
            return res.status(400).json({
                code: 400,
                message: '参数不全：userId、标题、内容、标签、视频均为必填项'
            });
        }

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

        const videoUrl = `/uploads/videos/${videoFile.filename}`;
        const [result] = await pool.execute(
            `INSERT INTO posts (user_id, title, content, tags, video_url, created_at) 
             VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [userId, title, content, tags, videoUrl]
        );

        res.status(200).json({
            code: 200,
            message: '帖子发布成功',
            data: {
                postId: result.insertId,
                videoUrl: videoUrl
            }
        });

    } catch (err) {
        console.error('帖子发布接口错误：', err);
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
            error: process.env.NODE_ENV === 'development' ? err.message : ''
        });
    }
});

// 获取帖子列表接口（保持不变）
router.get('/', async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
        const offset = (page - 1) * limit;

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

        const [posts] = await pool.execute(sql, [
            limit.toString(),
            offset.toString()
        ]);

        const [totalResult] = await pool.execute('SELECT COUNT(*) AS total FROM posts WHERE is_deleted = 0');
        const total = totalResult[0].total;

        const formattedPosts = posts.map(post => ({
            ...post,
            authorId: post.user_id,
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

// 获取帖子详情（修改登录验证为x-login-user-id）
router.get('/:id', async (req, res) => {
    try {
        const postId = req.params.id;
        // 从请求头获取登录用户ID，与user.js保持一致
        const userId = req.headers['x-login-user-id'] || null;
        
        const sql = `
            SELECT 
                p.id, p.user_id, p.title, p.content, p.tags, p.video_url, p.created_at,
                IFNULL(p.like_count, 0) AS like_count,
                IFNULL(p.comment_count, 0) AS comment_count,
                IFNULL(p.view_count, 0) AS view_count,
                (SELECT COUNT(*) FROM post_favorites WHERE post_id = p.id) AS favorite_count,
                u.username AS author_name,
                EXISTS(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = ?) AS user_liked,
                EXISTS(SELECT 1 FROM post_favorites WHERE post_id = p.id AND user_id = ?) AS user_favorited
            FROM posts p
            LEFT JOIN users u ON p.user_id = u.id
            WHERE p.id = ? AND p.is_deleted = 0
            LIMIT 1
        `;
        
        const [posts] = await pool.execute(sql, [userId, userId, postId]);
        
        if (posts.length === 0) {
            return res.status(404).json({
                code: 404,
                message: '帖子不存在或已被删除'
            });
        }
        
        const post = posts[0];
        post.tags = post.tags ? post.tags.split(',').map(tag => tag.trim()) : [];
        
        res.status(200).json({
            code: 200,
            message: '获取帖子详情成功',
            data: { post }
        });
        
    } catch (err) {
        console.error('获取帖子详情接口错误：', err);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误，获取帖子详情失败',
            error: process.env.NODE_ENV === 'development' ? err.message : ''
        });
    }
});

// 帖子点赞（修改登录验证为x-login-user-id）
router.post('/:id/like', async (req, res) => {
    try {
        // 从请求头获取登录用户ID，验证登录状态
        const loginUserId = req.headers['x-login-user-id'];
        if (!loginUserId) {
            return res.status(401).json({
                code: 401,
                message: '未登录，请先登录'
            });
        }
        
        const postId = req.params.id;
        const userId = loginUserId; // 使用请求头中的用户ID
        
        // 检查帖子是否存在
        const [postCheck] = await pool.execute(
            'SELECT id FROM posts WHERE id = ? AND is_deleted = 0 LIMIT 1',
            [postId]
        );
        
        if (postCheck.length === 0) {
            return res.status(404).json({
                code: 404,
                message: '帖子不存在或已被删除'
            });
        }
        
        // 检查是否已经点赞
        const [likeCheck] = await pool.execute(
            'SELECT id FROM post_likes WHERE post_id = ? AND user_id = ? LIMIT 1',
            [postId, userId]
        );
        
        if (likeCheck.length > 0) {
            // 取消点赞
            await pool.execute(
                'DELETE FROM post_likes WHERE post_id = ? AND user_id = ?',
                [postId, userId]
            );
            
            // 更新帖子点赞数
            await pool.execute(
                'UPDATE posts SET like_count = like_count - 1 WHERE id = ?',
                [postId]
            );
            
            return res.status(200).json({
                code: 200,
                message: '取消点赞成功'
            });
        } else {
            // 点赞
            await pool.execute(
                'INSERT INTO post_likes (post_id, user_id, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
                [postId, userId]
            );
            
            // 更新帖子点赞数
            await pool.execute(
                'UPDATE posts SET like_count = like_count + 1 WHERE id = ?',
                [postId]
            );
            
            return res.status(200).json({
                code: 200,
                message: '点赞成功'
            });
        }
        
    } catch (err) {
        console.error('帖子点赞接口错误：', err);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误，点赞失败',
            error: process.env.NODE_ENV === 'development' ? err.message : ''
        });
    }
});

// 帖子收藏（修改登录验证为x-login-user-id）
router.post('/:id/favorite', async (req, res) => {
    try {
        // 从请求头获取登录用户ID，验证登录状态
        const loginUserId = req.headers['x-login-user-id'];
        if (!loginUserId) {
            return res.status(401).json({
                code: 401,
                message: '未登录，请先登录'
            });
        }
        
        const postId = req.params.id;
        const userId = loginUserId; // 使用请求头中的用户ID
        
        // 检查帖子是否存在
        const [postCheck] = await pool.execute(
            'SELECT id FROM posts WHERE id = ? AND is_deleted = 0 LIMIT 1',
            [postId]
        );
        
        if (postCheck.length === 0) {
            return res.status(404).json({
                code: 404,
                message: '帖子不存在或已被删除'
            });
        }
        
        // 检查是否已经收藏
        const [favoriteCheck] = await pool.execute(
            'SELECT id FROM post_favorites WHERE post_id = ? AND user_id = ? LIMIT 1',
            [postId, userId]
        );
        
        if (favoriteCheck.length > 0) {
            // 取消收藏
            await pool.execute(
                'DELETE FROM post_favorites WHERE post_id = ? AND user_id = ?',
                [postId, userId]
            );
            
            return res.status(200).json({
                code: 200,
                message: '取消收藏成功'
            });
        } else {
            // 收藏
            await pool.execute(
                'INSERT INTO post_favorites (post_id, user_id, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
                [postId, userId]
            );
            
            return res.status(200).json({
                code: 200,
                message: '收藏成功'
            });
        }
        
    } catch (err) {
        console.error('帖子收藏接口错误：', err);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误，收藏失败',
            error: process.env.NODE_ENV === 'development' ? err.message : ''
        });
    }
});

// 增加帖子浏览量（保持不变）
router.post('/:id/view', async (req, res) => {
    try {
        const postId = req.params.id;
        
        const [postCheck] = await pool.execute(
            'SELECT id FROM posts WHERE id = ? AND is_deleted = 0 LIMIT 1',
            [postId]
        );
        
        if (postCheck.length === 0) {
            return res.status(404).json({
                code: 404,
                message: '帖子不存在或已被删除'
            });
        }
        
        await pool.execute(
            'UPDATE posts SET view_count = view_count + 1 WHERE id = ?',
            [postId]
        );
        
        res.status(200).json({
            code: 200,
            message: '浏览量更新成功'
        });
        
    } catch (err) {
        console.error('更新浏览量接口错误：', err);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误，更新浏览量失败',
            error: process.env.NODE_ENV === 'development' ? err.message : ''
        });
    }
});

// 获取帖子评论（保持不变）
router.get('/:id/comments', async (req, res) => {
    try {
        const postId = req.params.id;
        
        const [postCheck] = await pool.execute(
            'SELECT id FROM posts WHERE id = ? AND is_deleted = 0 LIMIT 1',
            [postId]
        );
        
        if (postCheck.length === 0) {
            return res.status(404).json({
                code: 404,
                message: '帖子不存在或已被删除'
            });
        }
        
        const [comments] = await pool.execute(
            `SELECT c.id, c.user_id, c.content, c.created_at, u.username AS author_name
             FROM comments c
             LEFT JOIN users u ON c.user_id = u.id
             WHERE c.post_id = ? AND c.is_deleted = 0
             ORDER BY c.created_at DESC`,
            [postId]
        );
        
        res.status(200).json({
            code: 200,
            message: '获取评论成功',
            data: { comments }
        });
        
    } catch (err) {
        console.error('获取评论接口错误：', err);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误，获取评论失败',
            error: process.env.NODE_ENV === 'development' ? err.message : ''
        });
    }
});

// 提交评论（修改登录验证为x-login-user-id）
router.post('/:id/comments', async (req, res) => {
    try {
        // 从请求头获取登录用户ID，验证登录状态
        const loginUserId = req.headers['x-login-user-id'];
        if (!loginUserId) {
            return res.status(401).json({
                code: 401,
                message: '未登录，请先登录'
            });
        }
        
        const postId = req.params.id;
        const userId = loginUserId; // 使用请求头中的用户ID
        const { content } = req.body;
        
        if (!content || content.trim() === '') {
            return res.status(400).json({
                code: 400,
                message: '评论内容不能为空'
            });
        }
        
        const [postCheck] = await pool.execute(
            'SELECT id FROM posts WHERE id = ? AND is_deleted = 0 LIMIT 1',
            [postId]
        );
        
        if (postCheck.length === 0) {
            return res.status(404).json({
                code: 404,
                message: '帖子不存在或已被删除'
            });
        }
        
        await pool.execute(
            'INSERT INTO comments (post_id, user_id, content, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
            [postId, userId, content]
        );
        
        await pool.execute(
            'UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?',
            [postId]
        );
        
        res.status(200).json({
            code: 200,
            message: '评论成功'
        });
        
    } catch (err) {
        console.error('提交评论接口错误：', err);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误，评论失败',
            error: process.env.NODE_ENV === 'development' ? err.message : ''
        });
    }
});

// 删除指定帖子的指定评论
router.delete('/:postId/comments/:commentId', async (req, res) => {
    // 声明连接变量，用于后续释放
    let connection;
    try {
        // 1. 验证登录状态
        const loginUserId = req.headers['x-login-user-id'];
        if (!loginUserId) {
            return res.status(401).json({
                code: 401,
                message: '未登录，请先登录'
            });
        }

        // 2. 获取路径参数
        const { postId, commentId } = req.params;

        // 3. 从连接池获取单个连接（事务需要基于单个连接执行）
        connection = await pool.getConnection();

        // 4. 检查帖子是否存在且未被删除（使用连接执行查询）
        const [postCheck] = await connection.execute(
            'SELECT id, user_id FROM posts WHERE id = ? AND is_deleted = 0 LIMIT 1',
            [postId]
        );
        if (postCheck.length === 0) {
            // 释放连接
            connection.release();
            return res.status(404).json({
                code: 404,
                message: '帖子不存在或已被删除'
            });
        }
        const postAuthorId = postCheck[0].user_id;

        // 5. 检查评论是否存在且未被删除
        const [commentCheck] = await connection.execute(
            'SELECT id, user_id FROM comments WHERE id = ? AND post_id = ? AND is_deleted = 0 LIMIT 1',
            [commentId, postId]
        );
        if (commentCheck.length === 0) {
            connection.release();
            return res.status(404).json({
                code: 404,
                message: '评论不存在或已被删除'
            });
        }
        const commentAuthorId = commentCheck[0].user_id;

        // 6. 验证权限
        const isCommentAuthor = loginUserId === commentAuthorId.toString();
        const isPostAuthor = loginUserId === postAuthorId.toString();
        if (!isCommentAuthor && !isPostAuthor) {
            connection.release();
            return res.status(403).json({
                code: 403,
                message: '没有权限删除此评论'
            });
        }

        // 7. 开始事务（基于单个连接）
        await connection.beginTransaction();

        // 8. 软删除评论
        await connection.execute(
            'UPDATE comments SET is_deleted = 1 WHERE id = ? AND post_id = ?',
            [commentId, postId]
        );

        // 9. 更新帖子评论数
        await connection.execute(
            'UPDATE posts SET comment_count = comment_count - 1 WHERE id = ?',
            [postId]
        );

        // 10. 提交事务
        await connection.commit();

        // 11. 释放连接
        connection.release();

        // 12. 返回成功响应
        res.status(200).json({
            code: 200,
            message: '评论删除成功'
        });

    } catch (err) {
        // 若连接已获取，则回滚事务并释放
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        console.error('删除评论接口错误：', err);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误，删除评论失败',
            error: process.env.NODE_ENV === 'development' ? err.message : ''
        });
    }
});

module.exports = router;