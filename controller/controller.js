const MapController = (function(model, view) {
    const elements = view.getElements();

    // 绑定事件处理函数
    function _bindEvents() {
        // 地图卡片点击事件
        elements.mapsGrid.addEventListener('click', function(e) {
            const mapCard = e.target.closest('.map-card');
            if (mapCard) {
                const mapId = mapCard.getAttribute('data-map');
                _handleMapSelection(mapId);
            }
        });

        // 返回按钮点击事件
        elements.backButton.addEventListener('click', _handleBackButton);

        // 投掷物类型选择事件
        elements.nadeOptions.forEach(option => {
            option.addEventListener('click', function() {
                const type = this.getAttribute('data-type');
                _handleNadeTypeSelection(type);
            });
        });

        // 队伍选择事件
        elements.teamOptions.forEach(option => {
            option.addEventListener('click', function() {
                const team = this.getAttribute('data-team');
                _handleTeamSelection(team);
            });
        });

        // 点位名称切换事件
        elements.calloutToggle.addEventListener('click', _handleCalloutToggle);

        // 投掷物显示切换事件
        elements.nadeToggle.addEventListener('click', _handleNadeToggle);
    }

    // 处理地图选择
    function _handleMapSelection(mapId) {
        if (model.setCurrentMap(mapId)) {
            const mapInfo = model.getCurrentMap();
            view.showMapDetail(mapInfo);
            view.renderMapCanvas(mapInfo);
        }
    }

    // 处理返回按钮
    function _handleBackButton() {
        view.hideMapDetail();
    }

    // 处理投掷物类型选择
    function _handleNadeTypeSelection(type) {
        if (model.setNadeType(type)) {
            view.updateNadeSelection(type);
            // 可以在这里添加额外的地图更新逻辑
        }
    }

    // 处理队伍选择
    function _handleTeamSelection(team) {
        if (model.setTeam(team)) {
            view.updateTeamSelection(team);
            // 可以在这里添加额外的地图更新逻辑
        }
    }

    // 处理点位名称切换
    function _handleCalloutToggle() {
        const isActive = model.toggleCallouts();
        view.updateToggleState('callout', isActive);
        // 可以在这里添加额外的地图更新逻辑
    }

    // 处理投掷物显示切换
    function _handleNadeToggle() {
        const isActive = model.toggleNades();
        view.updateToggleState('nade', isActive);
        // 可以在这里添加额外的地图更新逻辑
    }

    // 初始化
    function init() {
        // 初始渲染地图列表
        const maps = model.getMapList();
        view.renderMapList(maps);
        
        // 初始渲染默认地图
        const defaultMap = model.getCurrentMap();
        view.renderMapCanvas(defaultMap);
        
        // 绑定事件
        _bindEvents();
    }

    return {
        init: init
    };
})(MapModel, MapView);