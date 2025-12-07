--地图基础信息表


CREATE TABLE `maps` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '地图ID',
  `map_key` VARCHAR(50) NOT NULL COMMENT '前端地图标识（dust2/mirage等）',
  `map_name` VARCHAR(50) NOT NULL COMMENT '地图显示名（Dust II/Mirage等）',
  `map_image_url` VARCHAR(255) NOT NULL COMMENT '地图图片地址',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_map_key` (`map_key`) COMMENT '地图标识唯一'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='CSGO地图基础表';

-- 插入初始地图数据
INSERT INTO `maps` (`map_key`, `map_name`, `map_image_url`) VALUES
('dust2', 'Dust II', '../assets/maps/dust2.jpg'),
('mirage', 'Mirage', '../assets/maps/mirage.jpg'),
('inferno', 'Inferno', '../assets/maps/inferno.jpg'),
('nuke', 'Nuke', '../assets/maps/nuke-1.jpg'),
('ancient', 'Ancient', '../assets/maps/ancient.jpg'),
('overpass', 'Overpass', '../assets/maps/overpass.jpg');
