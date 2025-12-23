CREATE TABLE `maps` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '地图ID',
  `map_key` VARCHAR(50) NOT NULL COMMENT '前端地图标识（dust2/mirage等）',
  `map_name` VARCHAR(50) NOT NULL COMMENT '地图显示名（Dust II/Mirage等）',
  `map_image_url` VARCHAR(255) NOT NULL COMMENT '地图图片地址',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_map_key` (`map_key`) COMMENT '地图标识唯一'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='CSGO地图基础表';

ALTER TABLE `maps` 
ADD COLUMN `map_url` VARCHAR(255) NOT NULL COMMENT '地图相关URL' AFTER `map_image_url`;

-- 插入初始地图数据
INSERT INTO `maps` (`map_key`, `map_name`, `map_image_url`, `map_url`) VALUES
('dust2', 'Dust II', '../assets/maps/dust2.jpg', '../assets/map_view/dust2.png'),
('mirage', 'Mirage', '../assets/maps/mirage.jpg', '../assets/map_view/mirage.png'),
('inferno', 'Inferno', '../assets/maps/inferno.jpg', '../assets/map_view/inferno.jpg'),
('nuke', 'Nuke', '../assets/maps/nuke-1.jpg', '../assets/map_view/nuke-1.png'),
('ancient', 'Ancient', '../assets/maps/ancient.jpg', '../assets/map_view/ancient.png'),
('overpass', 'Overpass', '../assets/maps/overpass.jpg', '../assets/map_view/overpass.png'),
('vertigo', 'Vertigo', '../assets/maps/vertigo.jpg', '../assets/map_view/vertigo.png'),
('train', 'Train', '../assets/maps/train.jpg', '../assets/map_view/train.png'),
('anubis', 'Anubis', '../assets/maps/anubis.jpg', '../assets/map_view/anubis.png');