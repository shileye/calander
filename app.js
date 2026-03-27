/**
 * ACM Calendar Pro - 核心逻辑引擎
 */

// --- 1. 数据与状态管理 ---
let events = [
    { id: 1, date: '2026-03-29', title: '牛客周赛 #12', start: '19:00', end: '21:00', type: 'match' },
    { id: 2, date: '2026-03-29', title: '补题: 状压DP', start: '', end: '', type: 'daily' },
    { id: 3, date: '2026-04-05', title: '蓝桥杯省赛线下', start: '09:00', end: '13:00', type: 'offline' }
];

let curDate = new Date(2026, 2, 1);
const todayStr = new Date().toISOString().split('T')[0];
let currentView = 'month';
let selectedDrawerDate = null; // 右侧抽屉当前绑定的日期

// --- 2. DOM 元素 ---
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

// --- 3. 主题与导航切换 ---
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
        
        // 更新导航样式
        document.querySelectorAll('.nav-btn').forEach(b => {
            b.classList.remove('active', 'theme-bg-panel', 'opacity-100');
            b.classList.add('opacity-70');
        });
        e.currentTarget.classList.add('active', 'theme-bg-panel', 'opacity-100');
        e.currentTarget.classList.remove('opacity-70');

        // 切换视图容器
        document.querySelectorAll('.view-section').forEach(sec => sec.classList.add('hidden'));
        document.getElementById(`view-${view}`).classList.remove('hidden');
        document.getElementById(`view-${view}`).classList.add('flex');
        
        renderViews();
    };
});

// --- 4. 渲染引擎 ---
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

    // 填充空白
    for (let i = 1; i < firstDay; i++) monthGrid.innerHTML += `<div class="theme-bg-panel opacity-50"></div>`;

    for (let i = 1; i <= days; i++) {
        const dStr = `${year}-${String(month+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
        const dayEvents = events.filter(e => e.date === dStr).sort((a,b) => (a.start||'').localeCompare(b.start||''));
        
        const cell = document.createElement('div');
        cell.className = 'theme-bg-panel p-2 min-h-[100px] flex flex-col group cursor-pointer hover-theme-bg transition-colors relative';
        
        // 点击格子，弹出右侧抽屉
        cell.onclick = () => openDrawer(dStr);

        const isToday = dStr === todayStr;
        let html = `
            <div class="flex justify-between items-start mb-1.5">
                <span class="text-sm font-bold ${isToday ? 'bg-blue-600 text-white w-6 h-6 rounded-md flex items-center justify-center' : 'opacity-60'}">${i}</span>
                <span class="opacity-0 group-hover:opacity-100 text-xs transition-opacity font-bold text-blue-500">+</span>
            </div>
            <div class="flex flex-col gap-1 overflow-hidden">
        `;

        // 最多显示3个，防挤压
        dayEvents.slice(0, 3).forEach(e => {
            let colorCls = e.type === 'offline' ? 'border-red-500 bg-red-500/10 text-red-600' : 
                          (e.type === 'match' ? 'border-blue-500 bg-blue-500/10 text-blue-600' : 'border-gray-400 bg-gray-500/10 opacity-80');
            html += `<div class="text-[10px] px-1.5 py-1 rounded border-l-2 truncate font-bold ${colorCls}">${e.start ? e.start+' ' : ''}${e.title}</div>`;
        });

        if (dayEvents.length > 3) {
            html += `<div class="text-[10px] font-bold opacity-50 mt-1">+${dayEvents.length - 3} 更多</div>`;
        }

        cell.innerHTML = html + `</div>`;
        monthGrid.appendChild(cell);
    }
}

function renderWeek() {
    // 简易周视图逻辑
    weekGrid.innerHTML = '';
    const year = curDate.getFullYear(), month = curDate.getMonth();
    dateLabel.textContent = `${year}年 ${month + 1}月 (周视图)`;
    
    // 取当前日期的这周一到周日
    let d = new Date(curDate);
    let day = d.getDay();
    let diff = d.getDate() - day + (day === 0 ? -6 : 1);
    let monday = new Date(d.setDate(diff));

    for(let i=0; i<7; i++) {
        let currentDay = new Date(monday);
        currentDay.setDate(monday.getDate() + i);
        let dStr = currentDay.toISOString().split('T')[0];
        let dayEvents = events.filter(e => e.date === dStr);
        
        let html = `<div class="theme-bg-panel p-4 rounded-xl border theme-border flex gap-6 cursor-pointer hover-theme-bg" onclick="openDrawer('${dStr}')">
            <div class="w-16 font-black text-xl opacity-60">${currentDay.getDate()}日</div>
            <div class="flex-1 flex flex-col gap-2">`;
        
        if(dayEvents.length === 0) html += `<span class="opacity-30 text-sm font-bold">无排期</span>`;
        dayEvents.forEach(e => {
            html += `<div class="text-sm font-bold bg-black/5 px-3 py-1.5 rounded-lg w-max">${e.start ? e.start+' - ' : ''}${e.title}</div>`;
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
        
        // 动态计算颜色
        if (count === 0) cell.classList.add('bg-gray-500/10');
        else if (count === 1) cell.classList.add('bg-green-300');
        else if (count === 2) cell.classList.add('bg-green-500');
        else cell.classList.add('bg-green-700');
        
        cell.title = `${dateStr}: ${count} 项`;
        cell.onclick = () => openDrawer(dateStr);
        yearGrid.appendChild(cell);
    }
}

// --- 5. 右侧抽屉 (单日 CRUD) ---
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
    const dayEvents = events.filter(e => e.date === selectedDrawerDate).sort((a,b) => (a.start||'').localeCompare(b.start||''));
    
    if(dayEvents.length === 0) {
        drawerList.innerHTML = `<div class="opacity-40 text-sm font-bold text-center mt-10">今日暂无排期</div>`;
        return;
    }

    dayEvents.forEach(e => {
        let icon = e.type === 'offline' ? '🚗' : (e.type === 'match' ? '🏆' : '💻');
        const item = document.createElement('div');
        item.className = 'theme-bg-panel border theme-border p-3 rounded-lg flex justify-between items-center group shadow-sm';
        item.innerHTML = `
            <div class="flex items-center gap-3 overflow-hidden">
                <span class="text-lg">${icon}</span>
                <div class="overflow-hidden">
                    <p class="font-bold text-sm truncate">${e.title}</p>
                    <p class="text-xs font-mono opacity-50 mt-0.5">${e.start ? e.start : '全天'}</p>
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
    renderDrawerList(); // 刷新抽屉
    renderViews();      // 刷新底层日历
};

// 抽屉内快捷录入
drawerInput.onkeydown = (e) => {
    if (e.key === 'Enter' && drawerInput.value.trim()) {
        parseAndSave(selectedDrawerDate, drawerInput.value.trim());
        drawerInput.value = '';
        renderDrawerList();
        renderViews();
    }
};

// --- 6. 全局 Modal (Ctrl+K) ---
const openModal = () => { globalModal.classList.add('modal-open'); globalInput.value = ''; globalInput.focus(); };
const closeModal = () => globalModal.classList.remove('modal-open');

document.getElementById('btn-global-add').onclick = openModal;
document.getElementById('btn-modal-cancel').onclick = closeModal;

// NLP 解析保存核心函数
function parseAndSave(defaultDateStr, text) {
    let date = defaultDateStr;
    let start = '', end = '', title = text, type = 'match';
    
    // 解析日期 3.29
    const dateMatch = text.match(/(\d{1,2})[\.\-](\d{1,2})/);
    if(dateMatch) {
        date = `${curDate.getFullYear()}-${String(dateMatch[1]).padStart(2,'0')}-${String(dateMatch[2]).padStart(2,'0')}`;
        title = title.replace(dateMatch[0], '');
    }
    
    // 解析时间 19~21 或 19:00
    const timeMatch = text.match(/(\d{1,2})(?::\d{2})?\s*[~\-]\s*(\d{1,2})(?::\d{2})?/);
    if(timeMatch) {
        start = `${timeMatch[1].padStart(2,'0')}:00`; 
        end = `${timeMatch[2].padStart(2,'0')}:00`;
        title = title.replace(timeMatch[0], '');
    }

    if(title.includes('线下')) { type = 'offline'; title = title.replace('线下', ''); }
    else if(title.includes('补题') || title.includes('日常')) type = 'daily';
    
    events.push({ id: Date.now(), date, start, end, title: title.trim(), type });
}

document.getElementById('btn-modal-save').onclick = () => {
    if(globalInput.value.trim()) {
        parseAndSave(todayStr, globalInput.value.trim());
        renderViews();
        closeModal();
    }
};

globalInput.onkeydown = (e) => { if(e.key === 'Enter') document.getElementById('btn-modal-save').click(); };

// --- 7. 全局事件绑定 ---
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