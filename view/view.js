const MapView = (function() {
    // DOM元素缓存
    const _elements = {
        mapsGrid: document.getElementById('mapsGrid'),
        map2dContainer: document.getElementById('map2dContainer'),
        currentMapTitle: document.getElementById('currentMapTitle'),
        backButton: document.getElementById('backButton'),
        nadeOptions: document.querySelectorAll('.nade-option'),
        teamOptions: document.querySelectorAll('.team-option'),
        calloutToggle: document.getElementById('calloutToggle'),
        nadeToggle: document.getElementById('nadeToggle'),
        mapCanvas: document.getElementById('mapCanvas')
    };

    // 私有方法 - 创建地图卡片
    function _createMapCard(mapId, mapInfo) {
        const card = document.createElement('div');
        card.className = 'map-card';
        card.setAttribute('data-map', mapId);
        
        card.innerHTML = `
            <div class="map-image" style="background: linear-gradient(45deg, ${mapInfo.color}, ${_getGradientColor(mapInfo.color)})"></div>
            <div class="map-info">
                <h3 class="map-name">${mapInfo.name}</h3>
                <p class="map-description">${mapInfo.description}</p>
            </div>
        `;
        
        return card;
    }

    // 辅助函数 - 获取渐变颜色
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

    // 公共方法
    return {
        // 获取DOM元素
        getElements: function() {
            return _elements;
        },

        // 渲染地图列表
        renderMapList: function(maps) {
            _elements.mapsGrid.innerHTML = '';
            
            for (const [id, info] of Object.entries(maps)) {
                const card = _createMapCard(id, info);
                _elements.mapsGrid.appendChild(card);
            }
        },

        // 显示地图详情
        showMapDetail: function(mapInfo) {
            _elements.currentMapTitle.textContent = mapInfo.name;
            _elements.map2dContainer.style.display = 'block';
            window.scrollTo(0, 0);
        },

        // 隐藏地图详情
        hideMapDetail: function() {
            _elements.map2dContainer.style.display = 'none';
        },

        // 渲染地图画布
        renderMapCanvas: function(mapInfo) {
            _elements.mapCanvas.innerHTML = '';
            
            const mapElement = document.createElement('div');
            mapElement.style.width = '100%';
            mapElement.style.height = '100%';
            mapElement.style.backgroundColor = mapInfo.color;
            mapElement.style.display = 'flex';
            mapElement.style.justifyContent = 'center';
            mapElement.style.alignItems = 'center';
            mapElement.style.color = 'white';
            mapElement.style.fontSize = '24px';
            mapElement.textContent = `${mapInfo.name} 2D地图`;
            
            _elements.mapCanvas.appendChild(mapElement);
        },

        // 更新投掷物选项状态
        updateNadeSelection: function(activeType) {
            _elements.nadeOptions.forEach(option => {
                if (option.getAttribute('data-type') === activeType) {
                    option.classList.add('active');
                } else {
                    option.classList.remove('active');
                }
            });
        },

        // 更新队伍选项状态
        updateTeamSelection: function(activeTeam) {
            _elements.teamOptions.forEach(option => {
                if (option.getAttribute('data-team') === activeTeam) {
                    option.classList.add('active');
                } else {
                    option.classList.remove('active');
                }
            });
        },

        // 更新开关状态
        updateToggleState: function(toggleId, isActive) {
            const toggle = toggleId === 'callout' ? _elements.calloutToggle : _elements.nadeToggle;
            if (isActive) {
                toggle.classList.add('active');
            } else {
                toggle.classList.remove('active');
            }
        }
    };
})();