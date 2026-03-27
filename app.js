// 状态管理：存储所有日程
let events = [
    { date: '2026-03-29', title: '牛客周赛', start: '19:00', end: '20:00', type: 'online' },
    { date: '2026-03-27', title: '补题: DP', start: '', end: '', type: 'daily' }
];

let currentDate = new Date(2026, 2, 1); // 默认设置到 2026年3月
let parsedEvent = null; // 存放当前解析出来的新日程

// DOM 元素获取
const grid = document.getElementById('calendar-grid');
const monthLabel = document.getElementById('current-month-label');
const modal = document.getElementById('input-modal');
const smartInput = document.getElementById('smart-input');
const parsePreview = document.getElementById('parse-preview');

// 渲染整个日历
function renderCalendar() {
    grid.innerHTML = '';
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // 更新标题 (如：2026年 3月)
    monthLabel.textContent = `${year}年 ${month + 1}月`;

    // 计算当月第一天是星期几 (0是周日，转为周一为起点)
    let firstDay = new Date(year, month, 1).getDay();
    firstDay = firstDay === 0 ? 6 : firstDay - 1; 

    // 计算当月总天数
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // 填充前面的空白格子
    for (let i = 0; i < firstDay; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'bg-white';
        grid.appendChild(emptyCell);
    }

    // 填充实际天数
    for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        
        // 筛选当天的日程
        const dayEvents = events.filter(e => e.date === dateStr);
        
        const cell = document.createElement('div');
        cell.className = 'bg-white p-2 min-h-[100px] flex flex-col gap-1 day-cell overflow-y-auto hover:bg-gray-50 transition-colors';
        
        // 日期数字
        let dateHtml = `<div class="text-sm font-medium ${new Date().toISOString().split('T')[0] === dateStr ? 'text-blue-600 font-bold' : 'text-gray-500'} mb-1">${i}</div>`;
        
        // 渲染日程卡片
        let eventsHtml = dayEvents.map(e => {
            let colorClasses = '';
            if (e.type === 'offline') colorClasses = 'border-red-400 bg-red-50 text-red-700';
            else if (e.type === 'online') colorClasses = 'border-blue-400 bg-blue-50 text-blue-700';
            else colorClasses = 'border-gray-300 bg-gray-100 text-gray-700';

            const timeStr = e.start ? `<span class="text-[10px] opacity-75 mr-1">${e.start}</span>` : '';
            
            return `
                <div class="text-xs px-1.5 py-1 rounded border-l-2 ${colorClasses} truncate cursor-pointer" title="${e.title}">
                    ${timeStr}${e.title}
                </div>
            `;
        }).join('');

        cell.innerHTML = dateHtml + eventsHtml;
        grid.appendChild(cell);
    }
}

// 智能输入解析器 (你要求的 "3.29 19~20 牛客周赛" 格式)
function parseInputText(text) {
    if (!text.trim()) {
        parsePreview.textContent = '等待输入...';
        parsedEvent = null;
        return;
    }

    // 匹配日期: "3.29" 或 "3-29" 或 "3月29"
    const dateMatch = text.match(/(\d{1,2})[\.\-月](\d{1,2})/);
    // 匹配时间: "19~20" 或 "19-20"
    const timeMatch = text.match(/(\d{1,2})(?::00)?\s*[~\-到]\s*(\d{1,2})(?::00)?/);
    
    let year = currentDate.getFullYear();
    let month = currentDate.getMonth() + 1;
    let day = currentDate.getDate();
    let start = '';
    let end = '';
    let title = text;
    let type = 'online'; // 默认线上赛

    if (dateMatch) {
        month = parseInt(dateMatch[1]);
        day = parseInt(dateMatch[2]);
        title = title.replace(dateMatch[0], ''); // 从标题中剔除日期
    }

    if (timeMatch) {
        start = `${timeMatch[1].padStart(2, '0')}:00`;
        end = `${timeMatch[2].padStart(2, '0')}:00`;
        title = title.replace(timeMatch[0], ''); // 从标题中剔除时间
    }

    // 简单判断线下赛
    if (title.includes('线下')) {
        type = 'offline';
        title = title.replace('线下', '');
    } else if (title.includes('补题') || title.includes('日常')) {
        type = 'daily';
    }

    title = title.trim() || '未命名比赛';

    parsedEvent = {
        date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        title: title,
        start: start,
        end: end,
        type: type
    };

    // 预览显示
    parsePreview.innerHTML = `即将录入: <span class="text-gray-800 font-bold">${parsedEvent.date}</span> | <span class="text-gray-800 font-bold">${start ? start+'-'+end : '全天'}</span> | <span class="text-blue-600 font-bold">${title}</span>`;
}

// 事件监听
document.getElementById('prev-month').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
});

document.getElementById('next-month').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
});

document.getElementById('today-btn').addEventListener('click', () => {
    currentDate = new Date(); // 回到今天
    renderCalendar();
});

// 弹窗控制
const openModal = () => { modal.classList.remove('hidden'); modal.classList.add('flex'); smartInput.value = ''; parsePreview.textContent = '等待输入...'; smartInput.focus(); };
const closeModal = () => { modal.classList.add('hidden'); modal.classList.remove('flex'); };

document.getElementById('open-modal-btn').addEventListener('click', openModal);
document.getElementById('close-modal-btn').addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if(e.target === modal) closeModal(); });

// 全局快捷键
window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openModal(); }
    if (e.key === 'Escape') closeModal();
});

// 监听输入，实时解析
smartInput.addEventListener('input', (e) => parseInputText(e.target.value));

// 保存事件
const saveEvent = () => {
    if (parsedEvent) {
        events.push(parsedEvent);
        // 如果录入的月份不在当前视图，自动跳过去
        const eventDate = new Date(parsedEvent.date);
        if(eventDate.getMonth() !== currentDate.getMonth()) {
            currentDate.setMonth(eventDate.getMonth());
        }
        renderCalendar();
        closeModal();
    }
};

document.getElementById('save-event-btn').addEventListener('click', saveEvent);
smartInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); saveEvent(); }
});

// 初始化渲染
renderCalendar();