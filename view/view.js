export const MapView = (function() {
    // 延迟查询 DOM 元素的缓存
    let _elements = null;
    function _ensureElements() {
        if (_elements) return;
        _elements = {
            mapsGrid: document.getElementById('mapsGrid'),
            map2dContainer: document.getElementById('map2dContainer') || document.querySelector('.map-2d-container'),
            currentMapTitle: document.getElementById('currentMapTitle'),
            backButton: document.getElementById('backButton'),
            nadeOptions: document.querySelectorAll('.nade-option'),
            teamOptions: document.querySelectorAll('.team-option'),
            calloutToggle: document.getElementById('calloutToggle'),
            nadeToggle: document.getElementById('nadeToggle'),
            mapCanvas: document.getElementById('mapCanvas')
        };
    }

    // 私有 - 创建地图卡片
    function _createMapCard(mapId, mapInfo) {
        const card = document.createElement('div');
        card.className = 'map-card';
        card.setAttribute('data-map', mapId);

        const imageDiv = document.createElement('div');
        imageDiv.className = 'map-image';
        imageDiv.style.background = `linear-gradient(45deg, ${mapInfo.color}, ${_getGradientColor(mapInfo.color)})`;
        // 可选：如果 mapInfo.thumb 指定，可设置背景图片
        if (mapInfo.thumb) {
            imageDiv.style.backgroundImage = `url("${new URL(mapInfo.thumb, document.baseURI).href}")`;
            imageDiv.style.backgroundSize = 'cover';
            imageDiv.style.backgroundPosition = 'center';
        }

        const info = document.createElement('div');
        info.className = 'map-info';
        info.innerHTML = `<h3 class="map-name">${mapInfo.name}</h3><p class="map-description">${mapInfo.description || ''}</p>`;

        card.appendChild(imageDiv);
        card.appendChild(info);

        return card;
    }

    function _getGradientColor(baseColor) {
        const colorMap = {
            '#8b4513': '#a0522d',
            '#b8860b': '#daa520',
            '#8b0000': '#b22222',
            '#2f4f4f': '#708090',
            '#228b22': '#32cd32',
            '#4682b4': '#5f9ea0'
        };
        return colorMap[baseColor] || baseColor;
    }

    // 公共 API
    return {
        // 必须在 DOMContentLoaded 后调用
        init: function() {
            _ensureElements();

            // 如果有返回按钮或其他控件，绑定基础事件（防止外部 controller 未绑定）
            if (_elements && _elements.backButton) {
                _elements.backButton.addEventListener('click', () => {
                    this.hideMapDetail();
                });
            }
        },

        getElements: function() {
            _ensureElements();
            return _elements;
        },

        renderMapList: function(maps) {
            _ensureElements();
            if (!_elements || !_elements.mapsGrid) return;
            _elements.mapsGrid.innerHTML = '';
            for (const [id, info] of Object.entries(maps)) {
                const card = _createMapCard(id, info);
                // 点击打开详情（兼容模板或控制器）
                card.addEventListener('click', () => {
                    this.showMapDetail(info);
                    this.renderMapCanvas(info);
                });
                _elements.mapsGrid.appendChild(card);
            }
        },

        showMapDetail: function(mapInfo) {
            _ensureElements();
            if (_elements.currentMapTitle) _elements.currentMapTitle.textContent = mapInfo.name || '';
            if (_elements.map2dContainer) _elements.map2dContainer.style.display = 'block';
            window.scrollTo(0, 0);
        },

        hideMapDetail: function() {
            _ensureElements();
            if (_elements.map2dContainer) _elements.map2dContainer.style.display = 'none';
        },

        renderMapCanvas: function(mapInfo) {
            _ensureElements();
            if (!_elements || !_elements.mapCanvas) return;

            _elements.mapCanvas.innerHTML = '';

            const wrapper = document.createElement('div');
            wrapper.className = 'map-wrapper';
            wrapper.style.position = 'relative';
            wrapper.style.width = '100%';
            wrapper.style.height = '100%';
            wrapper.style.overflow = 'hidden';

            const bg = document.createElement('div');
            bg.className = 'map-bg';
            bg.style.position = 'absolute';
            bg.style.left = '0';
            bg.style.top = '0';
            bg.style.width = '100%';
            bg.style.height = '100%';
            bg.style.backgroundColor = mapInfo.color || '#333';
            bg.style.backgroundRepeat = 'no-repeat';
            bg.style.backgroundPosition = 'center center';
            bg.style.backgroundSize = 'contain';

            // 如果有 image 字段，用 document.baseURI 解析（相对于当前 HTML）
            if (mapInfo.image) {
                try {
                    const resolved = new URL(mapInfo.image, document.baseURI).href;
                    // 预加载以检测 404
                    const img = new Image();
                    img.onload = () => {
                        bg.style.backgroundImage = `url("${resolved}")`;
                    };
                    img.onerror = () => {
                        // 加载失败：保留 color 并在控制台提示
                        console.warn('地图背景加载失败：', resolved);
                    };
                    img.src = resolved;
                } catch (e) {
                    console.warn('无效的 mapInfo.image 路径：', mapInfo.image, e);
                }
            } else {
                // 无 image：显示名称占位
                bg.style.display = 'flex';
                bg.style.alignItems = 'center';
                bg.style.justifyContent = 'center';
                bg.style.color = 'white';
                bg.style.fontSize = '20px';
                bg.textContent = mapInfo.name + ' 2D地图';
            }

            const overlay = document.createElement('div');
            overlay.className = 'map-overlay';
            overlay.style.position = 'absolute';
            overlay.style.left = '0';
            overlay.style.top = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.pointerEvents = 'none';

            if (Array.isArray(mapInfo.callouts)) {
                mapInfo.callouts.forEach(c => {
                    const dot = document.createElement('div');
                    dot.className = 'map-callout';
                    dot.style.position = 'absolute';
                    const leftPct = (c.x * 100).toFixed(2) + '%';
                    const topPct = (c.y * 100).toFixed(2) + '%';
                    dot.style.left = leftPct;
                    dot.style.top = topPct;
                    dot.style.transform = 'translate(-50%,-50%)';
                    dot.style.width = '12px';
                    dot.style.height = '12px';
                    dot.style.borderRadius = '50%';
                    dot.style.background = 'rgba(255,0,0,0.9)';
                    dot.style.border = '2px solid white';
                    dot.title = c.name || c.id || '';
                    dot.style.pointerEvents = 'auto';
                    dot.addEventListener('click', (e) => {
                        e.stopPropagation();
                        // 简单显示名称（可以替换为 tooltip）
                        alert(c.name || c.id || 'callout');
                    });
                    overlay.appendChild(dot);
                });
            }

            wrapper.appendChild(bg);
            wrapper.appendChild(overlay);
            _elements.mapCanvas.appendChild(wrapper);
        },

        updateNadeSelection: function(activeType) {
            // 预留：更新 UI 样式等
        },

        updateTeamSelection: function(activeTeam) {
            // 预留：更新 UI 样式等
        },

        updateToggleState: function(toggleId, isActive) {
            // 预留：更新开关样式
        }
    };
})();