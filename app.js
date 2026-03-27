/**
 * ACM Calendar Pro - Core Logic
 */

// === 状态管理 ===
// 初始数据，模拟几条，方便看效果
let events = [
    { id: 1, date: '2026-03-29', title: '牛客周赛 #12', start: '19:00', end: '21:00', type: 'online' },
    { id: 2, date: '2026-03-29', title: '蓝桥杯校选 (撞题)', start: '14:00', end: '18:00', type: 'offline' },
    { id: 3, date: '2026-03-27', title: '复习计算几何', start: '', end: '', type: 'daily' },
    { id: 4, date: '2026-04-01', title: '愚人节 Codeforces', start: '22:35', end: '00:35', type: 'online' },
];

// 初始化日期，设置为 2026年3月，方便测试
let currentDate = new Date(2026, 2, 1); 
let parsedEvent = null; // 存放临时解析出的新日程
let selectedDateForAdd = null; // 用于点击日期格子添加时记录日期

// === DOM 元素获取 ===
const grid = document.getElementById('calendar-grid');
const monthLabel = document.getElementById('current-month-label');
const inputModal = document.getElementById('input-modal');
const detailModal = document.getElementById('detail-modal');
const smartInput = document.getElementById('smart-input');
const parsePreview = document.getElementById('parse-preview');
const detailList = document.getElementById('detail-list');
const detailDateLabel = document.getElementById('detail-date-label');

const monthView = document.getElementById('month-view');
const yearView = document.getElementById('year-view');
const viewMonthBtn = document.getElementById('view-month');
const viewYearBtn = document.getElementById('view-year');

// === 辅助函数 ===
// 格式化 Date 对象为 YYYY-MM-DD
const formatDateStr = (date) => date.toISOString().split('T')[0];

// 获取颜色配置
const getColorConfig = (type) => {
    if (type === 'offline') return { border: 'border-red-400', bg: 'bg-red-50', text: 'text-red-800' };
    if (type === 'online') return { border: 'border-blue-400', bg: 'bg-blue-50', text: 'text-blue-800' };
    return { border: 'border-gray-300', bg: 'bg-gray-100', text: 'text-gray-700' };
};

// === 核心功能：渲染月度日历 ===
function renderCalendar() {
    grid.innerHTML = '';
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    monthLabel.textContent = `${year}年 ${month + 1}月`;

    // 真正的星期计算：当月第一天是周几 (0是周日，转为1=Mon, 7=Sun)
    let firstDayOfWeek = new Date(year, month, 1).getDay();
    firstDayOfWeek = firstDayOfWeek === 0 ? 7 : firstDayOfWeek; // 将周日从0转为7

    // 计算当月总天数
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // 1. 填充前面的空白格子 (上个月的尾巴)
    for (let i = 1; i < firstDayOfWeek; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'bg-gray-50/50';
        grid.appendChild(emptyCell);
    }

    // 2. 填充真实的日期格子
    const todayStr = formatDateStr(new Date());

    for (let i = 1; i <= daysInMonth; i++) {
        const dateObj = new Date(year, month, i);
        const dateStr = formatDateStr(dateObj);
        
        // 筛选当天的日程
        const dayEvents = events.filter(e => e.date === dateStr)
                                .sort((a, b) => (a.start || '00:00').localeCompare(b.start || '00:00')); // 按时间排序
        
        const cell = document.createElement('div');
        // 基础样式 + hover 效果 + 指针样式（表明可点击）
        cell.className = 'bg-white p-2.5 min-h-[120px] flex flex-col gap-1.5 day-cell overflow-hidden relative border-r border-b border-gray-100 hover:bg-blue-50/30 transition-colors cursor-pointer group';
        cell.dataset.date = dateStr; // 存储日期信息供点击使用

        // 录入方法 2 实现：点击日期格子空白处录入
        cell.addEventListener('click', (e) => {
            // 防止点击里面的日程卡片也触发格子的点击
            if (e.target === cell || e.target.classList.contains('date-num') || e.target.classList.contains('more-link')) {
                openInputModal(dateStr); // 打开弹窗，自动填好日期
            }
        });
        
        // 日期数字
        const isToday = todayStr === dateStr;
        let dateHtml = `
            <div class="flex justify-between items-center mb-1">
                <span class="date-num text-sm font-semibold font-mono tabular-nums ${isToday ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center' : 'text-gray-500'}">
                    ${i}
                </span>
                <span class="text-blue-500 opacity-0 group-hover:opacity-100 text-xs font-bold transition-opacity">+添加</span>
            </div>
        `;
        
        // 渲染日程卡片 (最多显示 3 个，处理撞题)
        const maxDisplay = 3;
        let eventsHtml = '';
        
        dayEvents.slice(0, maxDisplay).forEach(e => {
            const colors = getColorConfig(e.type);
            const timeStr = e.start ? `<span class="font-mono opacity-80 mr-1">${e.start}</span>` : '';
            
            eventsHtml += `
                <div class="text-[11px] px-2 py-1 rounded-md border-l-2 ${colors.border} ${colors.bg} ${colors.text} truncate font-medium group-hover:shadow-sm transition-shadow" title="${timeStr}${e.title}">
                    ${timeStr}${e.title}
                </div>
            `;
        });

        // 撞题处理：如果有更多赛程，显示查看更多
        if (dayEvents.length > maxDisplay) {
            eventsHtml += `
                <button class="more-link text-[10px] text-gray-500 font-medium pt-1 hover:text-blue-600 self-start">
                    ...查看全部 ${dayEvents.length} 项 (撞题)
                </button>
            `;
            // 点击查看更多，打开详情弹窗
            cell.removeEventListener('click', null); // 移除之前的点击，重新定义
            cell.addEventListener('click', (e) => {
                // 如果点的是卡片，不触发详情；点格子其他地方或“查看更多”触发详情
                if (e.target.classList.contains('truncate')) return; 
                openDetailModal(dateStr, dayEvents);
            });
        }

        cell.innerHTML = dateHtml + `<div class="space-y-1 overflow-hidden">${eventsHtml}</div>`;
        grid.appendChild(cell);
    }
}

// === 核心功能：渲染年度热力图 (防学车护盾) ===
function renderHeatmap() {
    yearView.classList.remove('hidden');
    monthView.classList.add('hidden');
    viewYearBtn.classList.add('bg-gray-100', 'text-gray-950');
    viewYearBtn.classList.remove('text-gray-600');
    viewMonthBtn.classList.remove('bg-blue-50', 'text-blue-600');
    viewMonthBtn.classList.add('text-gray-600');

    const container = document.getElementById('year-heatmap-container');
    container.innerHTML = '';

    const year = currentDate.getFullYear();
    // 这里简单生成这一年的所有日期，实际可以使用更严谨的循环
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    
    // 按日期汇总训练时长/比赛个数 (简单起见这里按比赛个数)
    let activityMap = {};
    events.forEach(e => {
        if(e.date.startsWith(year.toString())) {
            activityMap[e.date] = (activityMap[e.date] || 0) + 1;
        }
    });

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = formatDateStr(d);
        const count = activityMap[dateStr] || 0;
        
        const rect = document.createElement('div');
        rect.className = 'w-3 h-3 rounded-sm transition-colors cursor-pointer';
        
        // 根据活动量设置绿色深浅 (GitHub 风格)
        if (count === 0) rect.classList.add('bg-gray-100', 'hover:bg-gray-200');
        else if (count === 1) rect.classList.add('bg-green-100', 'hover:bg-green-200');
        else if (count === 2) rect.classList.add('bg-green-300', 'hover:bg-green-400');
        else rect.classList.add('bg-green-500', 'hover:bg-green-600'); // 撞题越多越绿
        
        rect.title = `${dateStr}: ${count} 项赛程`;
        // 点击热力图格子也能跳回月视图查看那一天
        rect.addEventListener('click', () => {
            currentDate = new Date(d);
            showMonthView();
            setTimeout(() => {
                // 简易高亮一下选中的格子
                const targetCell = document.querySelector(`[data-date="${dateStr}"]`);
                if(targetCell) targetCell.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
            }, 100);
        });

        container.appendChild(rect);
    }
}

function showMonthView() {
    yearView.classList.add('hidden');
    monthView.classList.remove('hidden');
    viewMonthBtn.classList.add('bg-blue-50', 'text-blue-600');
    viewMonthBtn.classList.remove('text-gray-600');
    viewYearBtn.classList.remove('bg-gray-100', 'text-gray-950');
    viewYearBtn.classList.add('text-gray-600');
    renderCalendar();
}


// === 交互功能实现 ===

// 1. 录入弹窗逻辑 (三种模式共用)
function openInputModal(prefillDate = null) {
    inputModal.classList.remove('hidden');
    inputModal.classList.add('flex');
    setTimeout(() => {
        inputModal.classList.remove('opacity-0');
        inputModal.querySelector('.transform').classList.remove('scale-95');
    }, 10);

    smartInput.value = '';
    smartInput.focus();
    selectedDateForAdd = prefillDate; // 记录是从哪个日期格子点进来的
    
    if (prefillDate) {
        // 如果是从日期格子点进来的，解析预览默认显示该日期
        parsePreview.innerHTML = `<span class="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">${prefillDate}</span> 等待输入比赛名和时间...`;
    } else {
        parsePreview.textContent = '输入如: 3.29 19~21 牛客周赛';
    }
}

function closeInputModal() {
    inputModal.classList.add('opacity-0');
    inputModal.querySelector('.transform').classList.add('scale-95');
    setTimeout(() => {
        inputModal.classList.add('hidden');
        inputModal.classList.remove('flex');
    }, 200);
    parsedEvent = null;
    selectedDateForAdd = null;
}

// 智能输入解析器 (你要求的 "3.29 19~21 牛客周赛" 或直接输入 "19~21 周赛")
function parseInputText(text) {
    if (!text.trim()) {
        parsePreview.textContent = '等待输入...';
        parsedEvent = null;
        return;
    }

    // 正则匹配
    const dateMatch = text.match(/(\d{1,2})[\.\-月](\d{1,2})/); // 匹配 "3.29"
    const timeMatch = text.match(/(\d{1,2})(?::\d{2})?\s*[~\-到]\s*(\d{1,2})(?::\d{2})?/); // 匹配 "19~21"
    
    // 初始化解析结果，默认使用当前视图的年月，或者点击格子传入的日期
    let targetYear = currentDate.getFullYear();
    let targetMonth = currentDate.getMonth() + 1;
    let targetDay = currentDate.getDate();
    
    if(selectedDateForAdd) {
        const parts = selectedDateForAdd.split('-');
        targetYear = parseInt(parts[0]);
        targetMonth = parseInt(parts[1]);
        targetDay = parseInt(parts[2]);
    }

    let start = '';
    let end = '';
    let title = text;
    let type = 'online'; // 默认线上赛

    // 如果手输了日期，覆盖默认日期
    if (dateMatch) {
        targetMonth = parseInt(dateMatch[1]);
        targetDay = parseInt(dateMatch[2]);
        title = title.replace(dateMatch[0], ''); // 从标题中剔除日期部分
    }

    if (timeMatch) {
        start = `${timeMatch[1].padStart(2, '0')}:00`;
        end = `${timeMatch[2].padStart(2, '0')}:00`;
        title = title.replace(timeMatch[0], ''); // 从标题中剔除时间部分
    }

    // 简单类型判断：去掉花哨，直白表达
    if (title.includes('线下')) { type = 'offline'; title = title.replace('线下', ''); }
    else if (title.includes('补题') || title.includes('日常')) { type = 'daily'; }

    title = title.trim() || '未命名比赛';
    const finalDateStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;

    parsedEvent = {
        id: Date.now(), // 简单生成 ID
        date: finalDateStr,
        title: title,
        start: start,
        end: end,
        type: type
    };

    // 高级预览反馈
    parsePreview.innerHTML = `
        录入至: <span class="text-gray-950 font-bold bg-gray-100 px-1.5 py-0.5 rounded">${finalDateStr}</span> | 
        时间: <span class="text-gray-950 font-bold bg-gray-100 px-1.5 py-0.5 rounded">${start ? start + '-' + end : '全天'}</span> | 
        类型: <span class="${getColorConfig(type).text} font-bold">${type==='online'?'线上赛':(type==='offline'?'线下赛':'日常')}</span> |
        标题: <span class="text-blue-600 font-bold">${title}</span>
    `;
}

// 2. 当日详情弹窗逻辑 (处理撞题)
function openDetailModal(dateStr, dayEvents) {
    selectedDateForAdd = dateStr; // 为详情页点击添加做准备
    detailDateLabel.textContent = dateStr.replace(/(\d{4})-(\d{2})-(\d{2})/, '$1年$2月$3日');
    detailList.innerHTML = '';
    
    dayEvents.forEach(e => {
        const colors = getColorConfig(e.type);
        const item = document.createElement('div');
        item.className = `p-3 rounded-lg border border-gray-100 bg-white flex justify-between items-center gap-2 group hover:shadow-sm transition-shadow`;
        
        item.innerHTML = `
            <div class="flex items-center gap-3 overflow-hidden">
                <span class="w-2.5 h-6 rounded ${colors.bg} ${colors.border} border-l-4 flex-shrink-0"></span>
                <div class="overflow-hidden">
                    <p class="font-semibold text-gray-950 truncate">${e.title}</p>
                    <p class="text-xs font-mono text-gray-500">${e.start ? e.start + ' - ' + e.end : '全天'} | ${e.type==='online'?'线上':'线下'}</p>
                </div>
            </div>
            <button class="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-xs delete-event-btn" data-id="${e.id}">删除</button>
        `;
        detailList.appendChild(item);
    });

    detailModal.classList.remove('hidden');
    detailModal.classList.add('flex');
    setTimeout(() => { detailModal.classList.remove('opacity-0'); detailModal.querySelector('.transform').classList.remove('scale-95'); }, 10);
}

function closeDetailModal() {
    detailModal.classList.add('opacity-0'); detailModal.querySelector('.transform').classList.add('scale-95');
    setTimeout(() => { detailModal.classList.add('hidden'); detailModal.classList.remove('flex'); selectedDateForAdd = null;}, 200);
}


// === 事件监听 ===

// 视图切换
viewMonthBtn.addEventListener('click', showMonthView);