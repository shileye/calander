// ================= 数据中心 =================
// 结构: [{ id, date, time, title, category: 'comp'|'train'|'exam', priority: 0|1|2 }]
let tasks = JSON.parse(localStorage.getItem('awakesTasks')) || [];

// 初始化运行
init();

function init() {
    setupEventListeners();
    renderAll();
}

function saveData() {
    // 每次保存前，按日期和时间排序
    tasks.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return (a.time || "24:00").localeCompare(b.time || "24:00");
    });
    localStorage.setItem('awakesTasks', JSON.stringify(tasks));
    renderAll();
}

function renderAll() {
    updateStats();
    renderTimeline();
    renderCalendar();
}

// ================= 极客命令行解析引擎 =================
const magicInput = document.getElementById('magic-input');

magicInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && this.value.trim() !== '') {
        parseCommand(this.value.trim());
        this.value = '';
    }
});

function parseCommand(text) {
    let dateStr = getTodayStr();
    let timeStr = "";
    let category = "train"; // 默认是训练计划
    let priority = 1;       // 默认 P1
    let title = text;

    // 1. 抓取日期 (支持 4.15, 4-15, 明天)
    const dateMatch = text.match(/(\d{1,2})[\.\-](\d{1,2})/);
    if (dateMatch) {
        const year = new Date().getFullYear();
        const m = String(dateMatch[1]).padStart(2, '0');
        const d = String(dateMatch[2]).padStart(2, '0');
        dateStr = `${year}-${m}-${d}`;
        title = title.replace(dateMatch[0], '');
    } else if (text.includes('明天')) {
        const t = new Date(); t.setDate(t.getDate() + 1);
        dateStr = getFormattedDate(t);
        title = title.replace('明天', '');
    }

    // 2. 抓取时间 (支持 19:00, 09:30)
    const timeMatch = text.match(/(\d{1,2}:\d{2})/);
    if (timeMatch) {
        timeStr = timeMatch[1];
        title = title.replace(timeMatch[0], '');
    }

    // 3. 抓取分类 (比赛 / 训练 / 考研)
    if (text.includes('#比赛') || text.includes('赛')) { category = 'comp'; title = title.replace('#比赛', ''); }
    else if (text.includes('#考研') || text.includes('复习')) { category = 'exam'; title = title.replace('#考研', ''); }
    else if (text.includes('#训练') || text.includes('#计划')) { category = 'train'; title = title.replace('#训练', ''); title = title.replace('#计划', '');}

    // 4. 抓取优先级 (!0 = P0, !1 = P1)
    if (text.includes('!0')) { priority = 0; title = title.replace('!0', ''); }
    else if (text.includes('!1')) { priority = 1; title = title.replace('!1', ''); }
    else if (text.includes('!2')) { priority = 2; title = title.replace('!2', ''); }

    // 5. 净化标题
    title = title.trim().replace(/\s+/g, ' ');
    if(!title) title = "未命名训练任务";

    // 压入数据栈并保存
    tasks.push({
        id: Date.now().toString(),
        date: dateStr,
        time: timeStr,
        title: title,
        category: category,
        priority: priority
    });
    
    saveData();
}

// ================= 左侧导航与雷达统计 =================
function setupEventListeners() {
    // 视图切换
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            // 切导航高亮
            navItems.forEach(n => n.classList.remove('active'));
            this.classList.add('active');
            // 切视图展示
            const targetId = `view-${this.dataset.target}`;
            document.querySelectorAll('.view-container').forEach(v => v.classList.remove('active'));
            document.getElementById(targetId).classList.add('active');
        });
    });

    // 日历月份切换
    document.getElementById('cal-prev').addEventListener('click', () => changeMonth(-1));
    document.getElementById('cal-next').addEventListener('click', () => changeMonth(1));
}

function updateStats() {
    const today = getTodayStr();
    // 仅统计今天及以后的任务
    const futureTasks = tasks.filter(t => t.date >= today);
    document.getElementById('stat-comp').innerText = futureTasks.filter(t => t.category === 'comp').length;
    document.getElementById('stat-train').innerText = futureTasks.filter(t => t.category === 'train').length;
    document.getElementById('stat-exam').innerText = futureTasks.filter(t => t.category === 'exam').length;
}

// ================= 视图 1：时间轴瀑布流 =================
function renderTimeline() {
    const container = document.getElementById('timeline-content');
    container.innerHTML = '';
    
    if (tasks.length === 0) {
        container.innerHTML = '<div style="color:var(--text-muted); padding: 40px; text-align:center;">暂无部署任务。请在上方输入框下达指令。</div>';
        return;
    }

    let currentMonth = '';
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const catLabels = { comp: '比赛', train: '训练', exam: '考研' };

    tasks.forEach(task => {
        const d = new Date(task.date);
        const monthStr = `${d.getFullYear()}年 ${d.getMonth() + 1}月`;
        
        // 分割月份线
        if (monthStr !== currentMonth) {
            container.innerHTML += `<div class="month-divider">${monthStr}</div>`;
            currentMonth = monthStr;
        }

        const dayNum = String(d.getDate()).padStart(2, '0');
        const weekStr = weekdays[d.getDay()];

        container.innerHTML += `
            <div class="task-item">
                <div class="task-date">
                    <div class="task-day">${dayNum}</div>
                    <div class="task-week">${weekStr}</div>
                </div>
                <div class="task-core">
                    <div class="task-title">
                        <span class="p-dot p-${task.priority}"></span>
                        ${task.title}
                        <span class="tag tag-${task.category}">${catLabels[task.category]}</span>
                    </div>
                    <div class="task-meta">
                        ${task.time ? `<span><i class="ri-time-line"></i> ${task.time}</span>` : ''}
                        <span><i class="ri-calendar-line"></i> ${task.date}</span>
                    </div>
                </div>
                <div class="task-actions">
                    <button class="del-btn" onclick="deleteTask('${task.id}')" title="抹杀此任务"><i class="ri-delete-bin-line"></i></button>
                </div>
            </div>
        `;
    });
}

function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    saveData();
}

// ================= 视图 2：战略日历网格 =================
let calDate = new Date();

function renderCalendar() {
    const year = calDate.getFullYear();
    const month = calDate.getMonth();
    document.getElementById('cal-month-title').innerText = `${year}.${String(month+1).padStart(2,'0')}`;
    
    const grid = document.getElementById('cal-grid');
    grid.innerHTML = `
        <div class="cal-header-cell">MON</div><div class="cal-header-cell">TUE</div><div class="cal-header-cell">WED</div>
        <div class="cal-header-cell">THU</div><div class="cal-header-cell">FRI</div><div class="cal-header-cell">SAT</div><div class="cal-header-cell">SUN</div>
    `;

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    // JS默认周日为0，我们转换为周一为起点
    let startDayOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const todayStr = getTodayStr();

    // 1. 渲染上个月的灰色尾巴
    for (let i = startDayOffset - 1; i >= 0; i--) {
        grid.innerHTML += `<div class="cal-cell other-month"><div class="cal-date-num">${prevMonthLastDay - i}</div></div>`;
    }

    // 2. 渲染本月
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isToday = (dateKey === todayStr);
        
        let dayHtml = '';
        tasks.filter(t => t.date === dateKey).forEach(task => {
            dayHtml += `
                <div class="cal-event ${task.category}">
                    <span class="p-dot p-${task.priority}" style="width:6px;height:6px;margin-right:4px;"></span>
                    ${task.time ? task.time + ' ' : ''}${task.title}
                </div>
            `;
        });

        grid.innerHTML += `
            <div class="cal-cell ${isToday ? 'today' : ''}">
                <div class="cal-date-num">${day}</div>
                ${dayHtml}
            </div>
        `;
    }

    // 3. 渲染下个月补齐格子 (补齐到 42 格 = 6行 x 7列)
    const totalRendered = startDayOffset + lastDay.getDate();
    const remaining = 42 - totalRendered;
    for(let i = 1; i <= remaining; i++) {
        grid.innerHTML += `<div class="cal-cell other-month"><div class="cal-date-num">${i}</div></div>`;
    }
}

function changeMonth(step) {
    calDate.setMonth(calDate.getMonth() + step);
    renderCalendar();
}

// ================= 工具函数 =================
function getTodayStr() {
    return getFormattedDate(new Date());
}

function getFormattedDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}