// --- 核心数据存储 ---
let events = [
    { id: 1, date: '2026-03-29', title: '牛客周赛 #12', start: '19:00', end: '21:00', type: 'match' },
    { id: 2, date: '2026-04-12', title: '蓝桥杯省赛', start: '09:00', end: '13:00', type: 'match' },
    { id: 3, date: '2026-03-27', title: '补题: 状压DP专题', start: '', end: '', type: 'daily' },
    { id: 4, date: '2026-03-28', title: 'Codeforces Div2', start: '22:35', end: '00:35', type: 'match' }
];

let curDate = new Date(2026, 2, 1);
const realTodayStr = new Date().toISOString().split('T')[0];
let targetDateForInput = null; // 记录当前要录入的目标日期

// --- DOM 元素获取 ---
const viewCal = document.getElementById('view-calendar');
const viewRep = document.getElementById('view-report');
const navCal = document.getElementById('nav-calendar');
const navRep = document.getElementById('nav-report');
const modal = document.getElementById('modal');
const inputStr = document.getElementById('input-text');
const dateLabel = document.getElementById('modal-date-label');

// --- 视图切换逻辑 ---
navCal.onclick = () => {
    viewCal.classList.remove('hidden'); 
    viewRep.classList.add('hidden');
    navCal.className = 'w-full flex items-center px-4 py-2.5 bg-gray-100 text-gray-900 rounded-md text-sm font-medium transition-colors';
    navRep.className = 'w-full flex items-center px-4 py-2.5 text-gray-600 hover:bg-gray-50 rounded-md text-sm font-medium transition-colors';
    renderCalendar();
};

navRep.onclick = () => {
    viewRep.classList.remove('hidden'); 
    viewRep.classList.add('flex'); 
    viewCal.classList.add('hidden');
    navRep.className = 'w-full flex items-center px-4 py-2.5 bg-gray-100 text-gray-900 rounded-md text-sm font-medium transition-colors';
    navCal.className = 'w-full flex items-center px-4 py-2.5 text-gray-600 hover:bg-gray-50 rounded-md text-sm font-medium transition-colors';
    renderReport();
};

// --- 功能 1：渲染日历视图 ---
function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';
    const year = curDate.getFullYear();
    const month = curDate.getMonth();
    document.getElementById('month-label').textContent = `${year} ${month + 1}月`;

    // 顶部今日状态计算
    const todayEvents = events.filter(e => e.date === realTodayStr);
    document.getElementById('today-status').innerHTML = todayEvents.length > 0 
        ? `<span class="text-gray-900 font-bold">今日任务:</span> ${todayEvents.length} 项排期`
        : `今日暂无排期`;

    // 日期计算逻辑
    let firstDay = new Date(year, month, 1).getDay();
    firstDay = firstDay === 0 ? 7 : firstDay; 
    const days = new Date(year, month + 1, 0).getDate();

    // 补齐上个月的空格
    for (let i = 1; i < firstDay; i++) {
        grid.innerHTML += `<div class="bg-gray-50"></div>`;
    }

    // 渲染真实的每一天
    for (let i = 1; i <= days; i++) {
        const dStr = `${year}-${String(month+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
        // 按时间排序今日事件
        const dayEvents = events.filter(e => e.date === dStr).sort((a,b) => (a.start||'').localeCompare(b.start||''));
        
        const cell = document.createElement('div');
        cell.className = 'bg-white p-2 min-h-[100px] flex flex-col group cursor-pointer hover:bg-gray-50 transition-colors relative';
        
        // 【核心交互还原】：点击格子触发录入弹窗
        cell.onclick = (e) => {
            // 防止点到已有的日程卡片上触发录入
            if(e.target.closest('.event-card')) return; 
            openModal(dStr);
        };

        const isToday = dStr === realTodayStr;
        let html = `
            <div class="flex justify-between items-start mb-1.5">
                <span class="text-sm font-medium ${isToday ? 'bg-gray-900 text-white w-6 h-6 rounded-full flex items-center justify-center' : 'text-gray-500'}">${i}</span>
                <span class="text-gray-400 opacity-0 group-hover:opacity-100 text-xs transition-opacity">+</span>
            </div>
        `;

        // 渲染这一天的所有日程
        dayEvents.forEach(e => {
            const isMatch = e.type === 'match';
            html += `
                <div class="event-card text-[11px] px-1.5 py-1 mb-1 rounded border-l-2 truncate 
                    ${isMatch ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-gray-100 border-gray-400 text-gray-700'}">
                    ${e.start ? '<span class="opacity-75 font-mono mr-1">'+e.start+'</span>' : ''}${e.title}
                </div>
            `;
        });

        cell.innerHTML = html;
        grid.appendChild(cell);
    }
}

// --- 功能 2：渲染排期表 (用于老爸视角的打印) ---
function renderReport() {
    document.getElementById('export-time').textContent = new Date().toLocaleString();
    
    // 按日期全局排序
    const sorted = [...events].sort((a,b) => a.date.localeCompare(b.date));
    const matches = sorted.filter(e => e.type === 'match');
    const dailies = sorted.filter(e => e.type === 'daily');

    // 抽离渲染列表的逻辑
    const renderList = (arr, colorClass) => arr.map(e => `
        <div class="timeline-dot relative print-border">
            <style>.timeline-dot:nth-child(${arr.indexOf(e)+1})::before { background-color: ${colorClass}; }</style>
            <div class="bg-gray-50 border border-gray-100 p-4 rounded-md print-border">
                <div class="text-gray-500 font-mono text-xs mb-1">${e.date} ${e.start ? e.start+'-'+e.end : ''}</div>
                <div class="text-gray-900 font-semibold text-sm">${e.title}</div>
            </div>
        </div>
    `).join('');

    document.getElementById('list-matches').innerHTML = renderList(matches, '#2563eb'); // blue-600
    document.getElementById('list-dailies').innerHTML = renderList(dailies, '#9ca3af'); // gray-400
}

// --- 功能 3：弹窗与录入逻辑 ---
const openModal = (dateStr = null) => { 
    modal.classList.remove('hidden'); 
    modal.classList.add('flex'); 
    inputStr.value = ''; 
    inputStr.focus();
    
    // 锁定录入日期
    if (dateStr) {
        targetDateForInput = dateStr;
    } else {
        targetDateForInput = realTodayStr; 
    }
    dateLabel.textContent = targetDateForInput;
};

const closeModal = () => { 
    modal.classList.add('hidden'); 
    modal.classList.remove('flex'); 
    targetDateForInput = null;
};

const saveEvent = () => {
    const text = inputStr.value.trim();
    if(!text) return;
    
    let date = targetDateForInput; 
    let start = '', end = '', title = text, type = 'match';
    
    // 正则提取手写日期 (如果用户输了 3.29，就覆盖锁定的日期)
    const dateMatch = text.match(/(\d{1,2})[\.\-](\d{1,2})/);
    if(dateMatch) {
        date = `${curDate.getFullYear()}-${String(dateMatch[1]).padStart(2,'0')}-${String(dateMatch[2]).padStart(2,'0')}`;
        title = title.replace(dateMatch[0], '');
    }
    
    // 正则提取时间 (例如 19~21)
    const timeMatch = text.match(/(\d{1,2})\s*[~\-]\s*(\d{1,2})/);
    if(timeMatch) {
        start = `${timeMatch[1].padStart(2,'0')}:00`; 
        end = `${timeMatch[2].padStart(2,'0')}:00`;
        title = title.replace(timeMatch[0], '');
    }

    // 判断是比赛还是日常训练
    if(title.includes('补题') || title.includes('日常') || title.includes('刷题')) {
        type = 'daily';
    }
    
    // 存入全局状态
    events.push({ id: Date.now(), date, start, end, title: title.trim(), type });
    
    // 刷新当前视图
    renderCalendar();
    if(!viewRep.classList.contains('hidden')) renderReport();
    
    closeModal();
};

// --- 事件绑定 ---
document.getElementById('prev-month').onclick = () => { curDate.setMonth(curDate.getMonth()-1); renderCalendar(); };
document.getElementById('next-month').onclick = () => { curDate.setMonth(curDate.getMonth()+1); renderCalendar(); };

// 导出 PDF 按钮绑定
document.getElementById('btn-print').onclick = () => window.print();

document.getElementById('btn-add-global').onclick = () => openModal(null);
document.getElementById('btn-cancel').onclick = closeModal;
document.getElementById('btn-save').onclick = saveEvent;

// 键盘事件
inputStr.onkeydown = (e) => { if(e.key === 'Enter') saveEvent(); };
window.onkeydown = (e) => { 
    if((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); openModal(null); }
    if(e.key === 'Escape') closeModal();
};

// 点击遮罩层关闭弹窗
modal.onclick = (e) => { if(e.target === modal) closeModal(); };

// --- 初始化执行 ---
renderCalendar();