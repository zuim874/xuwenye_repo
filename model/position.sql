CREATE TABLE `nade_spots` (
  `spot_id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '点位ID（主键）',
  `map_id` INT UNSIGNED NOT NULL COMMENT '关联地图ID（外键）',
  `nade_type` ENUM('smoke','flash','molotov','he','decoy') NOT NULL COMMENT '道具类型：烟雾/闪光/燃烧瓶/手雷/诱饵弹',
  `spot_title` VARCHAR(64) NOT NULL COMMENT '点位标题（如高台烟、A点闪光）',
  `land_x` DECIMAL(10,2) NOT NULL COMMENT '落点X坐标',
  `land_y` DECIMAL(10,2) NOT NULL COMMENT '落点Y坐标',
  `spot_desc` VARCHAR(255) DEFAULT '' COMMENT '点位描述',
  PRIMARY KEY (`spot_id`),
  KEY `idx_map_id` (`map_id`) COMMENT '关联地图索引，提升查询效率',
  -- 修正：去掉外键行的COMMENT，MySQL外键约束不推荐加注释（或单独写），同时关联maps的map_id字段
  CONSTRAINT `fk_nade_spots_map_id` FOREIGN KEY (`map_id`) REFERENCES `maps` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='CSGO道具点位表';

CREATE TABLE `nade_throws` (
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

-- 2. 插入道具点位（高台烟）
INSERT INTO `nade_spots` (`map_id`, `nade_type`, `spot_title`, `land_x`, `land_y`) 
VALUES (1, 'smoke', '高台烟', 26, 12);

-- 3. 插入高台烟的3个投掷点
INSERT INTO `nade_throws` (`spot_id`, `throw_x`, `throw_y`, `video_url`) 
VALUES 
(1, 15, 70, '...mp4'),
(1, 18, 66, '...mp4'),
(1, 20, 62, '...mp4');

-- 4. 插入道具点位（A点闪光）
INSERT INTO `nade_spots` (`map_id`, `nade_type`, `spot_title`, `land_x`, `land_y`) 
VALUES (1, 'flash', 'A点闪光', 60, 40);

-- 5. 插入A点闪光的投掷点
INSERT INTO `nade_throws` (`spot_id`, `throw_x`, `throw_y`, `video_url`) 
VALUES (2, 55, 80, 'https://example.com/video2');