/**
 * 增强版搜索功能
 * 基于Fuse.js的模糊搜索，支持中英文搜索
 */

class EnhancedSearch {
    constructor(options) {
        this.form = options.form;
        this.input = options.input;
        this.list = options.list;
        this.resultTitle = options.resultTitle;
        this.resultTitleTemplate = options.resultTitleTemplate;
        this.data = null;
        this.fuse = null;
        
        this.init();
    }
    
    async init() {
        await this.loadData();
        this.setupFuse();
        this.bindEvents();
        this.handleInitialQuery();
    }
    
    async loadData() {
        try {
            const jsonUrl = this.form.dataset.json;
            const response = await fetch(jsonUrl);
            this.data = await response.json();
            
            // 处理内容，提取纯文本
            const parser = new DOMParser();
            this.data.forEach(item => {
                item.content = parser.parseFromString(item.content, "text/html").body.innerText;
            });
            
            console.log(`搜索数据加载成功，共 ${this.data.length} 条记录`);
        } catch (error) {
            console.error('搜索数据加载失败:', error);
        }
    }
    
    setupFuse() {
        if (!this.data) return;
        
        // Fuse.js配置
        const options = {
            keys: [
                { name: 'title', weight: 0.7 },
                { name: 'content', weight: 0.3 }
            ],
            threshold: 0.3, // 模糊搜索阈值
            distance: 1000,
            maxPatternLength: 32,
            minMatchCharLength: 1,
            includeScore: true,
            includeMatches: true
        };
        
        // 如果Fuse.js可用，使用Fuse.js
        if (typeof Fuse !== 'undefined') {
            this.fuse = new Fuse(this.data, options);
            console.log('使用 Fuse.js 进行模糊搜索');
        } else {
            console.log('Fuse.js 不可用，使用内置搜索');
        }
    }
    
    search(query) {
        if (!query.trim()) return [];
        
        if (this.fuse) {
            // 使用Fuse.js搜索
            const results = this.fuse.search(query);
            return results.map(result => ({
                ...result.item,
                score: result.score,
                matches: result.matches
            }));
        } else {
            // 回退到简单搜索
            return this.simpleSearch(query);
        }
    }
    
    simpleSearch(query) {
        const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 0);
        const results = [];
        
        this.data.forEach(item => {
            let score = 0;
            let matches = 0;
            
            keywords.forEach(keyword => {
                if (item.title.toLowerCase().includes(keyword)) {
                    score += 10;
                    matches++;
                }
                if (item.content.toLowerCase().includes(keyword)) {
                    score += 1;
                    matches++;
                }
            });
            
            if (matches > 0) {
                results.push({
                    ...item,
                    score: score,
                    matches: matches
                });
            }
        });
        
        return results.sort((a, b) => b.score - a.score);
    }
    
    highlightText(text, query) {
        if (!query) return this.escapeHtml(text);
        
        const keywords = query.split(/\s+/).filter(k => k.length > 0);
        let result = text;
        
        keywords.forEach(keyword => {
            const regex = new RegExp(`(${this.escapeRegex(keyword)})`, 'gi');
            result = result.replace(regex, '<mark>$1</mark>');
        });
        
        return this.escapeHtml(result).replace(/&lt;mark&gt;/g, '<mark>').replace(/&lt;\/mark&gt;/g, '</mark>');
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    truncateText(text, maxLength = 150) {
        if (text.length <= maxLength) return text;
        
        const truncated = text.substring(0, maxLength);
        const lastSpace = truncated.lastIndexOf(' ');
        
        if (lastSpace > 0) {
            return truncated.substring(0, lastSpace) + '...';
        }
        
        return truncated + '...';
    }
    
    renderResults(results) {
        this.list.innerHTML = '';
        
        results.forEach(item => {
            const article = document.createElement('article');
            article.className = 'search-result-item';
            
            const link = document.createElement('a');
            link.href = item.permalink;
            
            const details = document.createElement('div');
            details.className = 'article-details';
            
            const title = document.createElement('h2');
            title.className = 'article-title';
            title.innerHTML = this.highlightText(item.title, this.input.value);
            
            const preview = document.createElement('section');
            preview.className = 'article-preview';
            const truncatedContent = this.truncateText(item.content);
            preview.innerHTML = this.highlightText(truncatedContent, this.input.value);
            
            const meta = document.createElement('div');
            meta.className = 'article-meta';
            if (item.date) {
                const date = new Date(item.date);
                meta.textContent = `发布时间: ${date.toLocaleDateString('zh-CN')}`;
            }
            
            details.appendChild(title);
            details.appendChild(preview);
            details.appendChild(meta);
            link.appendChild(details);
            
            if (item.image) {
                const imageDiv = document.createElement('div');
                imageDiv.className = 'article-image';
                const img = document.createElement('img');
                img.src = item.image;
                img.loading = 'lazy';
                img.alt = item.title;
                imageDiv.appendChild(img);
                link.appendChild(imageDiv);
            }
            
            article.appendChild(link);
            this.list.appendChild(article);
        });
    }
    
    updateResultTitle(count, time) {
        if (this.resultTitle && this.resultTitleTemplate) {
            this.resultTitle.textContent = this.resultTitleTemplate
                .replace('#PAGES_COUNT', count)
                .replace('#TIME_SECONDS', time);
        }
    }
    
    performSearch(query) {
        const startTime = performance.now();
        const results = this.search(query);
        const endTime = performance.now();
        const duration = ((endTime - startTime) / 1000).toFixed(3);
        
        this.renderResults(results);
        this.updateResultTitle(results.length, duration);
        
        console.log(`搜索完成: "${query}" 找到 ${results.length} 条结果，耗时 ${duration} 秒`);
    }
    
    bindEvents() {
        let searchTimer = null;
        
        const handleInput = () => {
            const query = this.input.value.trim();
            
            // 防抖处理
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => {
                if (query) {
                    this.performSearch(query);
                    this.updateURL(query);
                } else {
                    this.clearResults();
                }
            }, 300);
        };
        
        this.input.addEventListener('input', handleInput);
        this.input.addEventListener('compositionend', handleInput);
        
        // 表单提交处理
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            const query = this.input.value.trim();
            if (query) {
                this.performSearch(query);
                this.updateURL(query);
            }
        });
        
        // 浏览器历史记录处理
        window.addEventListener('popstate', () => {
            this.handleInitialQuery();
        });
    }
    
    updateURL(keyword) {
        const url = new URL(window.location);
        if (keyword) {
            url.searchParams.set('keyword', keyword);
        } else {
            url.searchParams.delete('keyword');
        }
        window.history.replaceState({}, '', url.toString());
    }
    
    handleInitialQuery() {
        const params = new URLSearchParams(window.location.search);
        const keyword = params.get('keyword');
        
        if (keyword) {
            this.input.value = keyword;
            this.performSearch(keyword);
        } else {
            this.clearResults();
        }
    }
    
    clearResults() {
        this.list.innerHTML = '';
        if (this.resultTitle) {
            this.resultTitle.textContent = '';
        }
    }
}

// 搜索功能初始化
document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('.search-form');
    const input = form?.querySelector('input[name="keyword"]');
    const list = document.querySelector('.search-result--list');
    const title = document.querySelector('.search-result--title');
    
    if (form && input && list) {
        new EnhancedSearch({
            form: form,
            input: input,
            list: list,
            resultTitle: title,
            resultTitleTemplate: window.searchResultTitleTemplate || '#PAGES_COUNT 个结果 （用时 #TIME_SECONDS 秒）'
        });
    } else {
        console.warn('搜索功能初始化失败: 缺少必要的DOM元素');
    }
});