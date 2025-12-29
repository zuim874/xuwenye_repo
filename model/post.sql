-- 创建 posts 表（MySQL 示例，其他数据库可调整语法）
CREATE TABLE IF NOT EXISTS posts (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, -- 帖子自增 ID（主键）
    user_id INT UNSIGNED NOT NULL, -- 发布者 ID（外键，关联 users 表的 id）
    title VARCHAR(255) NOT NULL, -- 帖子标题
    content TEXT NOT NULL, -- 帖子内容
    tags VARCHAR(100) NOT NULL, -- 标签（逗号分隔字符串，如 "Mirage,烟雾弹,战术"）
    video_url VARCHAR(255) NOT NULL, -- 视频访问路径
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- 发布时间
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- 更新时间
    view_count INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '浏览量',
    like_count INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '点赞数',
    comment_count INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '评论数',
    is_deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除：0=未删除，1=已删除',
    -- 外键约束：确保 user_id 必须在 users 表中存在（可选，增强数据完整性）
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 在posts表中添加审核状态字段
ALTER TABLE `posts` 
ADD COLUMN `status` TINYINT NOT NULL DEFAULT 0 COMMENT '帖子状态：0-待审核，1-审核通过，2-审核不通过';

-- 创建索引优化审核查询
CREATE INDEX `idx_posts_status` ON `posts`(`status`);
CREATE INDEX `idx_posts_status_created` ON `posts`(`status`, `created_at`);

-- 为posts表增加reviewed_at字段
ALTER TABLE posts ADD COLUMN reviewed_at datetime DEFAULT NULL COMMENT '审核时间';
