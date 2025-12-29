// routes/search.js - 清理日志版本（已增加审核条件）
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

router.get('/posts/simple', async (req, res) => {
    try {
        let { keyword, page = 1, limit = 10 } = req.query;
        
        // 处理关键词编码
        if (keyword) {
            try {
                // 解码URL编码
                keyword = decodeURIComponent(keyword);
            } catch (e) {
                // 解码失败，保持原样
            }
        }
        
        // 参数验证
        const validPage = Math.max(1, parseInt(page) || 1);
        const validLimit = Math.min(50, Math.max(1, parseInt(limit) || 10));
        const offset = (validPage - 1) * validLimit;

        if (!keyword || keyword.trim() === '') {
            return res.status(400).json({
                code: 400,
                message: '搜索关键词不能为空'
            });
        }

        const searchKeyword = keyword.trim();
        
        // 使用连接池
        const connection = await pool.getConnection();
        
        try {
            // 设置字符集
            await connection.query('SET NAMES utf8mb4');
            
            // 使用字符串模板（安全版本）
            const escapedKeyword = connection.escape(`%${searchKeyword}%`);
            
            const sql = `
                SELECT 
                    p.id, p.user_id, p.title, p.content, p.tags, p.video_url, 
                    p.created_at, p.is_deleted,
                    IFNULL(p.like_count, 0) AS like_count,
                    IFNULL(p.comment_count, 0) AS comment_count,
                    IFNULL(p.view_count, 0) AS view_count,
                    u.username AS author_name
                FROM posts p
                LEFT JOIN users u ON p.user_id = u.id
                WHERE p.is_deleted = 0 
                    AND p.status = 1  -- 增加审核通过条件
                    AND (
                        p.title LIKE ${escapedKeyword} 
                        OR p.content LIKE ${escapedKeyword} 
                        OR p.tags LIKE ${escapedKeyword} 
                        OR u.username LIKE ${escapedKeyword}
                    )
                ORDER BY p.created_at DESC
                LIMIT ${validLimit} OFFSET ${offset}
            `;
            
            const [posts] = await connection.query(sql);

            // 获取总数
            const countSql = `
                SELECT COUNT(*) AS total 
                FROM posts p
                LEFT JOIN users u ON p.user_id = u.id
                WHERE p.is_deleted = 0 
                    AND p.status = 1  -- 增加审核通过条件
                    AND (
                        p.title LIKE ${escapedKeyword} 
                        OR p.content LIKE ${escapedKeyword} 
                        OR p.tags LIKE ${escapedKeyword} 
                        OR u.username LIKE ${escapedKeyword}
                    )
            `;
            
            const [countResult] = await connection.query(countSql);
            const total = countResult[0].total;

            // 格式化响应数据
            const formattedPosts = posts.map(post => ({
                id: post.id,
                userId: post.user_id,
                title: post.title,
                content: post.content,
                tags: post.tags ? post.tags.split(',').map(tag => tag.trim()) : [],
                videoUrl: post.video_url,
                createdAt: post.created_at,
                likeCount: post.like_count || 0,
                commentCount: post.comment_count || 0,
                viewCount: post.view_count || 0,
                authorName: post.author_name,
                isDeleted: post.is_deleted
            }));

            const response = {
                code: 200,
                message: '搜索成功',
                data: {
                    posts: formattedPosts,
                    pagination: {
                        page: validPage,
                        limit: validLimit,
                        total: total,
                        totalPages: Math.ceil(total / validLimit)
                    }
                }
            };

            res.status(200).json(response);

        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('搜索接口错误:', error);
        
        // 提供更详细的错误信息
        res.status(500).json({
            code: 500,
            message: '搜索服务暂时不可用',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;