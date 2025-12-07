--投掷物点位表

CREATE TABLE `nade_spots` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '点位ID',
  `map_id` INT UNSIGNED NOT NULL COMMENT '关联地图ID',
  `nade_type` ENUM('smoke','flash','molotov','grenade') NOT NULL COMMENT '投掷物类型',
  `x_coord` INT UNSIGNED NOT NULL COMMENT 'X坐标',
  `y_coord` INT UNSIGNED NOT NULL COMMENT 'Y坐标',
  `title` VARCHAR(100) NOT NULL COMMENT '点位标题',
  `video_url` VARCHAR(255) NOT NULL COMMENT '视频地址',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `fk_map_id` (`map_id`) COMMENT '关联地图索引',
  KEY `idx_map_type` (`map_id`,`nade_type`) COMMENT '地图+类型联合索引',
  CONSTRAINT `fk_map_id` FOREIGN KEY (`map_id`) REFERENCES `maps` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='CSGO投掷物点位表';

-- 插入初始点位数据
INSERT INTO `nade_spots` (`map_id`, `nade_type`, `x_coord`, `y_coord`, `title`, `video_url`) VALUES
-- dust2（map_id=1，对应map_key=dust2）
(1, 'smoke', 30, 25, 'A点烟雾', 'https://example.com/video1'),
(1, 'flash', 60, 40, 'A点闪光', 'https://example.com/video2'),
(1, 'molotov', 45, 60, '中路燃烧', 'https://example.com/video3'),
(1, 'grenade', 75, 30, 'B点手雷', 'https://example.com/video4'),
-- mirage（map_id=2，对应map_key=mirage）
(2, 'smoke', 40, 35, '中路烟雾', 'https://example.com/video5'),
(2, 'flash', 55, 50, 'B点闪光', 'https://example.com/video6');