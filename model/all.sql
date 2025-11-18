-- 1. 先创建数据库（若未创建）
CREATE DATABASE IF NOT EXISTS cs2_community DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cs2_community;

-- 2. 用户表（存储用户核心信息）
CREATE TABLE users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(20) NOT NULL UNIQUE, 							-- 用户名唯一（保留原字段）
    password_hash VARCHAR(100) NOT NULL, 							-- 加密密码（保留原字段）
    is_online TINYINT(1) NOT NULL DEFAULT 0,						-- 登录状态：0=离线（默认），1=在线
    last_login TIMESTAMP NULL, 										-- 可选：记录最后登录时间（增强功能）
	avatar VARCHAR(255) DEFAULT NULL, 								-- '头像图片路径（默认用用户名首字母生成）'
    user_power tinyint(1) default 1 check (user_power  in (0,1,2)), -- 用户权限，默认1，管理员0，封禁2
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED AUTO_INCREMENT COMMENT '用户唯一ID（主键）',
    username VARCHAR(20) NOT NULL COMMENT '用户名（登录账号）',
    password_hash VARCHAR(255) NOT NULL COMMENT '加密后的密码（bcrypt/MD5）',
    avatar VARCHAR(255) DEFAULT NULL COMMENT '头像图片路径（默认用用户名首字母生成）',
    register_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '注册时间',
    last_active_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后活跃时间（判断在线状态）',
    status TINYINT NOT NULL DEFAULT 1 COMMENT '用户状态：1=正常，2=封禁，3=注销',
    PRIMARY KEY (id),
    UNIQUE KEY uk_username (username) COMMENT '用户名唯一约束',
    INDEX idx_last_active (last_active_time) COMMENT '查询在线用户时加速'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='社区用户表';

-- 3. 帖子表（存储社区帖子内容）
CREATE TABLE IF NOT EXISTS posts (
    id INT UNSIGNED AUTO_INCREMENT COMMENT '帖子唯一ID（主键）',
    title VARCHAR(200) NOT NULL COMMENT '帖子标题',
    content TEXT NOT NULL COMMENT '帖子正文（支持长文本）',
    author_id INT UNSIGNED NOT NULL COMMENT '作者ID（关联users表）',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '发布时间',
    view_count INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '浏览量',
    like_count INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '点赞数',
    comment_count INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '评论数',
    is_deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除：0=未删除，1=已删除',
    PRIMARY KEY (id),
    INDEX idx_author (author_id) COMMENT '查询用户发布的帖子时加速',
    INDEX idx_create_time (create_time) COMMENT '按时间排序展示帖子时加速',
    -- 外键关联：帖子作者必须是存在的用户，禁止删除有帖子的用户
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='社区帖子表';

-- 4. 标签表（存储帖子标签，支持筛选功能）
CREATE TABLE IF NOT EXISTS tags (
    id INT UNSIGNED AUTO_INCREMENT COMMENT '标签唯一ID（主键）',
    tag_name VARCHAR(50) NOT NULL COMMENT '标签名称（如"Mirage"、"烟雾弹"）',
    use_count INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '使用次数（统计热门标签）',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_name (tag_name) COMMENT '标签名称唯一约束',
    INDEX idx_use_count (use_count) COMMENT '排序热门标签时加速'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='帖子标签表';

-- 5. 帖子-标签关联表（处理帖子与标签的多对多关系）
CREATE TABLE IF NOT EXISTS post_tags (
    id INT UNSIGNED AUTO_INCREMENT COMMENT '关联记录ID（主键）',
    post_id INT UNSIGNED NOT NULL COMMENT '帖子ID（关联posts表）',
    tag_id INT UNSIGNED NOT NULL COMMENT '标签ID（关联tags表）',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '关联时间',
    PRIMARY KEY (id),
    -- 联合唯一约束：避免同一帖子重复关联同一标签
    UNIQUE KEY uk_post_tag (post_id, tag_id),
    INDEX idx_post (post_id) COMMENT '查询帖子的所有标签时加速',
    INDEX idx_tag (tag_id) COMMENT '查询标签下的所有帖子时加速',
    -- 外键关联：删除帖子/标签时，自动删除关联记录
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='帖子-标签关联表';

-- 6. 评论表（存储帖子的评论，支持嵌套回复）
CREATE TABLE IF NOT EXISTS comments (
    id INT UNSIGNED AUTO_INCREMENT COMMENT '评论唯一ID（主键）',
    post_id INT UNSIGNED NOT NULL COMMENT '所属帖子ID（关联posts表）',
    user_id INT UNSIGNED NOT NULL COMMENT '评论者ID（关联users表）',
    content VARCHAR(500) NOT NULL COMMENT '评论内容（限制500字）',
    parent_id INT UNSIGNED DEFAULT NULL COMMENT '父评论ID（NULL=顶级评论，支持嵌套回复）',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '评论时间',
    is_deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除：0=未删除，1=已删除',
    PRIMARY KEY (id),
    INDEX idx_post (post_id) COMMENT '查询帖子的所有评论时加速',
    INDEX idx_user (user_id) COMMENT '查询用户发布的所有评论时加速',
    INDEX idx_parent (parent_id) COMMENT '查询评论的嵌套回复时加速',
    -- 外键关联：删除帖子/用户时，自动删除评论
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='帖子评论表';

-- 7. 点赞表（存储用户对帖子的点赞记录，避免重复点赞）
CREATE TABLE IF NOT EXISTS likes (
    id INT UNSIGNED AUTO_INCREMENT COMMENT '点赞记录ID（主键）',
    user_id INT UNSIGNED NOT NULL COMMENT '点赞用户ID（关联users表）',
    post_id INT UNSIGNED NOT NULL COMMENT '被点赞帖子ID（关联posts表）',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '点赞时间',
    PRIMARY KEY (id),
    -- 联合唯一约束：同一用户对同一帖子只能点赞一次
    UNIQUE KEY uk_user_post (user_id, post_id),
    INDEX idx_user (user_id) COMMENT '查询用户的点赞记录时加速',
    INDEX idx_post (post_id) COMMENT '统计帖子点赞数时加速',
    -- 外键关联：删除用户/帖子时，自动删除点赞记录
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='帖子点赞表';