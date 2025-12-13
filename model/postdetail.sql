-- 1. 帖子点赞表（适配 users.id = INT UNSIGNED）
CREATE TABLE IF NOT EXISTS post_likes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT UNSIGNED NOT NULL,  -- 与 posts.id 类型保持一致（如果 posts.id 是 INT UNSIGNED）
    user_id INT UNSIGNED NOT NULL,  -- 匹配 users.id 的 INT UNSIGNED 类型
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_post_user (post_id, user_id), -- 防止重复点赞
    -- 外键约束（字段类型完全匹配，可正常创建）
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. 帖子收藏表（同点赞表，适配字段类型）
CREATE TABLE IF NOT EXISTS post_favorites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT UNSIGNED NOT NULL,  -- 匹配 posts.id 类型
    user_id INT UNSIGNED NOT NULL,  -- 匹配 users.id 类型
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_post_user (post_id, user_id), -- 防止重复收藏
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. 评论表（适配字段类型）
CREATE TABLE IF NOT EXISTS comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT UNSIGNED NOT NULL,  -- 匹配 posts.id 类型
    user_id INT UNSIGNED NOT NULL,  -- 匹配 users.id 类型
    content TEXT NOT NULL,
    is_deleted TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;