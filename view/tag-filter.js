// tag-filter.js - 标签筛选功能
class TagFilter {
    constructor() {
        this.currentTag = null;
        this.postsList = document.getElementById('postsList');
        this.popularTags = document.getElementById('popularTags');
        this.activeFilter = document.getElementById('activeFilter');
        this.currentTagName = document.getElementById('currentTagName');
        this.clearFilterBtn = document.getElementById('clearFilter');
        
        this.init();
    }

    init() {
        this.loadPopularTags();
        this.bindEvents();
    }

    // 加载热门标签
    async loadPopularTags() {
        try {
            const response = await fetch('/api/posts/tags/popular');
            let tags = [];
            
            if (response.ok) {
                const result = await response.json();
                if (result.code === 200) {
                    tags = result.data.tags;
                }
            }
            
            // 如果接口失败，使用默认标签
            if (tags.length === 0) {
                tags = this.getDefaultTags();
            }
            
            this.renderTags(tags);
        } catch (error) {
            console.error('加载热门标签失败:', error);
            this.renderTags(this.getDefaultTags());
        }
    }

    // 获取默认标签（备用）
    getDefaultTags() {
        return [
            'Mirage', 'Inferno', 'Dust2', '烟雾弹', '燃烧弹', 
            '闪光弹', '狙击', '战术', '职业选手', '准星设置'
        ];
    }

    // 渲染标签
    renderTags(tags) {
        this.popularTags.innerHTML = '';
        
        tags.forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.className = 'tag filter-tag';
            tagElement.textContent = tag;
            tagElement.setAttribute('data-tag', tag);
            
            tagElement.addEventListener('click', (e) => {
                e.stopPropagation();
                this.filterByTag(tag);
            });
            
            this.popularTags.appendChild(tagElement);
        });
    }

    // 绑定事件
    bindEvents() {
        // 清除筛选按钮
        this.clearFilterBtn.addEventListener('click', () => {
            this.clearFilter();
        });

        // 帖子中的标签点击事件（事件委托）
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('post-tag') && !e.target.classList.contains('filter-tag')) {
                e.stopPropagation();
                const tag = e.target.textContent.trim();
                this.filterByTag(tag);
            }
        });
    }

    // 按标签筛选
    filterByTag(tagName) {
        this.currentTag = tagName;
        
        // 更新UI显示当前筛选
        this.currentTagName.textContent = tagName;
        this.activeFilter.style.display = 'block';
        
        // 高亮当前选中的标签
        this.highlightActiveTag(tagName);
        
        // 触发自定义事件，通知帖子列表重新加载
        this.triggerFilterChange(tagName);
    }

    // 清除筛选
    clearFilter() {
        this.currentTag = null;
        this.activeFilter.style.display = 'none';
        
        // 移除所有标签的高亮
        this.clearTagHighlights();
        
        // 触发清除筛选事件
        this.triggerFilterChange(null);
    }

    // 高亮当前选中的标签
    highlightActiveTag(tagName) {
        // 移除所有高亮
        this.clearTagHighlights();
        
        // 为匹配的标签添加高亮类
        const allTags = document.querySelectorAll('.tag');
        allTags.forEach(tag => {
            if (tag.textContent.trim() === tagName) {
                tag.classList.add('tag-active');
            }
        });
    }

    // 清除标签高亮
    clearTagHighlights() {
        const allTags = document.querySelectorAll('.tag');
        allTags.forEach(tag => {
            tag.classList.remove('tag-active');
        });
    }

    // 触发筛选变化事件
    triggerFilterChange(tagName) {
        const event = new CustomEvent('tagFilterChanged', {
            detail: { tag: tagName }
        });
        document.dispatchEvent(event);
    }

    // 获取当前筛选标签
    getCurrentFilter() {
        return this.currentTag;
    }
}

// 初始化标签筛选功能
let tagFilter = null;
document.addEventListener('DOMContentLoaded', function() {
    tagFilter = new TagFilter();
});