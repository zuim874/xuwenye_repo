// community-posts.js - 帖子数据获取与渲染逻辑（带分页功能）- 完整版
document.addEventListener('DOMContentLoaded', function() {
    // 分页相关变量
    let currentPage = 1;
    let totalPages = 1;
    const postsPerPage = 5; // 每页显示5条帖子
    
    // 获取DOM元素
    const postsList = document.getElementById('postsList');
    const paginationContainer = document.getElementById('paginationContainer');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const firstPageBtn = document.getElementById('firstPage');
    const lastPageBtn = document.getElementById('lastPage');
    const pageNumbers = document.getElementById('pageNumbers');
    const pageInfo = document.getElementById('pageInfo');
    
    // 新增：跳转相关元素
    const pageInput = document.getElementById('pageInput');
    const jumpBtn = document.getElementById('jumpBtn');

    // 初始化：加载第一页帖子
    fetchPosts(currentPage);

    // 分页按钮事件监听
    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            fetchPosts(currentPage);
        }
    });

    nextPageBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            fetchPosts(currentPage);
        }
    });

    // 新增：第一页按钮事件
    firstPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage = 1;
            fetchPosts(currentPage);
        }
    });

    // 新增：最后一页按钮事件
    lastPageBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage = totalPages;
            fetchPosts(currentPage);
        }
    });

    // 新增：跳转按钮事件
    jumpBtn.addEventListener('click', () => {
        const targetPage = parseInt(pageInput.value);
        if (targetPage && targetPage >= 1 && targetPage <= totalPages) {
            currentPage = targetPage;
            fetchPosts(currentPage);
        } else {
            alert(`请输入有效的页码（1-${totalPages}）`);
        }
    });

    // 新增：输入框回车事件
    pageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            jumpBtn.click();
        }
    });

    // 从后端API获取帖子数据（带分页参数）
    async function fetchPosts(page = 1) {
        // 显示加载状态
        setLoadingState();
        
        // 隐藏分页控件直到数据加载完成
        paginationContainer.style.display = 'none';

        try {
            const response = await fetch(`/api/posts?page=${page}&limit=${postsPerPage}`);
            if (!response.ok) {
                throw new Error(`HTTP错误！状态码：${response.status}`);
            }

            const result = await response.json();

            // 处理后端响应
            if (result.code === 200 && Array.isArray(result.data.posts)) {
                // 更新分页信息
                updatePaginationInfo(result.data.pagination);
                
                if (result.data.posts.length > 0) {
                    renderPosts(result.data.posts);
                    // 显示分页控件
                    paginationContainer.style.display = 'block';
                } else {
                    setEmptyState();
                }
            } else {
                setEmptyState();
            }
        } catch (error) {
            console.error('获取帖子失败：', error);
            setErrorState();
        }
    }

    // 更新分页信息
    function updatePaginationInfo(pagination) {
        if (!pagination) return;
        
        currentPage = pagination.page || 1;
        totalPages = pagination.totalPages || 1;
        
        // 更新页面信息文本
        pageInfo.textContent = `第 ${currentPage} 页，共 ${totalPages} 页，总计 ${pagination.total || 0} 条帖子`;
        
        // 更新按钮状态
        prevPageBtn.disabled = currentPage <= 1;
        nextPageBtn.disabled = currentPage >= totalPages;
        firstPageBtn.disabled = currentPage <= 1;
        lastPageBtn.disabled = currentPage >= totalPages;
        
        // 更新跳转输入框的范围和值
        pageInput.max = totalPages;
        pageInput.value = currentPage;
        
        // 渲染页码按钮
        renderPageNumbers();
    }

    // 渲染页码按钮
    function renderPageNumbers() {
        pageNumbers.innerHTML = '';
        
        // 显示最多7个页码按钮
        let startPage = Math.max(1, currentPage - 3);
        let endPage = Math.min(totalPages, currentPage + 3);
        
        // 调整显示范围，确保显示7个按钮（如果总页数足够）
        if (endPage - startPage < 6) {
            if (startPage === 1) {
                endPage = Math.min(totalPages, startPage + 6);
            } else {
                startPage = Math.max(1, endPage - 6);
            }
        }
        
        // 添加第一页和省略号
        if (startPage > 1) {
            addPageNumber(1);
            if (startPage > 2) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.className = 'page-number';
                ellipsis.style.cursor = 'default';
                pageNumbers.appendChild(ellipsis);
            }
        }
        
        // 添加页码按钮
        for (let i = startPage; i <= endPage; i++) {
            addPageNumber(i);
        }
        
        // 添加最后一页和省略号
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.className = 'page-number';
                ellipsis.style.cursor = 'default';
                pageNumbers.appendChild(ellipsis);
            }
            addPageNumber(totalPages);
        }
    }

    // 添加单个页码按钮
    function addPageNumber(page) {
        const pageBtn = document.createElement('div');
        pageBtn.className = `page-number ${page === currentPage ? 'active' : ''}`;
        pageBtn.textContent = page;
        pageBtn.addEventListener('click', () => {
            if (page !== currentPage) {
                currentPage = page;
                fetchPosts(page);
            }
        });
        pageNumbers.appendChild(pageBtn);
    }

    // 渲染帖子列表
    function renderPosts(posts) {
        postsList.innerHTML = '';

        posts.forEach(post => {
            const postCard = document.createElement('div');
            postCard.className = 'post-card';

            // 格式化日期、处理标签
            const formattedDate = formatRelativeDate(post.updated_at);
            const tags = post.tags || [];
            const authorId = post.authorId;
            const authorName = post.author_name || '匿名用户';
            const authorInitial = getAuthorInitials(authorName);

            postCard.innerHTML = `
                <div class="post-header">
                    <div class="post-author">
                        <div class="author-avatar clickable-avatar" data-author-id="${authorId}" title="查看作者主页">
                            ${authorInitial}
                        </div>
                        <div class="author-info">
                            <h4>${escapeHtml(authorName)}</h4>
                            <div class="post-date">${formattedDate}</div>
                        </div>
                    </div>
                    <div class="post-tags">
                        ${tags.map(tag => `<span class="post-tag">${tag.trim()}</span>`).join('')}
                    </div>
                </div>
                <div class="post-content">
                    <h3>${escapeHtml(post.title)}</h3>
                    <p>${escapeHtml(post.content)}</p>
                </div>
                <div class="post-stats">
                    <div class="post-stat">👍 ${post.like_count || 0}</div>
                    <div class="post-stat">💬 ${post.comment_count || 0}</div>
                    <div class="post-stat">👁 ${post.view_count || 0}</div>
                </div>
                ${post.video_url ? `<div class="post-video">
                    <video src="${post.video_url}" controls></video>
                </div>` : ''}
            `;

            // 在渲染帖子后，添加头像点击事件绑定
            postCard.addEventListener('click', () => {
                window.location.href = `post-detail.html?id=${post.id}`;
            });

            // 添加头像点击事件
            const avatarEl = postCard.querySelector('.author-avatar');
            avatarEl.style.cursor = 'pointer';
            avatarEl.addEventListener('click', function(e) {
                e.stopPropagation(); // 阻止事件冒泡，避免触发帖子点击
                window.location.href = `author.html?id=${authorId}`;
            });

            // 帖子点击事件
            postCard.addEventListener('click', () => {
                window.location.href = `post-detail.html?id=${post.id}`;
            });

            postsList.appendChild(postCard);

            // 异步加载头像
            renderUserAvatar(avatarEl, authorId, authorName);
        });
    }

    // 辅助函数：显示加载状态
    function setLoadingState() {
        postsList.innerHTML = '<div class="loading-indicator">加载中...</div>';
    }

    // 辅助函数：显示空数据状态
    function setEmptyState() {
        postsList.innerHTML = '<div class="no-posts">暂无帖子，快来发布第一条内容吧～</div>';
        paginationContainer.style.display = 'none';
    }

    // 辅助函数：显示加载失败状态
    function setErrorState() {
        postsList.innerHTML = '<div class="error-message">加载失败，请刷新页面重试</div>';
        paginationContainer.style.display = 'none';
    }

    // 辅助函数：获取作者姓名首字母（头像兜底）
    function getAuthorInitials(name) {
        if (!name) return '?';
        return name.trim().charAt(0).toUpperCase();
    }

    // 辅助函数：格式化相对时间
    function formatRelativeDate(dateString) {
        if (!dateString) return '未知时间';
        const pureDateTime = dateString.slice(0, 19).replace('T', ' ');
        const reg = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
        return reg.test(pureDateTime) ? pureDateTime : '无效时间';
    }

    // 辅助函数：HTML转义（防止XSS）
    function escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
});