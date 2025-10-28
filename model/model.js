const MapModel = (function() {
    // 私有数据
    const _mapData = {
        dust2: { 
            name: 'Dust II', 
            color: '#8b4513',
            description: '经典沙漠地图，攻防平衡'
        },
        mirage: { 
            name: 'Mirage', 
            color: '#b8860b',
            description: '中东风格城市地图'
        },
        inferno: { 
            name: 'Inferno', 
            color: '#8b0000',
            description: '意大利风格小镇'
        },
        nuke: { 
            name: 'Nuke', 
            color: '#2f4f4f',
            description: '核电站主题地图'
        },
        ancient: { 
            name: 'Ancient', 
            color: '#228b22',
            description: '丛林遗迹主题地图'
        },
        overpass: { 
            name: 'Overpass', 
            color: '#4682b4',
            description: '柏林运河主题地图'
        }
    };

    let _currentMap = 'dust2';
    let _currentNadeType = 'smoke';
    let _currentTeam = 'all';
    let _showCallouts = true;
    let _showNades = false;

    // 公共方法
    return {
        // 获取所有地图数据
        getMapList: function() {
            return _mapData;
        },

        // 获取当前地图
        getCurrentMap: function() {
            return _mapData[_currentMap];
        },

        // 设置当前地图
        setCurrentMap: function(mapId) {
            if (_mapData[mapId]) {
                _currentMap = mapId;
                return true;
            }
            return false;
        },

        // 获取当前投掷物类型
        getCurrentNadeType: function() {
            return _currentNadeType;
        },

        // 设置投掷物类型
        setNadeType: function(type) {
            const validTypes = ['smoke', 'flash', 'molotov', 'grenade'];
            if (validTypes.includes(type)) {
                _currentNadeType = type;
                return true;
            }
            return false;
        },

        // 获取当前队伍
        getCurrentTeam: function() {
            return _currentTeam;
        },

        // 设置队伍
        setTeam: function(team) {
            const validTeams = ['all', 'ct', 't'];
            if (validTeams.includes(team)) {
                _currentTeam = team;
                return true;
            }
            return false;
        },

        // 切换点位名称显示状态
        toggleCallouts: function() {
            _showCallouts = !_showCallouts;
            return _showCallouts;
        },

        // 切换投掷物显示状态
        toggleNades: function() {
            _showNades = !_showNades;
            return _showNades;
        },

        // 获取显示状态
        getDisplaySettings: function() {
            return {
                showCallouts: _showCallouts,
                showNades: _showNades
            };
        }
    };
})();