/**
 * 图片放大功能
 * 支持点击放大、缩放、拖拽、键盘操作等
 */
(function() {
    'use strict';

    class ImageZoom {
        constructor(options = {}) {
            this.options = {
                selector: '.mn-prose img',
                enableKeyboard: true,
                enableTouch: true,
                enableDrag: true,
                maxZoomLevel: 3,
                minZoomLevel: 1,
                zoomStep: 0.5,
                animationDuration: 300,
                showInfo: true,
                ...options
            };

            this.isOpen = false;
            this.currentZoom = 1;
            this.isDragging = false;
            this.dragStart = { x: 0, y: 0 };
            this.imagePosition = { x: 0, y: 0 };

            this.init();
        }

        init() {
            this.createOverlay();
            this.bindEvents();
            this.setupImages();
        }

        createOverlay() {
            // 创建遮罩层
            this.overlay = document.createElement('div');
            this.overlay.className = 'image-zoom-overlay';
            
            // 创建图片容器
            this.container = document.createElement('div');
            this.container.className = 'image-zoom-container';

            // 创建图片元素
            this.zoomedImage = document.createElement('img');
            this.zoomedImage.className = 'image-zoom-img';

            // 创建关闭按钮
            this.closeBtn = document.createElement('div');
            this.closeBtn.className = 'image-zoom-close';
            this.closeBtn.innerHTML = '×';
            this.closeBtn.setAttribute('aria-label', '关闭图片');
            this.closeBtn.setAttribute('role', 'button');
            this.closeBtn.setAttribute('tabindex', '0');

            // 创建控制按钮
            this.controls = document.createElement('div');
            this.controls.className = 'image-zoom-controls';

            this.zoomInBtn = document.createElement('div');
            this.zoomInBtn.className = 'image-zoom-control-btn zoom-in';
            this.zoomInBtn.innerHTML = '+';
            this.zoomInBtn.setAttribute('aria-label', '放大');
            this.zoomInBtn.setAttribute('role', 'button');
            this.zoomInBtn.setAttribute('tabindex', '0');

            this.zoomOutBtn = document.createElement('div');
            this.zoomOutBtn.className = 'image-zoom-control-btn zoom-out';
            this.zoomOutBtn.innerHTML = '−';
            this.zoomOutBtn.setAttribute('aria-label', '缩小');
            this.zoomOutBtn.setAttribute('role', 'button');
            this.zoomOutBtn.setAttribute('tabindex', '0');

            this.resetBtn = document.createElement('div');
            this.resetBtn.className = 'image-zoom-control-btn reset';
            this.resetBtn.innerHTML = '⌂';
            this.resetBtn.setAttribute('aria-label', '重置');
            this.resetBtn.setAttribute('role', 'button');
            this.resetBtn.setAttribute('tabindex', '0');

            this.controls.appendChild(this.zoomInBtn);
            this.controls.appendChild(this.zoomOutBtn);
            this.controls.appendChild(this.resetBtn);

            // 创建信息面板
            if (this.options.showInfo) {
                this.info = document.createElement('div');
                this.info.className = 'image-zoom-info';
                
                this.imageTitle = document.createElement('div');
                this.imageTitle.className = 'image-title';
                
                this.imageMeta = document.createElement('div');
                this.imageMeta.className = 'image-meta';
                
                this.info.appendChild(this.imageTitle);
                this.info.appendChild(this.imageMeta);
            }

            // 组装元素
            this.container.appendChild(this.zoomedImage);
            this.container.appendChild(this.closeBtn);
            this.container.appendChild(this.controls);
            if (this.options.showInfo) {
                this.container.appendChild(this.info);
            }
            this.overlay.appendChild(this.container);

            // 添加到页面
            document.body.appendChild(this.overlay);
        }

        setupImages() {
            const images = document.querySelectorAll(this.options.selector);
            images.forEach(img => {
                // 设置cursor样式
                img.style.cursor = 'zoom-in';
                
                // 添加点击事件
                img.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.openImage(img);
                });

                // 添加键盘支持
                img.setAttribute('tabindex', '0');
                img.setAttribute('role', 'button');
                img.setAttribute('aria-label', '点击放大图片');
                
                img.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        this.openImage(img);
                    }
                });
            });
        }

        bindEvents() {
            // 关闭按钮事件
            this.closeBtn.addEventListener('click', () => this.closeImage());
            this.closeBtn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.closeImage();
                }
            });

            // 遮罩层点击关闭
            this.overlay.addEventListener('click', (e) => {
                if (e.target === this.overlay) {
                    this.closeImage();
                }
            });

            // 缩放控制
            this.zoomInBtn.addEventListener('click', () => this.zoomIn());
            this.zoomOutBtn.addEventListener('click', () => this.zoomOut());
            this.resetBtn.addEventListener('click', () => this.resetZoom());

            // 键盘事件
            if (this.options.enableKeyboard) {
                document.addEventListener('keydown', (e) => {
                    if (!this.isOpen) return;

                    switch (e.key) {
                        case 'Escape':
                            this.closeImage();
                            break;
                        case '+':
                        case '=':
                            this.zoomIn();
                            break;
                        case '-':
                        case '_':
                            this.zoomOut();
                            break;
                        case '0':
                            this.resetZoom();
                            break;
                    }
                });
            }

            // 鼠标滚轮缩放
            this.zoomedImage.addEventListener('wheel', (e) => {
                e.preventDefault();
                if (e.deltaY < 0) {
                    this.zoomIn();
                } else {
                    this.zoomOut();
                }
            });

            // 拖拽功能
            if (this.options.enableDrag) {
                this.setupDragEvents();
            }

            // 触摸设备支持
            if (this.options.enableTouch) {
                this.setupTouchEvents();
            }
        }

        setupDragEvents() {
            this.zoomedImage.addEventListener('mousedown', (e) => {
                if (this.currentZoom <= 1) return;
                
                this.isDragging = true;
                this.dragStart.x = e.clientX - this.imagePosition.x;
                this.dragStart.y = e.clientY - this.imagePosition.y;
                
                this.zoomedImage.style.cursor = 'grabbing';
                e.preventDefault();
            });

            document.addEventListener('mousemove', (e) => {
                if (!this.isDragging || this.currentZoom <= 1) return;
                
                this.imagePosition.x = e.clientX - this.dragStart.x;
                this.imagePosition.y = e.clientY - this.dragStart.y;
                
                this.updateImageTransform();
            });

            document.addEventListener('mouseup', () => {
                if (this.isDragging) {
                    this.isDragging = false;
                    this.zoomedImage.style.cursor = this.currentZoom > 1 ? 'grab' : 'zoom-out';
                }
            });
        }

        setupTouchEvents() {
            let lastTouchDistance = 0;
            let initialZoom = 1;

            this.zoomedImage.addEventListener('touchstart', (e) => {
                if (e.touches.length === 2) {
                    // 双指开始
                    const touch1 = e.touches[0];
                    const touch2 = e.touches[1];
                    lastTouchDistance = Math.sqrt(
                        Math.pow(touch2.clientX - touch1.clientX, 2) +
                        Math.pow(touch2.clientY - touch1.clientY, 2)
                    );
                    initialZoom = this.currentZoom;
                } else if (e.touches.length === 1 && this.currentZoom > 1) {
                    // 单指拖拽
                    const touch = e.touches[0];
                    this.isDragging = true;
                    this.dragStart.x = touch.clientX - this.imagePosition.x;
                    this.dragStart.y = touch.clientY - this.imagePosition.y;
                }
                e.preventDefault();
            });

            this.zoomedImage.addEventListener('touchmove', (e) => {
                if (e.touches.length === 2) {
                    // 双指缩放
                    const touch1 = e.touches[0];
                    const touch2 = e.touches[1];
                    const currentDistance = Math.sqrt(
                        Math.pow(touch2.clientX - touch1.clientX, 2) +
                        Math.pow(touch2.clientY - touch1.clientY, 2)
                    );
                    
                    if (lastTouchDistance > 0) {
                        const scale = currentDistance / lastTouchDistance;
                        const newZoom = Math.max(
                            this.options.minZoomLevel,
                            Math.min(this.options.maxZoomLevel, initialZoom * scale)
                        );
                        this.setZoom(newZoom);
                    }
                } else if (e.touches.length === 1 && this.isDragging) {
                    // 单指拖拽
                    const touch = e.touches[0];
                    this.imagePosition.x = touch.clientX - this.dragStart.x;
                    this.imagePosition.y = touch.clientY - this.dragStart.y;
                    this.updateImageTransform();
                }
                e.preventDefault();
            });

            this.zoomedImage.addEventListener('touchend', (e) => {
                this.isDragging = false;
                if (e.touches.length === 0) {
                    lastTouchDistance = 0;
                }
            });
        }

        openImage(img) {
            this.currentImage = img;
            this.isOpen = true;
            
            // 设置图片源
            this.zoomedImage.src = img.src;
            this.zoomedImage.alt = img.alt || '';
            
            // 重置状态
            this.resetZoom();
            
            // 更新信息面板
            if (this.options.showInfo && this.info) {
                this.updateImageInfo(img);
            }
            
            // 显示遮罩层
            this.overlay.classList.add('active');
            
            // 禁止页面滚动
            document.body.style.overflow = 'hidden';
            
            // 焦点管理
            this.closeBtn.focus();
        }

        closeImage() {
            this.isOpen = false;
            this.overlay.classList.remove('active');
            
            // 恢复页面滚动
            document.body.style.overflow = '';
            
            // 重置状态
            setTimeout(() => {
                this.resetZoom();
            }, this.options.animationDuration);
            
            // 返回焦点到原图片
            if (this.currentImage) {
                this.currentImage.focus();
            }
        }

        zoomIn() {
            const newZoom = Math.min(
                this.options.maxZoomLevel,
                this.currentZoom + this.options.zoomStep
            );
            this.setZoom(newZoom);
        }

        zoomOut() {
            const newZoom = Math.max(
                this.options.minZoomLevel,
                this.currentZoom - this.options.zoomStep
            );
            this.setZoom(newZoom);
        }

        setZoom(zoom) {
            this.currentZoom = zoom;
            this.updateImageTransform();
            
            // 更新鼠标样式
            if (this.currentZoom > 1) {
                this.zoomedImage.style.cursor = 'grab';
            } else {
                this.zoomedImage.style.cursor = 'zoom-out';
                // 重置位置
                this.imagePosition = { x: 0, y: 0 };
            }
            
            // 更新按钮状态
            this.zoomInBtn.style.opacity = this.currentZoom >= this.options.maxZoomLevel ? '0.5' : '1';
            this.zoomOutBtn.style.opacity = this.currentZoom <= this.options.minZoomLevel ? '0.5' : '1';
        }

        resetZoom() {
            this.currentZoom = 1;
            this.imagePosition = { x: 0, y: 0 };
            this.updateImageTransform();
            this.zoomedImage.style.cursor = 'zoom-out';
            
            // 重置按钮状态
            this.zoomInBtn.style.opacity = '1';
            this.zoomOutBtn.style.opacity = '0.5';
        }

        updateImageTransform() {
            this.zoomedImage.style.transform = 
                `scale(${this.currentZoom}) translate(${this.imagePosition.x / this.currentZoom}px, ${this.imagePosition.y / this.currentZoom}px)`;
        }

        updateImageInfo(img) {
            if (!this.options.showInfo || !this.info) return;
            
            // 获取图片信息
            const title = img.alt || img.title || '图片';
            const naturalWidth = img.naturalWidth || 0;
            const naturalHeight = img.naturalHeight || 0;
            const fileSize = this.getImageSize(img);
            
            this.imageTitle.textContent = title;
            
            let metaInfo = '';
            if (naturalWidth && naturalHeight) {
                metaInfo += `${naturalWidth} × ${naturalHeight}`;
            }
            if (fileSize) {
                metaInfo += metaInfo ? ` • ${fileSize}` : fileSize;
            }
            
            this.imageMeta.textContent = metaInfo;
        }

        getImageSize(img) {
            // 尝试从HTTP头获取文件大小（需要服务器支持）
            try {
                const xhr = new XMLHttpRequest();
                xhr.open('HEAD', img.src, false);
                xhr.send();
                
                const size = xhr.getResponseHeader('Content-Length');
                if (size) {
                    return this.formatFileSize(parseInt(size));
                }
            } catch (e) {
                // 忽略错误，继续执行
            }
            
            return null;
        }

        formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            
            return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
        }

        // 公共方法
        destroy() {
            if (this.overlay && this.overlay.parentNode) {
                this.overlay.parentNode.removeChild(this.overlay);
            }
        }

        refresh() {
            this.setupImages();
        }
    }

    // 自动初始化
    function initImageZoom() {
        // 检查是否已经初始化
        if (window.imageZoomInstance) {
            window.imageZoomInstance.refresh();
            return;
        }

        // 等待DOM加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                window.imageZoomInstance = new ImageZoom();
            });
        } else {
            window.imageZoomInstance = new ImageZoom();
        }
    }

    // 检测是否支持现代浏览器功能
    function isSupportedBrowser() {
        return !!(
            document.querySelector &&
            document.addEventListener &&
            window.addEventListener &&
            document.createElement
        );
    }

    // 初始化
    if (isSupportedBrowser()) {
        initImageZoom();
    }

    // 导出到全局作用域
    window.ImageZoom = ImageZoom;

})();