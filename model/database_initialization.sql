-- 初始化 CS2 Utility 数据库
CREATE DATABASE IF NOT EXISTS `cs2_utility` 
DEFAULT CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `cs2_utility`;

-- 用户表
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(20) NOT NULL UNIQUE,
    `email` VARCHAR(255) UNIQUE,
    `password_hash` VARCHAR(100) NOT NULL,
    `avatar` VARCHAR(255) DEFAULT NULL,
    `user_power` TINYINT(1) DEFAULT 1 CHECK (`user_power` IN (0,1,2)),
    `is_online` TINYINT(1) NOT NULL DEFAULT 0,
    `last_login` TIMESTAMP NULL,
    `last_active` TIMESTAMP NULL,
    `reset_token` VARCHAR(100) NULL,
    `reset_token_expiry` TIMESTAMP NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
ALTER TABLE users 
ADD COLUMN delete_verification_code VARCHAR(6) NULL,
ADD COLUMN delete_code_expiry DATETIME NULL;
-- 在users表中添加换绑邮箱相关字段
ALTER TABLE users 
ADD COLUMN change_email_code VARCHAR(6) NULL COMMENT '换绑邮箱验证码',
ADD COLUMN change_email_code_expiry DATETIME NULL COMMENT '换绑验证码过期时间',
ADD COLUMN new_email VARCHAR(255) NULL COMMENT '待验证的新邮箱',
ADD COLUMN new_email_verification_code VARCHAR(6) NULL COMMENT '新邮箱验证码',
ADD COLUMN new_email_code_expiry DATETIME NULL COMMENT '新邮箱验证码过期时间';

-- 地图基础表
CREATE TABLE IF NOT EXISTS `maps` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '地图ID',
    `map_key` VARCHAR(50) NOT NULL COMMENT '前端地图标识（dust2/mirage等）',
    `map_name` VARCHAR(50) NOT NULL COMMENT '地图显示名（Dust II/Mirage等）',
    `map_image_url` VARCHAR(255) NOT NULL COMMENT '地图图片地址',
    `map_url` VARCHAR(255) NOT NULL COMMENT '地图相关URL',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_map_key` (`map_key`) COMMENT '地图标识唯一'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='CSGO地图基础表';

-- 道具点位表
CREATE TABLE IF NOT EXISTS `nade_spots` (
    `spot_id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '点位ID（主键）',
    `map_id` INT UNSIGNED NOT NULL COMMENT '关联地图ID（外键）',
    `nade_type` ENUM('smoke','flash','molotov','he','decoy') NOT NULL COMMENT '道具类型：烟雾/闪光/燃烧瓶/手雷/诱饵弹',
    `spot_title` VARCHAR(64) NOT NULL COMMENT '点位标题（如高台烟、A点闪光）',
    `land_x` DECIMAL(10,2) NOT NULL COMMENT '落点X坐标',
    `land_y` DECIMAL(10,2) NOT NULL COMMENT '落点Y坐标',
    `spot_desc` VARCHAR(255) DEFAULT '' COMMENT '点位描述',
    PRIMARY KEY (`spot_id`),
    KEY `idx_map_id` (`map_id`) COMMENT '关联地图索引，提升查询效率',
    CONSTRAINT `fk_nade_spots_map_id` FOREIGN KEY (`map_id`) REFERENCES `maps` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='CSGO道具点位表';

-- 道具投掷点表
CREATE TABLE IF NOT EXISTS `nade_throws` (
    `throw_id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '投掷点ID（主键）',
    `spot_id` INT UNSIGNED NOT NULL COMMENT '关联道具点位ID（外键）',
    `throw_x` DECIMAL(10,2) NOT NULL COMMENT '投掷点X坐标',
    `throw_y` DECIMAL(10,2) NOT NULL COMMENT '投掷点Y坐标',
    `video_url` VARCHAR(512) NOT NULL COMMENT '投掷教程视频链接',
    `throw_desc` VARCHAR(255) DEFAULT '' COMMENT '投掷点描述（如跳投、走投）',
    PRIMARY KEY (`throw_id`),
    KEY `idx_spot_id` (`spot_id`) COMMENT '关联点位索引，提升查询效率',
    CONSTRAINT `fk_nade_throws_spot_id` FOREIGN KEY (`spot_id`) REFERENCES `nade_spots` (`spot_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='CSGO道具投掷点表';

-- 帖子表
CREATE TABLE IF NOT EXISTS `posts` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '帖子自增 ID（主键）',
    `user_id` INT UNSIGNED NOT NULL COMMENT '发布者 ID（外键，关联 users 表的 id）',
    `title` VARCHAR(255) NOT NULL COMMENT '帖子标题',
    `content` TEXT NOT NULL COMMENT '帖子内容',
    `tags` VARCHAR(100) NOT NULL COMMENT '标签（逗号分隔字符串，如 "Mirage,烟雾弹,战术"）',
    `video_url` VARCHAR(255) NOT NULL COMMENT '视频访问路径',
    `view_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '浏览量',
    `like_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '点赞数',
    `comment_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '评论数',
    `is_deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除：0=未删除，1=已删除',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '发布时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 帖子点赞表
CREATE TABLE IF NOT EXISTS `post_likes` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `post_id` INT UNSIGNED NOT NULL COMMENT '关联帖子ID',
    `user_id` INT UNSIGNED NOT NULL COMMENT '关联用户ID',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `unique_post_user` (`post_id`, `user_id`) COMMENT '防止重复点赞',
    FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 帖子收藏表
CREATE TABLE IF NOT EXISTS `post_favorites` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `post_id` INT UNSIGNED NOT NULL COMMENT '关联帖子ID',
    `user_id` INT UNSIGNED NOT NULL COMMENT '关联用户ID',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `unique_post_user` (`post_id`, `user_id`) COMMENT '防止重复收藏',
    FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 评论表
CREATE TABLE IF NOT EXISTS `comments` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `post_id` INT UNSIGNED NOT NULL COMMENT '关联帖子ID',
    `user_id` INT UNSIGNED NOT NULL COMMENT '关联用户ID',
    `content` TEXT NOT NULL COMMENT '评论内容',
    `is_deleted` TINYINT(1) DEFAULT 0 COMMENT '逻辑删除：0=未删除，1=已删除',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 每日浏览量统计表
CREATE TABLE IF NOT EXISTS `daily_views` (
    `date` VARCHAR(10) PRIMARY KEY COMMENT '统计日期',
    `views` INT NOT NULL DEFAULT 0 COMMENT '当日浏览量',
    `last_updated` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建索引优化查询性能
CREATE INDEX `idx_date` ON `daily_views`(`date`);
CREATE INDEX `idx_posts_user_id` ON `posts`(`user_id`);
CREATE INDEX `idx_posts_created_at` ON `posts`(`created_at`);
CREATE INDEX `idx_comments_post_id` ON `comments`(`post_id`);
CREATE INDEX `idx_comments_user_id` ON `comments`(`user_id`);

-- 输出初始化完成信息
SELECT 'CS2 Utility 数据库初始化完成！' AS '初始化状态';