import { MAPS } from '../model/maps.js';
import { MapView } from '../view/view.js';

document.addEventListener('DOMContentLoaded', () => {
    // 先初始化 view（确保 DOM 查询成功）
    if (MapView && typeof MapView.init === 'function') MapView.init();

    // 渲染列表与默认地图
    if (MapView && typeof MapView.renderMapList === 'function') {
        MapView.renderMapList(MAPS);
        const first = Object.values(MAPS)[0];
        if (first) {
            MapView.showMapDetail(first);
            MapView.renderMapCanvas(first);
        }
    } else {
        console.error('MapView 未正确导出或缺少方法');
    }
});