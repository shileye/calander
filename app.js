/**
 * ACM Calendar Pro - 核心逻辑引擎 (支持 LocalStorage 本地存储 & 智能排序)
 */

// --- 1. 数据与状态管理 (加入 LocalStorage 防丢失) ---
const defaultEvents = [
    { id: 1, date: '2026-03-29', title: '牛客周赛 #12', start: '19:00', end: '21:00', type: 'match' },
    { id: 2, date: '2026-03-29', title: '补题: 状压DP', start: '', end: '', type: 'upsolve' },
    { id: 3, date: '2026-04-05', title: '蓝桥杯省赛线下', start: '09:00', end: '13:00', type: 'offline' },
    { id: 4, date: '2026-03-28', title: '刷题: CF Div2', start: '', end: '', type: 'practice' }
];

// 核心修复：从浏览器的 localStorage 读取数据，刷新不再丢失
let events = JSON.parse(localStorage.getItem('acm_pro_events')) || defaultEvents;

// 每次增删改后，调用此函数保存数据到本地
function saveEvents() {
    localStorage.setItem('acm_pro_events', JSON.stringify(events));
}

let curDate = new Date(2026, 2, 1);
const todayStr = new Date().toISOString().split('T')[0];
let currentView = 'month';
let selectedDrawerDate = null;

// --- 2. DOM 元素获取 ---
const monthGrid = document.getElementById('month-grid');
const weekGrid = document.getElementById('week-grid');
const yearGrid = document.getElementById('year-grid');
const dateLabel = document.getElementById('date-label');

const drawer = document.getElementById('right-drawer');
const drawerOverlay = document.getElementById('drawer-overlay');
const drawerList = document.getElementById('drawer-list');
const drawerInput = document.getElementById('drawer-input');
const drawerDateLabel = document.getElementById('drawer-date');

const globalModal = document.getElementById('global-modal');
const globalInput = document.getElementById('global-input');

// --- 3. 智能分类与排序规则 ---
// 优先级权重：补题 (1) > 线下赛 (2) > 线上赛 (3) > 刷题 (4)
function getWeight(type) {
    if (type === 'upsolve') return 1;
    if (type === 'offline') return 2;
    if (type === 'match') return 3;
    return 4; // practice
}

function sortDayEvents(dayEvents) {
    return dayEvents.sort((a, b) => {
        const wA = getWeight(a.type);
        const wB = getWeight(b.type);
        if (wA !== wB) return wA - wB; // 权重不同，数字小的(高优)排前面
        return (a.start || '24:00').localeCompare(b.start || '24:00'); // 权重相同，按时间早晚排
    });
}

// 分类颜色与样式引擎
function getStyle(type) {
    switch(type) {
        case 'upsolve': return 'border-purple-500 bg-purple-500/10 text-purple-700'; // 补题：高亮紫
        case 'offline': return 'border-red-500 bg-red-500/10 text-red-700';       // 线下赛：警戒红
        case 'match': return 'border-blue-500 bg-blue-500/10 text-blue-700';      // 线上赛：经典蓝
        case 'practice': return 'border-green-500 bg-green-500/10 text-green-700';// 刷题：护眼绿
        default: return 'border-gray-400 bg-gray-500/10 text-gray-700';
    }
}

function getIcon(type) {
    switch(type) {
        case 'upsolve': return '🔥'; 
        case 'offline': return '🚗';
        case 'match': return '🏆';
        case 'practice': return '💻';
        default: return '📅';
    }
}

// --- 4. 主题与导航切换 ---
document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.onclick = (e) => {
        const theme = e.currentTarget.dataset.set;
        document.documentElement.setAttribute('data-theme', theme);
        document.querySelectorAll('.theme-btn').forEach(b => {
            b.classList.remove('active', 'opacity-100');
            b.classList.add('opacity-50');
        });
        e.currentTarget.classList.add('active', 'opacity-100');
        e.currentTarget.classList.remove('opacity-50');
    };
});

document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.onclick = (e) => {
        const view = e.currentTarget.dataset.view;
        currentView = view;
        
        document.querySelectorAll('.nav-btn').forEach(b => {
            b.classList.remove('active', 'theme-bg-panel', 'opacity-100');
            b.classList.add('opacity-70');
        });
        e.currentTarget.classList.add('active', 'theme-bg-panel', 'opacity-100');
        e.currentTarget.classList.remove('opacity-70');

        document.querySelectorAll('.view-section').forEach(sec => sec.classList.add('hidden'));
        document.getElementById(`view-${view}`).classList.remove('hidden');
        document.getElementById(`view-${view}`).classList.add('flex');
        
        renderViews();
    };
});

// --- 5. 渲染引擎 ---
function renderViews() {
    if (currentView === 'month') renderMonth();
    else if (currentView === 'week') renderWeek();
    else if (currentView === 'year') renderYear();
}

function renderMonth() {
    monthGrid.innerHTML = '';
    const year = curDate.getFullYear(), month = curDate.getMonth();
    dateLabel.textContent = `${year}年 ${month + 1}月`;

    let firstDay = new Date(year, month, 1).getDay();
    firstDay = firstDay === 0 ? 7 : firstDay; 
    const days = new Date(year, month + 1, 0).getDate();

    for (let i = 1; i < firstDay; i++) monthGrid.innerHTML += `<div class="theme-bg-panel opacity-50"></div>`;

    for (let i = 1; i <= days; i++) {
        const dStr = `${year}-${String(month+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
        
        // 核心：获取当日事件并调用我们写好的智能排序函数
        let dayEvents = events.filter(e => e.date === dStr);
        dayEvents = sortDayEvents(dayEvents);
        
        const cell = document.createElement('div');
        cell.className = 'theme-bg-panel p-2 min-h-[100px] flex flex-col group cursor-pointer hover-theme-bg transition-colors relative';
        cell.onclick = () => openDrawer(dStr);

        const isToday = dStr === todayStr;
        let html = `
            <div class="flex justify-between items-start mb-1.5">
                <span class="text-sm font-bold ${isToday ? 'bg-blue-600 text-white w-6 h-6 rounded-md flex items-center justify-center' : 'opacity-60'}">${i}</span>
                <span class="opacity-0 group-hover:opacity-100 text-xs transition-opacity font-bold text-blue-500">+</span>
            </div>
            <div class="flex flex-col gap-1 overflow-hidden">
        `;

        dayEvents.slice(0, 3).forEach(e => {
            const styleCls = getStyle(e.type);
            html += `<div class="text-[10px] px-1.5 py-1 rounded border-l-2 truncate font-bold ${styleCls}">${e.start ? e.start+' ' : ''}${e.title}</div>`;
        });

        if (dayEvents.length > 3) {
            html += `<div class="text-[10px] font-bold opacity-50 mt-1">+${dayEvents.length - 3} 更多</div>`;
        }

        cell.innerHTML = html + `</div>`;
        monthGrid.appendChild(cell);
    }
}

function renderWeek() {
    weekGrid.innerHTML = '';
    const year = curDate.getFullYear(), month = curDate.getMonth();
    dateLabel.textContent = `${year}年 ${month + 1}月 (周视图)`;
    
    let d = new Date(curDate);
    let day = d.getDay();
    let diff = d.getDate() - day + (day === 0 ? -6 : 1);
    let monday = new Date(d.setDate(diff));

    for(let i=0; i<7; i++) {
        let currentDay = new Date(monday);
        currentDay.setDate(monday.getDate() + i);
        let dStr = currentDay.toISOString().split('T')[0];
        
        let dayEvents = events.filter(e => e.date === dStr);
        dayEvents = sortDayEvents(dayEvents);
        
        let html = `<div class="theme-bg-panel p-4 rounded-xl border theme-border flex gap-6 cursor-pointer hover-theme-bg" onclick="openDrawer('${dStr}')">
            <div class="w-16 font-black text-xl opacity-60">${currentDay.getDate()}日</div>
            <div class="flex-1 flex flex-col gap-2">`;
        
        if(dayEvents.length === 0) html += `<span class="opacity-30 text-sm font-bold">无排期</span>`;
        dayEvents.forEach(e => {
            html += `<div class="text-sm font-bold bg-black/5 px-3 py-1.5 rounded-lg w-max border-l-4 ${getStyle(e.type).split(' ')[0]}">${e.start ? e.start+' - ' : ''}${e.title}</div>`;
        });
        
        html += `</div></div>`;
        weekGrid.innerHTML += html;
    }
}

function renderYear() {
    yearGrid.innerHTML = '';
    dateLabel.textContent = `${curDate.getFullYear()} 年度概览`;
    const year = curDate.getFullYear();
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    
    let activityMap = {};
    events.forEach(e => activityMap[e.date] = (activityMap[e.date] || 0) + 1);

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const count = activityMap[dateStr] || 0;
        
        const cell = document.createElement('div');
        cell.className = 'heatmap-cell cursor-pointer';
        
        if (count === 0) cell.classList.add('bg-gray-500/10');
        else if (count === 1) cell.classList.add('bg-green-300');
        else if (count === 2) cell.classList.add('bg-green-500');
        else cell.classList.add('bg-green-700');
        
        cell.title = `${dateStr}: ${count} 项`;
        cell.onclick = () => openDrawer(dateStr);
        yearGrid.appendChild(cell);
    }
}

// --- 6. 右侧抽屉 (单日 CRUD) ---
window.openDrawer = (dateStr) => {
    selectedDrawerDate = dateStr;
    const parts = dateStr.split('-');
    drawerDateLabel.textContent = `${parseInt(parts[1])}月${parseInt(parts[2])}日`;
    
    renderDrawerList();
    
    document.body.classList.add('drawer-open');
    drawerInput.value = '';
    setTimeout(() => drawerInput.focus(), 300);
};

function renderDrawerList() {
    drawerList.innerHTML = '';
    let dayEvents = events.filter(e => e.date === selectedDrawerDate);
    dayEvents = sortDayEvents(dayEvents);
    
    if(dayEvents.length === 0) {
        drawerList.innerHTML = `<div class="opacity-40 text-sm font-bold text-center mt-10">今日暂无排期</div>`;
        return;
    }

    dayEvents.forEach(e => {
        const icon = getIcon(e.type);
        const styleCls = getStyle(e.type);
        // 抽屉内部生成对应的 Tag 名称
        const tagText = e.type === 'upsolve' ? '补题' : (e.type === 'offline' ? '线下赛' : (e.type === 'practice' ? '日常刷题' : '线上赛'));
        
        const item = document.createElement('div');
        item.className = `theme-bg-panel border theme-border p-3 rounded-lg flex justify-between items-center group shadow-sm border-l-4 ${styleCls.split(' ')[0]}`;
        item.innerHTML = `
            <div class="flex items-center gap-3 overflow-hidden">
                <span class="text-lg">${icon}</span>
                <div class="overflow-hidden">
                    <p class="font-bold text-sm truncate">${e.title}</p>
                    <p class="text-[10px] font-bold opacity-60 mt-0.5 px-1.5 py-0.5 bg-black/5 rounded inline-block">
                        ${tagText} | ${e.start ? e.start : '全天'}
                    </p>
                </div>
            </div>
            <button class="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 transition-opacity text-xl font-black px-2" onclick="deleteEvent(${e.id})">&times;</button>
        `;
        drawerList.appendChild(item);
    });
}

const closeDrawer = () => document.body.classList.remove('drawer-open');

window.deleteEvent = (id) => {
    events = events.filter(e => e.id !== id);
    saveEvents(); // 核心：删除也要同步到本地缓存
    renderDrawerList(); 
    renderViews();      
};

drawerInput.onkeydown = (e) => {
    if (e.key === 'Enter' && drawerInput.value.trim()) {
        parseAndSave(selectedDrawerDate, drawerInput.value.trim());
        drawerInput.value = '';
        renderDrawerList();
        renderViews();
    }
};

// --- 7. 全局 Modal (Ctrl+K) ---
const openModal = () => { globalModal.classList.add('modal-open'); globalInput.value = ''; globalInput.focus(); };
const closeModal = () => globalModal.classList.remove('modal-open');

document.getElementById('btn-global-add').onclick = openModal;
document.getElementById('btn-modal-cancel').onclick = closeModal;

// --- 8. NLP 解析与智能分类核心函数 ---
function parseAndSave(defaultDateStr, text) {
    let date = defaultDateStr;
    let start = '', end = '', title = text, type = 'match'; 
    
    const dateMatch = text.match(/(\d{1,2})[\.\-](\d{1,2})/);
    if(dateMatch) {
        date = `${curDate.getFullYear()}-${String(dateMatch[1]).padStart(2,'0')}-${String(dateMatch[2]).padStart(2,'0')}`;
        title = title.replace(dateMatch[0], '');
    }
    
    const timeMatch = text.match(/(\d{1,2})(?::\d{2})?\s*[~\-]\s*(\d{1,2})(?::\d{2})?/);
    if(timeMatch) {
        start = `${timeMatch[1].padStart(2,'0')}:00`; 
        end = `${timeMatch[2].padStart(2,'0')}:00`;
        title = title.replace(timeMatch[0], '');
    }

    // 智能文本分类引擎：提取输入里的关键词
    if (title.includes('补题')) {
        type = 'upsolve';
    } else if (title.includes('线下')) {
        type = 'offline';
        title = title.replace('线下', ''); 
    } else if (title.includes('刷题') || title.includes('日常')) {
        type = 'practice';
    } else {
        type = 'match'; // 都没有，默认线上赛
    }
    
    events.push({ id: Date.now(), date, start, end, title: title.trim(), type });
    saveEvents(); // 核心：每次新增必定存入本地缓存
}

document.getElementById('btn-modal-save').onclick = () => {
    if(globalInput.value.trim()) {
        parseAndSave(todayStr, globalInput.value.trim());
        renderViews();
        closeModal();
    }
};

globalInput.onkeydown = (e) => { if(e.key === 'Enter') document.getElementById('btn-modal-save').click(); };

// --- 9. 基础事件绑定 ---
document.getElementById('btn-prev').onclick = () => { curDate.setMonth(curDate.getMonth()-1); renderViews(); };
document.getElementById('btn-next').onclick = () => { curDate.setMonth(curDate.getMonth()+1); renderViews(); };
document.getElementById('btn-today').onclick = () => { curDate = new Date(); renderViews(); };

document.getElementById('btn-close-drawer').onclick = closeDrawer;
drawerOverlay.onclick = closeDrawer;

window.onkeydown = (e) => { 
    if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openModal(); }
    if(e.key === 'Escape') { closeModal(); closeDrawer(); }
};

// --- 初始化 ---
renderViews();