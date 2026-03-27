/**
 * ACM Calendar Pro - 逻辑引擎 (含 JSON 数据漫游与 ICS 手机日历同步)
 */

// --- 1. 数据与状态管理 ---
let events = JSON.parse(localStorage.getItem('acm_pro_events')) || [];

function saveEvents() {
    localStorage.setItem('acm_pro_events', JSON.stringify(events));
}

let curDate = new Date(); 
const todayStr = new Date().toISOString().split('T')[0];
let currentView = 'month';
let selectedDrawerDate = null;
let currentSelectedType = 'match'; 

// --- 2. 元素获取 ---
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

// --- 3. 分类与排序 ---
function getWeight(type) {
    if (type === 'upsolve') return 1;
    if (type === 'offline') return 2;
    if (type === 'match') return 3;
    return 4; 
}

function sortDayEvents(dayEvents) {
    return dayEvents.sort((a, b) => {
        const wA = getWeight(a.type);
        const wB = getWeight(b.type);
        if (wA !== wB) return wA - wB; 
        return (a.start || '24:00').localeCompare(b.start || '24:00'); 
    });
}

function getStyle(type) {
    switch(type) {
        case 'upsolve': return 'border-purple-500 bg-purple-500/10 text-purple-700'; 
        case 'offline': return 'border-red-500 bg-red-500/10 text-red-700';       
        case 'match': return 'border-blue-500 bg-blue-500/10 text-blue-700';      
        case 'practice': return 'border-green-500 bg-green-500/10 text-green-700';
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

function getTypeName(type) {
    switch(type) {
        case 'upsolve': return '补题'; 
        case 'offline': return '线下赛';
        case 'match': return '线上赛';
        case 'practice': return '刷题';
        default: return '其他';
    }
}

// --- 4. UI 交互：类型选择器与导航 ---
function bindTypeSelectors(containerId) {
    const btns = document.getElementById(containerId).querySelectorAll('.type-btn');
    btns.forEach(btn => {
        btn.onclick = () => {
            currentSelectedType = btn.dataset.type;
            btns.forEach(b => {
                b.className = 'type-btn flex-1 py-1.5 rounded border-2 border-transparent opacity-50 hover:opacity-100 transition-colors';
                if(containerId === 'modal-type-btns') b.className = 'type-btn px-3 py-1.5 rounded border-2 border-transparent opacity-50 hover:opacity-100 transition-colors';
            });
            let colorCls = '';
            if(currentSelectedType === 'upsolve') colorCls = 'border-purple-500 bg-purple-500/10 text-purple-600';
            else if(currentSelectedType === 'offline') colorCls = 'border-red-500 bg-red-500/10 text-red-600';
            else if(currentSelectedType === 'match') colorCls = 'border-blue-500 bg-blue-500/10 text-blue-600';
            else colorCls = 'border-green-500 bg-green-500/10 text-green-600';
            
            btn.className = `type-btn flex-1 py-1.5 rounded border-2 transition-colors ${colorCls}`;
            if(containerId === 'modal-type-btns') btn.className = `type-btn px-3 py-1.5 rounded border-2 transition-colors ${colorCls}`;
        };
    });
}
bindTypeSelectors('drawer-type-btns');
bindTypeSelectors('modal-type-btns');

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
        currentView = e.currentTarget.dataset.view;
        document.querySelectorAll('.nav-btn').forEach(b => {
            b.classList.remove('active', 'theme-bg-panel', 'opacity-100');
            b.classList.add('opacity-70');
        });
        e.currentTarget.classList.add('active', 'theme-bg-panel', 'opacity-100');
        e.currentTarget.classList.remove('opacity-70');

        document.querySelectorAll('.view-section').forEach(sec => sec.classList.add('hidden'));
        document.getElementById(`view-${currentView}`).classList.remove('hidden');
        document.getElementById(`view-${currentView}`).classList.add('flex');
        
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

        if (dayEvents.length > 3) html += `<div class="text-[10px] font-bold opacity-50 mt-1">+${dayEvents.length - 3} 更多</div>`;

        cell.innerHTML = html + `</div>`;
        monthGrid.appendChild(cell);
    }
}

function renderWeek() {
    weekGrid.innerHTML = '';
    
    let d = new Date(curDate);
    let day = d.getDay();
    let diff = d.getDate() - day + (day === 0 ? -6 : 1);
    let monday = new Date(d.setDate(diff));
    
    let sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    dateLabel.textContent = `${monday.getMonth()+1}月${monday.getDate()}日 - ${sunday.getMonth()+1}月${sunday.getDate()}日`;

    const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

    for(let i=0; i<7; i++) {
        let currentDay = new Date(monday);
        currentDay.setDate(monday.getDate() + i);
        let dStr = currentDay.toISOString().split('T')[0];
        
        let dayEvents = events.filter(e => e.date === dStr);
        dayEvents = sortDayEvents(dayEvents);
        
        const isToday = dStr === todayStr;
        
        let html = `<div class="theme-bg-panel p-5 rounded-xl border theme-border flex gap-6 cursor-pointer hover-theme-bg transition-colors" onclick="openDrawer('${dStr}')">
            <div class="w-20 flex flex-col items-center justify-center border-r theme-border pr-6">
                <span class="text-sm font-bold opacity-50">${weekDays[i]}</span>
                <span class="text-2xl font-black ${isToday ? 'text-blue-500' : 'opacity-80'} mt-1">${currentDay.getDate()}</span>
            </div>
            <div class="flex-1 flex flex-col justify-center gap-2">`;
        
        if(dayEvents.length === 0) {
            html += `<span class="opacity-30 text-sm font-bold">无排期任务</span>`;
        } else {
            dayEvents.forEach(e => {
                const styleCls = getStyle(e.type);
                html += `
                    <div class="text-sm font-bold bg-black/5 px-3 py-1.5 rounded-lg w-max border-l-4 ${styleCls.split(' ')[0]} flex items-center gap-2">
                        <span>${getIcon(e.type)}</span>
                        <span>${e.start ? e.start+' - ' : ''}${e.title}</span>
                    </div>`;
            });
        }
        
        html += `</div></div>`;
        weekGrid.innerHTML += html;
    }
}

function renderYear() {
    yearGrid.innerHTML = '';
    const year = curDate.getFullYear();
    dateLabel.textContent = `${year} 年度热力图`;
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
        cell.onclick = () => { curDate = new Date(d); currentView = 'month'; document.querySelector('[data-view="month"]').click(); openDrawer(dateStr); };
        yearGrid.appendChild(cell);
    }
}

// --- 6. 右侧抽屉 ---
window.openDrawer = (dateStr) => {
    selectedDrawerDate = dateStr;
    const parts = dateStr.split('-');
    drawerDateLabel.textContent = `${parseInt(parts[1])}月${parseInt(parts[2])}日`;
    renderDrawerList();
    document.body.classList.add('drawer-open');
    drawerInput.value = '';
    document.getElementById('drawer-type-btns').firstElementChild.click();
    setTimeout(() => drawerInput.focus(), 300);
};

function renderDrawerList() {
    drawerList.innerHTML = '';
    let dayEvents = events.filter(e => e.date === selectedDrawerDate);
    dayEvents = sortDayEvents(dayEvents);
    
    if(dayEvents.length === 0) {
        drawerList.innerHTML = `<div class="opacity-40 text-sm font-bold text-center mt-10">今日无任务，自由安排</div>`;
        return;
    }

    dayEvents.forEach(e => {
        const styleCls = getStyle(e.type);
        const item = document.createElement('div');
        item.className = `theme-bg-panel border theme-border p-3 rounded-lg flex justify-between items-center group shadow-sm border-l-4 ${styleCls.split(' ')[0]}`;
        item.innerHTML = `
            <div class="flex items-center gap-3 overflow-hidden">
                <span class="text-lg">${getIcon(e.type)}</span>
                <div class="overflow-hidden">
                    <p class="font-bold text-sm truncate">${e.title}</p>
                    <p class="text-[10px] font-bold opacity-60 mt-0.5 px-1.5 py-0.5 bg-black/5 rounded inline-block">
                        ${getTypeName(e.type)} | ${e.start ? e.start : '全天'}
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
    saveEvents(); 
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

// --- 7. Modal 逻辑 ---
const openModal = () => { 
    globalModal.classList.add('modal-open'); 
    globalInput.value = ''; 
    document.getElementById('modal-type-btns').firstElementChild.click();
    globalInput.focus(); 
};
const closeModal = () => globalModal.classList.remove('modal-open');

document.getElementById('btn-global-add').onclick = openModal;
document.getElementById('btn-modal-cancel').onclick = closeModal;

// --- 8. 解析与保存 ---
function parseAndSave(defaultDateStr, text) {
    let date = defaultDateStr;
    let start = '', end = '', title = text;
    let type = currentSelectedType; 
    
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

    events.push({ id: Date.now(), date, start, end, title: title.trim(), type });
    saveEvents(); 
}

document.getElementById('btn-modal-save').onclick = () => {
    if(globalInput.value.trim()) {
        parseAndSave(todayStr, globalInput.value.trim());
        renderViews();
        closeModal();
    }
};

globalInput.onkeydown = (e) => { if(e.key === 'Enter') document.getElementById('btn-modal-save').click(); };

// --- 9. 全局翻页与事件绑定 ---
document.getElementById('btn-prev').onclick = () => { 
    if(currentView === 'month') curDate.setMonth(curDate.getMonth() - 1); 
    else if(currentView === 'week') curDate.setDate(curDate.getDate() - 7);
    else if(currentView === 'year') curDate.setFullYear(curDate.getFullYear() - 1);
    renderViews(); 
};
document.getElementById('btn-next').onclick = () => { 
    if(currentView === 'month') curDate.setMonth(curDate.getMonth() + 1); 
    else if(currentView === 'week') curDate.setDate(curDate.getDate() + 7);
    else if(currentView === 'year') curDate.setFullYear(curDate.getFullYear() + 1);
    renderViews(); 
};
document.getElementById('btn-today').onclick = () => { curDate = new Date(); renderViews(); };

document.getElementById('btn-close-drawer').onclick = closeDrawer;
drawerOverlay.onclick = closeDrawer;

window.onkeydown = (e) => { 
    if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openModal(); }
    if(e.key === 'Escape') { closeModal(); closeDrawer(); }
};

// --- 10. 高级核心：数据导入导出与 ICS 手机日历互通 ---

// 1. 下载备份 JSON
document.getElementById('btn-export-json').onclick = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(events));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = "acm_pro_backup.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
};

// 2. 上传恢复 JSON
document.getElementById('input-import-json').onchange = (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const imported = JSON.parse(event.target.result);
            if(Array.isArray(imported)) {
                events = imported;
                saveEvents();
                renderViews();
                alert('✅ 绝了兄弟！数据恢复成功！');
            }
        } catch(err) {
            alert('❌ 识别失败，文件格式不对啊兄弟！');
        }
    };
    reader.readAsText(file);
    e.target.value = ''; // 重置文件框
};

// 3. 导出到系统/手机日历 (.ics 格式协议)
document.getElementById('btn-export-ics').onclick = () => {
    if(events.length === 0) {
        alert("当前没有排期任务可以导出哦！");
        return;
    }
    
    let icsMSG = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//ACM Pro Calendar//CN\n";
    
    events.forEach(e => {
        icsMSG += "BEGIN:VEVENT\n";
        let startStr = e.date.replace(/-/g, '');
        
        if(e.start) {
            // 将带时间的任务转换为 ics 的悬浮时间标准
            startStr += "T" + e.start.replace(':', '') + "00";
            let endStr = e.date.replace(/-/g, '') + "T" + (e.end ? e.end.replace(':', '') + "00" : e.start.replace(':', '') + "00");
            icsMSG += `DTSTART:${startStr}\nDTEND:${endStr}\n`;
        } else {
            // 全天任务
            icsMSG += `DTSTART;VALUE=DATE:${startStr}\n`;
        }
        
        icsMSG += `SUMMARY:[${getTypeName(e.type)}] ${e.title}\n`;
        icsMSG += "END:VEVENT\n";
    });
    
    icsMSG += "END:VCALENDAR";
    
    const dataStr = "data:text/calendar;charset=utf-8," + encodeURIComponent(icsMSG);
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = "acm_schedule.ics";
    document.body.appendChild(a);
    a.click();
    a.remove();
};

// 初始化
renderViews();