// 保持Vue实例的核心功能不变，只添加一些增强UI体验的方法
new Vue({
    el: '#app',
    data: {
        currentTime: '',
        records: [],
        mainTitle: '',
        showDeleteModal: false,
        showClearModal: false,
        deleteIndex: -1,
        timeFormatIndex: 0, // 0: 详细时间, 1: 分钟, 2: 就近分钟, 3: 就近整点
        showSaveView: false,
        isReversed: false,
        timer: null,
        // 添加UI相关状态
        styleIndex: 0, // 样式索引，用于更换样式
        bgImages: [
            'timeline,journey',
            'clock,time',
            'diary,notes',
            'memory,moments',
            'history,path'
        ]
    },
    computed: {
        displayRecords() {
            // 根据排序设置返回记录
            return this.isReversed 
                ? [...this.records].reverse() 
                : [...this.records];
        }
    },
    watch: {
        showSaveView(newVal) {
            if (newVal) {
                // 当切换到保存视图时，初始化背景样式
                this.$nextTick(() => {
                    this.initBackgroundStyle();
                });
            } else {
                // 当从保存视图返回时，恢复主界面样式
                this.$nextTick(() => {
                    this.resetMainViewStyle();
                });
            }
        },
        
        // 监听records数组变化，确保界面布局正确
        records: {
            handler() {
                // 记录数量变化时，确保界面布局正确
                this.$nextTick(() => {
                    this.adjustMainViewLayout();
                });
            },
            deep: true
        }
    },
    created() {
        this.updateCurrentTime();
        this.timer = setInterval(this.updateCurrentTime, 1000);
        this.loadRecords();
    },
    beforeDestroy() {
        if (this.timer) {
            clearInterval(this.timer);
        }
        
        // 移除窗口大小调整事件监听
        window.removeEventListener('resize', this.handleResize);
    },
    mounted() {
        // 加载记录
        this.loadRecords();
        
        // 立即设置主标题
        if (!this.mainTitle && this.records.length > 0) {
            this.setDefaultMainTitle();
        }
        
        // 确保界面布局正确，使用延迟以确保DOM已更新
        this.$nextTick(() => {
            setTimeout(() => {
                this.adjustMainViewLayout();
            }, 300);
        });
        
        // 初始化背景样式
        this.$nextTick(() => {
            // 确保 DOM 已更新
            setTimeout(() => {
                this.initBackgroundStyle();
                
                // 再次调整主视图布局，确保记录项正确显示
                if (!this.showSaveView) {
                    this.adjustMainViewLayout();
                }
            }, 500);
        });
        
        // 添加窗口调整大小时的处理
        window.addEventListener('resize', this.handleResize);
    },
    methods: {
        updateCurrentTime() {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            this.currentTime = `${hours}:${minutes}:${seconds}`;
            
            // 如果没有主标题且有记录，则设置默认标题
            if (!this.mainTitle && this.records.length > 0) {
                this.setDefaultMainTitle();
            }
        },
        
        setDefaultMainTitle() {
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth() + 1;
            const day = now.getDate();
            this.mainTitle = `${year}年${month}月${day}日的一件小事`;
        },
        
        addRecord() {
            const now = new Date();
            let title = '开始';
            
            // 如果已有记录，则设置为"事件X"
            if (this.records.length > 0) {
                // 获取一个不重复的事件名称
                let eventNum = this.records.length + 1;
                title = `事件${eventNum}`;
                
                // 检查是否重名，如果重名则递增数字直到不重名
                while (this.hasEventWithTitle(title)) {
                    eventNum++;
                    title = `事件${eventNum}`;
                }
            } else {
                // 第一条记录时设置默认主标题
                this.setDefaultMainTitle();
            }
            
            this.records.push({
                time: now,
                title: title
            });
            
            this.saveRecords();
            
            // 添加记录后确保滚动位置正确
            this.$nextTick(() => {
                setTimeout(() => {
                    // 确保新记录可见
                    const recordList = document.querySelector('.record-list');
                    const allRecords = recordList ? recordList.querySelectorAll('.record-item') : [];
                    
                    if (this.records.length === 1) {
                        // 如果是第一条记录，特别处理，确保其完全可见
                        if (recordList) {
                            recordList.scrollTop = 0; // 首先重置滚动位置
                            // 应用我们的布局调整逻辑
                            this.adjustMainViewLayout();
                        }
                    } else {
                        // 对于后续记录，滚动到最新添加的记录
                        const newRecord = allRecords.length > 0 ? allRecords[allRecords.length - 1] : null;
                        
                        if (newRecord && recordList) {
                            // 获取头部区域高度
                            const header = document.querySelector('.header');
                            const headerHeight = header ? header.offsetHeight : 0;
                            
                            // 滚动到新记录位置
                            const newRecordTop = newRecord.offsetTop;
                            // 减少额外空间
                            recordList.scrollTop = Math.max(0, newRecordTop - headerHeight - 20);
                        }
                    }
                }, 200); // 保持延长的等待时间
            });
        },
        
        // 检查是否已存在同名事件
        hasEventWithTitle(title) {
            return this.records.some(record => record.title === title);
        },
        
        editRecordTitle(index) {
            const newTitle = prompt('请输入记录标题', this.records[index].title);
            if (newTitle !== null) {
                this.records[index].title = newTitle;
                this.saveRecords();
            }
        },
        
        editMainTitle() {
            const newTitle = prompt('请输入标题', this.mainTitle);
            if (newTitle !== null) {
                this.mainTitle = newTitle;
                localStorage.setItem('mainTitle', this.mainTitle);
            }
        },
        
        confirmDelete(index) {
            this.deleteIndex = index;
            this.showDeleteModal = true;
        },
        
        deleteRecord() {
            if (this.deleteIndex >= 0 && this.deleteIndex < this.records.length) {
                this.records.splice(this.deleteIndex, 1);
                this.saveRecords();
            }
            this.showDeleteModal = false;
            this.deleteIndex = -1;
            
            // 如果删除后没有记录，清空主标题
            if (this.records.length === 0) {
                this.mainTitle = '';
                localStorage.removeItem('mainTitle');
            }
        },
        
        confirmClearAll() {
            this.showClearModal = true;
        },
        
        clearAllRecords() {
            this.records = [];
            this.mainTitle = '';
            localStorage.removeItem('records');
            localStorage.removeItem('mainTitle');
            this.showClearModal = false;
        },
        
        toggleTimeFormat() {
            this.timeFormatIndex = (this.timeFormatIndex + 1) % 4;
            localStorage.setItem('timeFormatIndex', this.timeFormatIndex);
        },
        
        formatTime(time) {
            const date = new Date(time);
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            
            switch (this.timeFormatIndex) {
                case 0: // 详细时间 (hh:mm:ss)
                    return `${hours}:${minutes}:${seconds}`;
                    
                case 1: // 分钟 (hh:mm)
                    return `${hours}:${minutes}`;
                    
                case 2: // 就近分钟 (5分钟间隔)
                    const nearestMinute = Math.round(date.getMinutes() / 5) * 5;
                    const adjustedMinute = String(nearestMinute % 60).padStart(2, '0');
                    const adjustedHours = nearestMinute === 60 
                        ? String((date.getHours() + 1) % 24).padStart(2, '0') 
                        : hours;
                    return `${adjustedHours}:${adjustedMinute}`;
                    
                case 3: // 就近整点 (30分钟间隔)
                    const isNearNextHour = date.getMinutes() >= 30;
                    const roundedHours = isNearNextHour 
                        ? String((date.getHours() + 1) % 24).padStart(2, '0') 
                        : hours;
                    const roundedMinutes = isNearNextHour ? '00' : '30';
                    return `${roundedHours}:${roundedMinutes}`;
                    
                default:
                    return `${hours}:${minutes}:${seconds}`;
            }
        },
        
        toggleOrder() {
            this.isReversed = !this.isReversed;
        },
        
        // 修改saveToPhone方法
        saveToPhone() {
            // 选择整个记录区域
            const recordsArea = document.querySelector('.save-record-list');
            const contentArea = recordsArea.querySelector('.bg-white');
            
            // 增加标题区域的上边距，防止被标题栏遮挡
            const titleElement = contentArea.querySelector('h1, h2, h3') || contentArea.firstElementChild;
            if (titleElement) {
                const originalPadding = titleElement.style.paddingTop;
                titleElement.style.paddingTop = '2rem'; // 增加上边距
            }
            
            // 确保底部文字已加入
            this.refreshFooterText();
            
            // 添加加载提示
            const loadingEl = document.createElement('div');
            loadingEl.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
            loadingEl.innerHTML = '<div class="bg-white p-4 rounded-lg"><i class="fas fa-spinner fa-spin mr-2"></i>正在生成图片...</div>';
            document.body.appendChild(loadingEl);
            
            // 确保样式已应用，并设置合适的尺寸
            setTimeout(() => {
                // 固定内容宽度，防止尺寸偏移
                saveArea.style.width = (saveArea.offsetWidth) + 'px';
                
                // 计算实际内容高度，避免过多空白
                const contentHeight = saveArea.scrollHeight;
                
                html2canvas(saveArea, {
                    backgroundColor: window.getComputedStyle(saveArea).backgroundColor, // 使用元素的背景色
                    useCORS: true,
                    scale: 2, // 提高图片清晰度
                    logging: false,
                    allowTaint: true,
                    height: contentHeight,
                    width: saveArea.offsetWidth,
                    ignoreElements: (element) => {
                        return element.classList.contains('ignore');
                    }
                }).then(canvas => {
                    // 获取第一条记录的标题作为文件名
                    let fileName = '记录';
                    if (this.records.length > 0) {
                        // 使用第一条记录的标题
                        const recordsToUse = this.isReversed ? [...this.records].reverse() : this.records;
                        fileName = `记录-${recordsToUse[0].title}`;
                    }
                    
                    const link = document.createElement('a');
                    link.download = `${fileName}.png`;
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                    
                    // 移除加载提示
                    document.body.removeChild(loadingEl);
                    
                    // 恢复容器宽度
                    saveArea.style.width = '';
                }).catch(err => {
                    console.error('保存图片失败', err);
                    alert('保存图片失败，请重试');
                    
                    // 移除加载提示
                    document.body.removeChild(loadingEl);
                    
                    // 恢复容器宽度
                    saveArea.style.width = '';
                });
            }, 50); // 短暂延迟以确保样式应用
        },
        
        changeStyle() {
            this.styleIndex = (this.styleIndex + 1) % 5;
            
            // 确保保存视图容器存在
            const container = document.querySelector('.save-record-list');
            if (!container) {
                console.error('保存视图容器不存在');
                return;
            }
            
            // 获取记录容器和标题区域
            const contentArea = container.querySelector('.bg-white');
            const headerArea = contentArea ? contentArea.querySelector('.bg-indigo-50') : null;
            
            if (!contentArea) {
                console.error('记录内容容器不存在');
                return;
            }
            
            // 计算目标高度（9:14比例，即宽度的约1.556倍）
            const containerWidth = container.offsetWidth;
            const targetHeight = Math.round(containerWidth * (14/9));
            
            // 定义不同的背景样式
            const styles = [
                // 简约线条风格
                {
                    bg: `linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)`,
                    content: 'background-color: rgba(255, 255, 255, 0.9); border: 1px solid #e0e0e0; text-align: center;',
                    header: 'background-color: #e8eaf6; border-bottom: 1px solid #c5cae9;'
                },
                
                // 简约几何风格
                {
                    bg: `#f9f9f9`,
                    content: 'background-color: rgba(255, 255, 255, 0.95); border: 1px solid #eaeaea; text-align: center;',
                    header: 'background-color: #efebe9; border-bottom: 1px solid #d7ccc8;'
                },
                
                // 柔和渐变风格
                {
                    bg: `linear-gradient(to right, #ffecd2 0%, #fcb69f 100%)`,
                    content: 'background-color: rgba(255, 255, 255, 0.85); border: 1px solid #ffe0c0; text-align: center;',
                    header: 'background-color: #fff8e1; border-bottom: 1px solid #ffecb3;'
                },
                
                // 简约蓝调风格
                {
                    bg: `#e6f3ff`,
                    content: 'background-color: rgba(255, 255, 255, 0.9); border: 1px solid #d4e8ff; text-align: center;',
                    header: 'background-color: #e3f2fd; border-bottom: 1px solid #bbdefb;'
                },
                
                // 简约暖色风格
                {
                    bg: `linear-gradient(45deg, #ffe8cc 0%, #ffcab0 100%)`,
                    content: 'background-color: rgba(255, 255, 255, 0.85); border: 1px solid #ffe0c0; text-align: center;',
                    header: 'background-color: #fff3e0; border-bottom: 1px solid #ffe0b2;'
                }
            ];
            
            // 删除已有的底部文字
            const existingFooter = container.querySelector('.timeline-footer');
            if (existingFooter) {
                container.removeChild(existingFooter);
            }
            
            // 直接将样式应用到容器上
            container.style.background = styles[this.styleIndex].bg;
            container.style.minHeight = `${targetHeight}px`;
            contentArea.setAttribute('style', styles[this.styleIndex].content);
            
            // 应用样式到标题区域
            if (headerArea) {
                headerArea.setAttribute('style', styles[this.styleIndex].header);
            }
            
            // 添加底部说明文字
            this.addFooterText(container);
            
            console.log('样式已更新:', this.styleIndex);
            console.log('背景目标高度:', targetHeight);
            
            // 保存当前样式索引
            localStorage.setItem('styleIndex', this.styleIndex);
        },
        
        // 更新保存视图样式的方法
        updateSaveViewStyle() {
            // 确保保存视图容器存在
            const container = document.querySelector('.save-container');
            if (!container) {
                console.error('保存视图容器不存在');
                return;
            }
            
            // 获取记录容器和标题区域
            const recordsArea = document.querySelector('.save-record-list');
            const contentArea = container.querySelector('.bg-white');
            const headerArea = contentArea.querySelector('.bg-indigo-50');
            
            if (!contentArea) {
                console.error('记录内容容器不存在');
                return;
            }
            
            // 计算目标高度（9:14比例，即宽度的约1.556倍）
            const containerWidth = recordsArea.offsetWidth - 32; // 减去padding
            const targetHeight = Math.round(containerWidth * (14/9));
            
            // 定义不同的背景样式
            const styles = [
                // 简约线条风格
                {
                    bg: `background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);`,
                    content: 'background-color: rgba(255, 255, 255, 0.9); border: 1px solid #e0e0e0; text-align: center;',
                    header: 'background-color: #e8eaf6; border-bottom: 1px solid #c5cae9; padding: 6px 0;'
                },
                
                // 简约几何风格
                {
                    bg: `background: #f9f9f9;`,
                    content: 'background-color: rgba(255, 255, 255, 0.95); border: 1px solid #eaeaea; text-align: center;',
                    header: 'background-color: #efebe9; border-bottom: 1px solid #d7ccc8; padding: 6px 0;'
                },
                
                // 柔和渐变风格
                {
                    bg: `background: linear-gradient(to right, #ffecd2 0%, #fcb69f 100%);`,
                    content: 'background-color: rgba(255, 255, 255, 0.85); border: 1px solid #ffe0c0; text-align: center;',
                    header: 'background-color: #fff8e1; border-bottom: 1px solid #ffecb3; padding: 6px 0;'
                },
                
                // 简约蓝调风格
                {
                    bg: `background: #e6f3ff;`,
                    content: 'background-color: rgba(255, 255, 255, 0.9); border: 1px solid #d4e8ff; text-align: center;',
                    header: 'background-color: #e3f2fd; border-bottom: 1px solid #bbdefb; padding: 6px 0;'
                },
                
                // 简约暖色风格
                {
                    bg: `background: linear-gradient(45deg, #ffe8cc 0%, #ffcab0 100%);`,
                    content: 'background-color: rgba(255, 255, 255, 0.85); border: 1px solid #ffe0c0; text-align: center;',
                    header: 'background-color: #fff3e0; border-bottom: 1px solid #ffe0b2; padding: 6px 0;'
                }
            ];
            
            // 设置背景区域的样式
            recordsArea.style.background = styles[this.styleIndex].bg.replace('background:', '').trim();
            
            // 设置内容区域样式
            contentArea.setAttribute('style', styles[this.styleIndex].content);
            
            // 应用样式到标题区域
            if (headerArea) {
                headerArea.setAttribute('style', styles[this.styleIndex].header);
            }
            
            // 更新各个记录项的样式，使其更紧凑
            const recordItems = contentArea.querySelectorAll('.record-item');
            recordItems.forEach(item => {
                item.style.padding = '6px 8px';
            });
            
            // 更新底部说明文字
            this.refreshFooterText();
            
            // 保存当前样式索引
            localStorage.setItem('styleIndex', this.styleIndex);
        },
        
        // 刷新底部文本
        refreshFooterText() {
            const container = document.querySelector('.save-container');
            if (!container) return;
            
            // 删除已有的底部文字
            const footers = document.querySelectorAll('.timeline-footer');
            footers.forEach(footer => {
                if (footer.parentNode) {
                    footer.parentNode.removeChild(footer);
                }
            });
            
            // 添加底部说明文字
            const footerText = document.createElement('div');
            footerText.className = 'timeline-footer text-center';
            footerText.innerText = 'Provide by 时间线';
            footerText.style.cssText = 'font-size: 10px; color: #bbb; margin-top: 6px; padding-bottom: 4px;';
            container.appendChild(footerText);
        },
        
        initBackgroundStyle() {
            // 首先确保处于保存视图
            if (!this.showSaveView) return;
            
            // 获取样式索引（如果有保存的话）
            const savedStyleIndex = localStorage.getItem('styleIndex');
            if (savedStyleIndex) {
                this.styleIndex = parseInt(savedStyleIndex);
            }
            
            // 获取保存视图容器
            const recordsArea = document.querySelector('.save-record-list');
            
            if (!recordsArea) {
                console.error('保存视图容器不存在');
                return;
            }
            
            // 清除之前的底部文字
            const footers = document.querySelectorAll('.timeline-footer');
            footers.forEach(footer => {
                if (footer.parentNode) {
                    footer.parentNode.removeChild(footer);
                }
            });
            
            // 计算目标高度（9:14比例）
            const containerWidth = recordsArea.offsetWidth;
            const targetHeight = Math.round(containerWidth * (14/9));
            
            // 获取内容区域和标题区域
            const contentArea = recordsArea.querySelector('.bg-white');
            const headerArea = contentArea ? contentArea.querySelector('.bg-indigo-50') : null;
            
            // 定义不同的背景样式
            const styles = [
                // 简约线条风格
                {
                    bg: `linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)`,
                    content: 'background-color: rgba(255, 255, 255, 0.9); border: 1px solid #e0e0e0; text-align: center;',
                    header: 'background-color: #e8eaf6; border-bottom: 1px solid #c5cae9;'
                },
                
                // 简约几何风格
                {
                    bg: `#f9f9f9`,
                    content: 'background-color: rgba(255, 255, 255, 0.95); border: 1px solid #eaeaea; text-align: center;',
                    header: 'background-color: #efebe9; border-bottom: 1px solid #d7ccc8;'
                },
                
                // 柔和渐变风格
                {
                    bg: `linear-gradient(to right, #ffecd2 0%, #fcb69f 100%)`,
                    content: 'background-color: rgba(255, 255, 255, 0.85); border: 1px solid #ffe0c0; text-align: center;',
                    header: 'background-color: #fff8e1; border-bottom: 1px solid #ffecb3;'
                },
                
                // 简约蓝调风格
                {
                    bg: `#e6f3ff`,
                    content: 'background-color: rgba(255, 255, 255, 0.9); border: 1px solid #d4e8ff; text-align: center;',
                    header: 'background-color: #e3f2fd; border-bottom: 1px solid #bbdefb;'
                },
                
                // 简约暖色风格
                {
                    bg: `linear-gradient(45deg, #ffe8cc 0%, #ffcab0 100%)`,
                    content: 'background-color: rgba(255, 255, 255, 0.85); border: 1px solid #ffe0c0; text-align: center;',
                    header: 'background-color: #fff3e0; border-bottom: 1px solid #ffe0b2;'
                }
            ];
            
            // 应用背景样式
            recordsArea.style.background = styles[this.styleIndex].bg;
            recordsArea.style.minHeight = `${targetHeight}px`;
            
            // 应用内容区域样式
            if (contentArea) {
                contentArea.setAttribute('style', styles[this.styleIndex].content);
            }
            
            // 应用标题区域样式
            if (headerArea) {
                headerArea.setAttribute('style', styles[this.styleIndex].header);
            }
            
            // 添加底部说明文字
            this.addFooterText(recordsArea);
            
            console.log('初始化样式索引:', this.styleIndex);
            console.log('背景目标高度:', targetHeight);
        },
        
        // 添加底部文本的辅助方法
        addFooterText(container) {
            // 确保容器存在
            if (!container) return;
            
            const footerText = document.createElement('div');
            footerText.className = 'timeline-footer text-center';
            footerText.innerText = 'Provide by 时间线';
            footerText.style.cssText = 'font-size: 10px; color: #bbb; margin-top: 6px; padding-bottom: 4px;';
            container.appendChild(footerText);
        },
        
        // 恢复主界面样式
        resetMainViewStyle() {
            // 移除保存界面时添加的样式
            const mainContainer = document.querySelector('.record-list');
            if (mainContainer) {
                // 恢复主界面样式
                mainContainer.removeAttribute('style');
                
                // 恢复记录项样式
                const recordItems = mainContainer.querySelectorAll('.bg-white');
                recordItems.forEach(item => {
                    item.removeAttribute('style');
                });
                
                // 恢复标题区域样式
                const headerAreas = mainContainer.querySelectorAll('.bg-indigo-50');
                headerAreas.forEach(header => {
                    header.removeAttribute('style');
                });
                
                // 移除可能存在的底部文字
                const footerTexts = document.querySelectorAll('.timeline-footer');
                footerTexts.forEach(footer => {
                    if (footer.parentNode) {
                        footer.parentNode.removeChild(footer);
                    }
                });
            }
            
            // 重置头部和按钮区域
            const headerArea = document.querySelector('.header');
            if (headerArea) {
                headerArea.style.zIndex = '20';
            }
            
            const footerArea = document.querySelector('.footer');
            if (footerArea) {
                footerArea.style.zIndex = '20';
            }
        },
        
        loadRecords() {
            const savedRecords = localStorage.getItem('records');
            const savedTitle = localStorage.getItem('mainTitle');
            const savedTimeFormat = localStorage.getItem('timeFormatIndex');
            const savedStyleIndex = localStorage.getItem('styleIndex');
            
            if (savedRecords) {
                try {
                    const parsedRecords = JSON.parse(savedRecords);
                    this.records = parsedRecords.map(record => ({
                        ...record,
                        time: new Date(record.time)
                    }));
                } catch (e) {
                    console.error('Failed to parse saved records', e);
                    this.records = [];
                }
            }
            
            if (savedTitle) {
                this.mainTitle = savedTitle;
            }
            
            if (savedTimeFormat) {
                this.timeFormatIndex = parseInt(savedTimeFormat);
            }
            
            if (savedStyleIndex) {
                this.styleIndex = parseInt(savedStyleIndex);
            }
        },
        
        saveRecords() {
            localStorage.setItem('records', JSON.stringify(this.records));
        },
        
        // 记录数量变化时，确保界面布局正确
        adjustMainViewLayout() {
            // 获取记录列表容器
            const recordList = document.querySelector('.record-list');
            if (!recordList) return;
            
            // 当有记录时，进行特殊处理以确保记录显示正确
            if (this.records.length > 0) {
                // 延迟一点执行，确保DOM已更新
                setTimeout(() => {
                    // 首先重置滚动位置到顶部
                    recordList.scrollTop = 0;
                    
                    // 获取第一条记录
                    const firstRecord = recordList.querySelector('.record-item');
                    if (firstRecord) {
                        // 计算header高度
                        const header = document.querySelector('.header');
                        const headerHeight = header ? header.offsetHeight : 180;
                        
                        // 确保第一条记录在可视区域内
                        const firstRecordPos = firstRecord.getBoundingClientRect();
                        const headerBottom = header.getBoundingClientRect().bottom;
                        
                        // 如果第一条记录被header遮挡，调整滚动位置
                        if (firstRecordPos.top < headerBottom) {
                            const adjustScrollBy = headerBottom - firstRecordPos.top + 15; // 减少额外空间到15px
                            recordList.scrollTop += adjustScrollBy;
                            console.log('Adjusted scroll by:', adjustScrollBy);
                        }
                        
                        // 微调最终位置，确保不被遮挡
                        recordList.scrollTop += 5; // 减少额外添加的滚动距离到5px
                    }
                }, 150);
            } else {
                // 如果记录为空，重置滚动位置
                recordList.scrollTop = 0;
            }
        },
        
        // 添加处理窗口大小变化的方法
        handleResize() {
            // 窗口大小变化时，重新调整布局
            this.adjustMainViewLayout();
        }
    }
});