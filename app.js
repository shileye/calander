/**
 * ACM Calendar Pro - 终极云端同步版
 * Powered by JSONBin.io Cloud Database
 */

// --- 0. 云端数据库配置 (你的专属钥匙) ---
const BIN_ID = '69c692a5b7ec241ddcacd744';
const API_KEY = '$2a$10$McBJb7ymZkWZlVsYWyATMuiCQtTDFKdDpM2Bt5HLmJoedKnjHjxci';
const API_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

// 初始状态先从本地拿个底（防断网），等云端覆盖
let events = JSON.parse(localStorage.getItem('acm_pro_events')) || [];

// --- 核心：云同步保存引擎 (乐观更新机制) ---
function saveEvents() {
    // 1. 本地秒存（防丢失，保证刷新界面绝对零延迟）
    localStorage.setItem('acm_pro_events', JSON.stringify(events));
    
    // 2. 后台静默推送云端
    fetch(API_URL, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-Master-Key': API_KEY
        },
        body: JSON.stringify({ events: events }) // 包装成对象
    }).then(res => {
        if (!res.ok) console.warn("云端同步可能遇到波动...");
    }).catch(err => console.error("云端同步失败，已保存在本地缓存:", err));
}

// --- 状态管理 ---
let curDate = new Date(); 
const todayStr = new Date().toISOString().split('T')[0];
let currentView = 'month';
let selectedDrawerDate = null;
let currentSelectedType = 'match'; 
let pendingApiContests = []; 

// --- DOM 元素获取 ---
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
const apiModal = document.getElementById('api-modal');
const apiList = document.getElementById('api-list');

// --- 核心：初始化拉取云端数据 ---
async function initCloudData() {
    dateLabel.textContent = "☁️ 连接云端...";
    try {
        const res = await fetch(`${API_URL}/latest`, {
            method: 'GET',
            headers: { 'X-Master-Key': API_KEY }
        });
        if (res.ok) {
            const data = await res.json();
            // 拿到云端数组覆盖本地
            events = data.record.events || [];
            localStorage.setItem('acm_pro_events', JSON.stringify(events));
        }
    } catch (err) {
        console.error("无法连接云端数据库，降级使用本地缓存", err);
    }
    // 数据就绪，开始渲染界面
    renderViews();
}

// --- 分类与排序 ---
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
    if(type==='upsolve') return '🔥'; if(type==='offline') return '🚗';
    if(type==='match') return '🏆'; if(type==='practice') return '💻'; return '📅';
}

function getTypeName(type) {
    if(type==='upsolve') return '补题'; if(type==='offline') return '线下赛';
    if(type==='match') return '线上赛'; if(type==='practice') return '刷题'; return '其他';
}

// --- UI 交互与移动端适配 ---
function bindTypeSelectors(containerId) {
    const btns = document.getElementById(containerId).querySelectorAll('.type-btn');
    btns.forEach(btn => {
        btn.onclick = () => {
            currentSelectedType = btn.dataset.type;
            btns.forEach(b => {
                b.className = b.className.replace(/border-(purple|red|blue|green)-500 bg-(purple|red|blue|green)-500\/10 text-(purple|red|blue|green)-600/g, 'border-transparent opacity-50');
            });
            let colorCls = '';
            if(currentSelectedType === 'upsolve') colorCls = 'border-purple-500 bg-purple-500/10 text-purple-600 opacity-100';
            else if(currentSelectedType === 'offline') colorCls = 'border-red-500 bg-red-500/10 text-red-600 opacity-100';
            else if(currentSelectedType === 'match') colorCls = 'border-blue-500 bg-blue-500/10 text-blue-600 opacity-100';
            else colorCls = 'border-green-500 bg-green-500/10 text-green-600 opacity-100';
            
            btn.className = btn.className.replace('border-transparent opacity-50', '') + ' ' + colorCls;
        };
    });
}
bindTypeSelectors('drawer-type-btns');
bindTypeSelectors('modal-type-btns');

document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.onclick = (e) => {
        currentView = e.currentTarget.dataset.view;
        document.querySelectorAll('.nav-btn').forEach(b => {
            b.classList.remove('active', 'theme-bg-panel', 'opacity-100');
            b.classList.add('opacity-70');
            if(b.querySelector('span:nth-child(2)')) b.classList.add('opacity-50'); 
        });
        
        document.querySelectorAll(`.nav-btn[data-view="${currentView}"]`).forEach(b => {
            b.classList.add('active', 'opacity-100');
            b.classList.remove('opacity-70', 'opacity-50');
            if(b.classList.contains('w-full')) b.classList.add('theme-bg-panel'); 
        });

        document.querySelectorAll('.view-section').forEach(sec => sec.classList.add('hidden'));
        document.getElementById(`view-${currentView}`).classList.remove('hidden');
        document.getElementById(`view-${currentView}`).classList.add('flex');
        renderViews();
    };
});

const setTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelectorAll('.theme-btn').forEach(b => {
        b.classList.remove('active', 'opacity-100');
        b.classList.add('opacity-50');
    });
    const targetBtn = document.querySelector(`.theme-btn[data-set="${theme}"]`);
    if(targetBtn) { targetBtn.classList.add('active', 'opacity-100'); targetBtn.classList.remove('opacity-50'); }
}

document.querySelectorAll('.theme-btn').forEach(btn => btn.onclick = (e) => setTheme(e.currentTarget.dataset.set));

let mobileThemeIdx = 0;
const themes = ['light', 'dark', 'nature'];
document.getElementById('mobile-theme-toggle').onclick = () => {
    mobileThemeIdx = (mobileThemeIdx + 1) % 3;
    setTheme(themes[mobileThemeIdx]);
};

// --- 渲染引擎 ---
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

    for (let i = 1; i < firstDay; i++) monthGrid.innerHTML += `<div class="theme-bg-panel opacity-40"></div>`;

    for (let i = 1; i <= days; i++) {
        const dStr = `${year}-${String(month+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
        let dayEvents = sortDayEvents(events.filter(e => e.date === dStr));
        
        const cell = document.createElement('div');
        cell.className = 'theme-bg-panel p-1 md:p-2 min-h-[80px] md:min-h-[100px] flex flex-col group cursor-pointer hover-theme-bg transition-colors relative';
        cell.onclick = () => openDrawer(dStr);

        const isToday = dStr === todayStr;
        let html = `
            <div class="flex justify-between items-start mb-1 md:mb-1.5">
                <span class="text-[10px] md:text-sm font-bold ${isToday ? 'bg-blue-600 text-white w-5 h-5 md:w-6 md:h-6 rounded-md flex items-center justify-center' : 'opacity-60'}">${i}</span>
            </div>
            <div class="flex flex-col gap-0.5 md:gap-1 overflow-hidden">
        `;

        dayEvents.slice(0, 3).forEach(e => {
            html += `<div class="text-[8px] md:text-[10px] px-1 md:px-1.5 py-0.5 md:py-1 rounded border-l-2 truncate font-bold ${getStyle(e.type)}">${e.start ? e.start+' ' : ''}${e.title}</div>`;
        });

        if (dayEvents.length > 3) html += `<div class="text-[8px] font-bold opacity-50 mt-1">+${dayEvents.length - 3}</div>`;

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
    let sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
    dateLabel.textContent = `${monday.getMonth()+1}/${monday.getDate()} - ${sunday.getMonth()+1}/${sunday.getDate()}`;

    const weekDays = ['一', '二', '三', '四', '五', '六', '日'];

    for(let i=0; i<7; i++) {
        let currentDay = new Date(monday); currentDay.setDate(monday.getDate() + i);
        let dStr = currentDay.toISOString().split('T')[0];
        let dayEvents = sortDayEvents(events.filter(e => e.date === dStr));
        const isToday = dStr === todayStr;
        
        let html = `<div class="theme-bg-panel p-3 md:p-5 rounded-xl border theme-border flex gap-3 md:gap-6 cursor-pointer hover-theme-bg transition-colors" onclick="openDrawer('${dStr}')">
            <div class="w-12 md:w-20 flex flex-col items-center justify-center border-r theme-border pr-2 md:pr-6">
                <span class="text-[10px] md:text-sm font-bold opacity-50">周${weekDays[i]}</span>
                <span class="text-xl md:text-2xl font-black ${isToday ? 'text-blue-500' : 'opacity-80'} mt-1">${currentDay.getDate()}</span>
            </div>
            <div class="flex-1 flex flex-col justify-center gap-1.5 md:gap-2 overflow-hidden">`;
        
        if(dayEvents.length === 0) html += `<span class="opacity-30 text-xs font-bold">无任务</span>`;
        else {
            dayEvents.forEach(e => {
                html += `<div class="text-[10px] md:text-sm font-bold bg-black/5 px-2 md:px-3 py-1 md:py-1.5 rounded-lg w-full md:w-max border-l-4 ${getStyle(e.type).split(' ')[0]} flex items-center gap-1 md:gap-2 truncate">
                        <span>${getIcon(e.type)}</span>
                        <span class="truncate">${e.start ? e.start+' - ' : ''}${e.title}</span>
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
    dateLabel.textContent = `${year} 热力图`;
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    let activityMap = {};
    events.forEach(e => activityMap[e.date] = (activityMap[e.date] || 0) + 1);

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const count = activityMap[dateStr] || 0;
        const cell = document.createElement('div');
        cell.className = 'w-2 h-2 md:w-3.5 md:h-3.5 rounded-sm transition-transform hover:scale-125 cursor-pointer';
        
        if (count === 0) cell.classList.add('bg-gray-500/10');
        else if (count === 1) cell.classList.add('bg-green-300');
        else if (count === 2) cell.classList.add('bg-green-500');
        else cell.classList.add('bg-green-700');
        
        cell.onclick = () => { curDate = new Date(d); currentView = 'month'; document.querySelector('[data-view="month"]').click(); openDrawer(dateStr); };
        yearGrid.appendChild(cell);
    }
}

// --- 抽屉管理 ---
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
    let dayEvents = sortDayEvents(events.filter(e => e.date === selectedDrawerDate));
    if(dayEvents.length === 0) {
        drawerList.innerHTML = `<div class="opacity-40 text-sm font-bold text-center mt-10">今日无任务，自由安排</div>`;
        return;
    }

    dayEvents.forEach(e => {
        const item = document.createElement('div');
        item.className = `theme-bg-panel border theme-border p-3 rounded-lg flex justify-between items-center group shadow-sm border-l-4 ${getStyle(e.type).split(' ')[0]}`;
        item.innerHTML = `
            <div class="flex items-center gap-2 md:gap-3 overflow-hidden">
                <span class="text-base md:text-lg">${getIcon(e.type)}</span>
                <div class="overflow-hidden">
                    <p class="font-bold text-xs md:text-sm truncate">${e.title}</p>
                    <p class="text-[8px] md:text-[10px] font-bold opacity-60 mt-0.5 px-1.5 py-0.5 bg-black/5 rounded inline-block">
                        ${getTypeName(e.type)} | ${e.start ? e.start : '全天'}
                    </p>
                </div>
            </div>
            <button class="opacity-100 md:opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 transition-opacity text-xl font-black px-2" onclick="deleteEvent(${e.id})">&times;</button>
        `;
        drawerList.appendChild(item);
    });
}

const closeDrawer = () => document.body.classList.remove('drawer-open');
window.deleteEvent = (id) => { events = events.filter(e => e.id !== id); saveEvents(); renderDrawerList(); renderViews(); };

drawerInput.onkeydown = (e) => {
    if (e.key === 'Enter' && drawerInput.value.trim()) {
        parseAndSave(selectedDrawerDate, drawerInput.value.trim());
        drawerInput.value = ''; renderDrawerList(); renderViews();
    }
};

// --- Modal 录入 ---
const openModal = () => { globalModal.classList.add('modal-open'); globalInput.value = ''; globalInput.focus(); };
const closeModal = () => globalModal.classList.remove('modal-open');
document.querySelectorAll('.btn-global-add').forEach(btn => btn.onclick = openModal);
document.getElementById('btn-modal-cancel').onclick = closeModal;

function parseAndSave(defaultDateStr, text) {
    let date = defaultDateStr; let start = '', end = '', title = text, type = currentSelectedType; 
    const dateMatch = text.match(/(\d{1,2})[\.\-](\d{1,2})/);
    if(dateMatch) {
        date = `${curDate.getFullYear()}-${String(dateMatch[1]).padStart(2,'0')}-${String(dateMatch[2]).padStart(2,'0')}`;
        title = title.replace(dateMatch[0], '');
    }
    const timeMatch = text.match(/(\d{1,2})(?::\d{2})?\s*[~\-]\s*(\d{1,2})(?::\d{2})?/);
    if(timeMatch) {
        start = `${timeMatch[1].padStart(2,'0')}:00`; end = `${timeMatch[2].padStart(2,'0')}:00`;
        title = title.replace(timeMatch[0], '');
    }
    events.push({ id: Date.now() + Math.random(), date, start, end, title: title.trim(), type });
    saveEvents(); 
}

document.getElementById('btn-modal-save').onclick = () => {
    if(globalInput.value.trim()) { parseAndSave(todayStr, globalInput.value.trim()); renderViews(); closeModal(); }
};
globalInput.onkeydown = (e) => { if(e.key === 'Enter') document.getElementById('btn-modal-save').click(); };

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
    if(e.key === 'Escape') { closeModal(); closeDrawer(); closeApiModal(); }
};

// --- 数据同步与备份 ---
document.getElementById('btn-export-json').onclick = () => {
    const a = document.createElement('a');
    a.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(events));
    a.download = "acm_pro_backup.json"; a.click();
};

document.getElementById('input-import-json').onchange = (e) => {
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const imported = JSON.parse(ev.target.result);
            if(Array.isArray(imported)) { events = imported; saveEvents(); renderViews(); alert('✅ 数据恢复成功！'); }
        } catch(err) { alert('❌ 文件格式不对！'); }
    };
    reader.readAsText(file); e.target.value = '';
};

document.getElementById('btn-export-ics').onclick = () => {
    if(events.length === 0) return alert("没有排期任务可以导出！");
    let ics = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//ACM Pro//CN\n";
    events.forEach(e => {
        ics += "BEGIN:VEVENT\n";
        let startStr = e.date.replace(/-/g, '');
        if(e.start) {
            startStr += "T" + e.start.replace(':', '') + "00";
            ics += `DTSTART:${startStr}\nDTEND:${e.date.replace(/-/g, '')}T${e.end ? e.end.replace(':','') : e.start.replace(':','')}00\n`;
        } else {
            ics += `DTSTART;VALUE=DATE:${startStr}\n`;
        }
        ics += `SUMMARY:[${getTypeName(e.type)}] ${e.title}\nEND:VEVENT\n`;
    });
    ics += "END:VCALENDAR";
    const a = document.createElement('a');
    a.href = "data:text/calendar;charset=utf-8," + encodeURIComponent(ics);
    a.download = "acm_schedule.ics"; a.click();
};

// --- 🔪 终极武器：智能 API 抓取与用户筛选 Modal ---
const closeApiModal = () => {
    apiModal.classList.remove('modal-open');
    document.getElementById('api-modal-content').classList.add('scale-95');
}
document.getElementById('btn-close-api').onclick = closeApiModal;
document.getElementById('btn-api-cancel').onclick = closeApiModal;

document.getElementById('btn-fetch-api').onclick = async () => {
    const btn = document.getElementById('btn-fetch-api');
    const originalText = btn.innerHTML;
    btn.innerHTML = `<span>⏳</span> <span class="hidden md:inline">抓取中...</span>`;
    btn.disabled = true;

    try {
        const res = await fetch('https://kontests.net/api/v1/all');
        if (!res.ok) throw new Error('Network response was not ok');
        const data = await res.json();
        
        pendingApiContests = [];
        const now = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(now.getDate() + 7);

        const targetSites = ['CodeForces', 'AtCoder', 'NowCoder'];

        data.forEach(contest => {
            const siteMatch = targetSites.some(s => contest.site.toLowerCase().includes(s.toLowerCase()));
            if(!siteMatch) return;

            const startDate = new Date(contest.start_time);
            if (startDate < now || startDate > nextWeek) return;

            const dateStr = startDate.toISOString().split('T')[0];
            const startStr = startDate.toTimeString().substring(0, 5); 
            const endDate = new Date(contest.end_time);
            const endStr = endDate.toTimeString().substring(0, 5);
            const title = `[${contest.site}] ${contest.name}`;

            const exists = events.some(e => e.date === dateStr && e.title === title);
            
            if(!exists) {
                pendingApiContests.push({
                    date: dateStr, start: startStr, end: endStr, title: title, type: 'match'
                });
            }
        });

        if(pendingApiContests.length > 0) {
            apiList.innerHTML = pendingApiContests.map((c, idx) => `
                <label class="flex items-center gap-3 p-3 theme-bg-panel border theme-border rounded-lg cursor-pointer hover-theme-bg transition-colors">
                    <input type="checkbox" value="${idx}" class="w-5 h-5 accent-purple-600 rounded api-checkbox" checked>
                    <div class="flex-1 overflow-hidden">
                        <p class="font-bold text-sm truncate">${c.title}</p>
                        <p class="text-[10px] opacity-60 font-mono mt-0.5">${c.date} | ${c.start} - ${c.end}</p>
                    </div>
                </label>
            `).join('');
            
            apiModal.classList.add('modal-open');
            document.getElementById('api-modal-content').classList.remove('scale-95');
        } else {
            alert(`⚡ 抓取完毕。未来一周内没有新的 CF/AtCoder/牛客 比赛，或者你已经全添加了！`);
        }
    } catch (err) {
        console.error(err);
        alert(`❌ 抓取失败。免费的 Kontests API 刚刚抽风了。过会儿咱们再试。`);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
};

// --- 初始化入口 ---
initCloudData();