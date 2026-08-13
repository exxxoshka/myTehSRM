// ============================================
// app.js — Главный файл приложения
// Инициализация, события, горячие клавиши
// ============================================

// Глобальные переменные
let modeManager;
let appInitialized = false;

/**
 * Инициализация приложения
 */
function initApp() {
    try {
        console.log('🚀 Запуск АРМ Конструктора СТО...');
        
        // Проверяем наличие Firebase
        if (typeof firebase === 'undefined') {
            throw new Error('Firebase не загружен. Проверьте подключение к интернету.');
        }
        
        // Проверяем конфигурацию
        if (!firebaseConfig || !firebaseConfig.apiKey || firebaseConfig.apiKey === 'ВАШ_API_KEY') {
            showNotification('⚠️ Настройте Firebase в файле firebase-config.js', 'warning', 5000);
            document.getElementById('tableBody').innerHTML = `
                <tr>
                    <td colspan="10" style="text-align: center; padding: 40px; color: #ff8c00; font-size: 16px;">
                        ⚠️ Требуется настройка Firebase<br>
                        <span style="font-size: 13px; color: #999;">
                            Отредактируйте файл firebase-config.js и вставьте свои данные
                        </span>
                    </td>
                </tr>
            `;
            return;
        }
        
        // Создаем менеджер режимов
        modeManager = new ModeManager();
        window.modeManager = modeManager; // Для доступа из HTML
        
        // Устанавливаем текущий режим
        modeManager.switchMode('plan');
        
        // Настраиваем обработчики событий
        setupEventListeners();
        
        // Загружаем тестовые данные, если они не загружены
        setTimeout(async () => {
            try {
                await db.loadTestData();
                // Обновляем данные после загрузки
                modeManager.loadData();
            } catch (error) {
                console.warn('⚠️ Ошибка при загрузке тестовых данных:', error.message);
            }
        }, 1000);
        
        appInitialized = true;
        console.log('✅ Приложение успешно запущено');
        showNotification('✅ АРМ Конструктора СТО запущен', 'success', 2000);
        
    } catch (error) {
        console.error('❌ Критическая ошибка при инициализации:', error);
        showNotification(`❌ Ошибка запуска: ${error.message}`, 'error', 5000);
        document.getElementById('tableBody').innerHTML = `
            <tr>
                <td colspan="10" style="text-align: center; padding: 40px; color: #c42b1c; font-size: 16px;">
                    ❌ Ошибка инициализации приложения<br>
                    <span style="font-size: 13px; color: #999;">${error.message}</span>
                </td>
            </tr>
        `;
    }
}

/**
 * Настройка обработчиков событий
 */
function setupEventListeners() {
    // ---------- ПЕРЕКЛЮЧЕНИЕ РЕЖИМОВ ----------
    document.querySelectorAll('.mode-item').forEach(item => {
        item.addEventListener('click', function() {
            const mode = this.dataset.mode;
            if (mode && modeManager) {
                modeManager.switchMode(mode);
            }
        });
    });
    
    // ---------- КНОПКИ ИНСТРУМЕНТОВ ----------
    document.getElementById('btnRefresh').addEventListener('click', function() {
        if (modeManager) {
            modeManager.loadData();
            showNotification('🔄 Данные обновлены', 'success');
        }
    });
    
    document.getElementById('btnCreate').addEventListener('click', function() {
        if (modeManager) {
            showCreateDialog(modeManager);
        }
    });
    
    document.getElementById('btnEdit').addEventListener('click', function() {
        if (modeManager) {
            showEditDialog(modeManager);
        }
    });
    
    document.getElementById('btnDelete').addEventListener('click', function() {
        if (modeManager) {
            showDeleteDialog(modeManager);
        }
    });
    
    document.getElementById('btnPrint').addEventListener('click', function() {
        printTable();
    });
    
    // ---------- ПОИСК ----------
    document.getElementById('btnSearch').addEventListener('click', function() {
        performSearch();
    });
    
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
    
    document.getElementById('searchInput').addEventListener('input', function() {
        // Автоматический поиск при вводе (с задержкой)
        clearTimeout(this._searchTimeout);
        this._searchTimeout = setTimeout(() => {
            performSearch();
        }, 500);
    });
    
    // ---------- ФИЛЬТР ----------
    document.getElementById('statusFilter').addEventListener('change', function() {
        applyFilter();
    });
    
    // ---------- ГОРЯЧИЕ КЛАВИШИ ----------
    document.addEventListener('keydown', function(e) {
        // Не обрабатываем, если фокус в поле ввода
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
            return;
        }
        
        switch (e.key) {
            case 'n':
            case 'N':
                if (e.ctrlKey) {
                    e.preventDefault();
                    document.getElementById('btnCreate').click();
                }
                break;
            case 'e':
            case 'E':
                if (e.ctrlKey) {
                    e.preventDefault();
                    document.getElementById('btnEdit').click();
                }
                break;
            case 'Delete':
            case 'Del':
                e.preventDefault();
                document.getElementById('btnDelete').click();
                break;
            case 'r':
            case 'R':
                if (e.ctrlKey) {
                    e.preventDefault();
                    document.getElementById('btnRefresh').click();
                }
                break;
            case 'p':
            case 'P':
                if (e.ctrlKey) {
                    e.preventDefault();
                    document.getElementById('btnPrint').click();
                }
                break;
            case 'f':
            case 'F':
                if (e.ctrlKey) {
                    e.preventDefault();
                    document.getElementById('searchInput').focus();
                }
                break;
            case 'Escape':
                hideModal();
                break;
            case 'F5':
                e.preventDefault();
                document.getElementById('btnRefresh').click();
                break;
        }
    });
    
    // ---------- МЕНЮ ----------
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', function() {
            const text = this.textContent.trim();
            switch (text) {
                case 'Справка':
                    showHelpDialog();
                    break;
                case 'План ТПП':
                    if (modeManager) modeManager.switchMode('plan');
                    break;
                case 'Режим':
                    showModeSwitchDialog();
                    break;
                default:
                    showNotification(`ℹ️ Выбрано меню: ${text}`, 'info', 2000);
            }
        });
    });
    
    // ---------- КНОПКИ ОКНА ----------
    document.querySelector('.win-btn.close')?.addEventListener('click', function() {
        if (confirm('Вы уверены, что хотите закрыть приложение?')) {
            window.close();
        }
    });
    
    document.querySelector('.win-btn:first-child')?.addEventListener('click', function() {
        // Сворачивание окна (имитация)
        showNotification('ℹ️ Окно свернуто', 'info', 1000);
    });
    
    document.querySelector('.win-btn:nth-child(2)')?.addEventListener('click', function() {
        // Разворачивание окна (имитация)
        const app = document.getElementById('app');
        if (app) {
            if (app.style.width === '100%' && app.style.height === '100vh') {
                app.style.width = '';
                app.style.height = '';
                app.style.maxWidth = '1400px';
                app.style.maxHeight = '95vh';
            } else {
                app.style.width = '100%';
                app.style.height = '100vh';
                app.style.maxWidth = '100%';
                app.style.maxHeight = '100vh';
                app.style.border = 'none';
                app.style.borderRadius = '0';
            }
        }
    });
    
    // ---------- КОНТЕКСТНОЕ МЕНЮ ТАБЛИЦЫ ----------
    document.getElementById('dataTable').addEventListener('contextmenu', function(e) {
        e.preventDefault();
        const tr = e.target.closest('tr');
        if (tr && tr.dataset.id) {
            const id = tr.dataset.id;
            if (modeManager) {
                modeManager.selectRow(id);
                showContextMenu(e.clientX, e.clientY);
            }
        }
    });
    
    // Закрытие контекстного меню
    document.addEventListener('click', function() {
        const menu = document.getElementById('contextMenu');
        if (menu) {
            menu.remove();
        }
    });
}

/**
 * Показать контекстное меню
 * @param {number} x - Координата X
 * @param {number} y - Координата Y
 */
function showContextMenu(x, y) {
    const menu = document.createElement('div');
    menu.id = 'contextMenu';
    menu.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        background: #f0f0f0;
        border: 1px solid #999;
        border-radius: 4px;
        padding: 4px 0;
        min-width: 180px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 3000;
    `;
    
    const items = [
        { label: '✏️ Редактировать', action: () => showEditDialog(modeManager) },
        { label: '📄 Просмотреть', action: () => showViewDetailsDialog(modeManager) },
        { label: '🗑️ Удалить', action: () => showDeleteDialog(modeManager) },
        { label: '—', action: null },
        { label: '📋 Копировать', action: () => copySelectedRow() },
        { label: '📤 Экспорт', action: () => showExportDialog(modeManager) }
    ];
    
    items.forEach(item => {
        if (item.label === '—') {
            const divider = document.createElement('hr');
            divider.style.cssText = 'margin: 4px 8px; border: none; border-top: 1px solid #ccc;';
            menu.appendChild(divider);
            return;
        }
        
        const btn = document.createElement('div');
        btn.textContent = item.label;
        btn.style.cssText = `
            padding: 6px 16px;
            cursor: pointer;
            font-size: 13px;
            transition: background 0.15s;
        `;
        btn.onmouseenter = () => { btn.style.background = '#d4d0c8'; };
        btn.onmouseleave = () => { btn.style.background = 'transparent'; };
        btn.onclick = (e) => {
            e.stopPropagation();
            if (item.action) item.action();
            menu.remove();
        };
        menu.appendChild(btn);
    });
    
    document.body.appendChild(menu);
    
    // Закрываем при клике вне меню
    setTimeout(() => {
        document.addEventListener('click', function closeMenu() {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        });
    }, 10);
}

/**
 * Копировать выбранную строку
 */
function copySelectedRow() {
    const id = modeManager?.selectedId;
    if (!id) {
        showNotification('⚠️ Выберите строку', 'warning');
        return;
    }
    
    const data = modeManager.currentData[id];
    if (!data) {
        showNotification('❌ Данные не найдены', 'error');
        return;
    }
    
    const text = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(text).then(() => {
        showNotification('✅ Данные скопированы в буфер обмена', 'success');
    }).catch(() => {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showNotification('✅ Данные скопированы в буфер обмена', 'success');
    });
}

/**
 * Выполнить поиск
 */
function performSearch() {
    if (!modeManager) return;
    
    const query = document.getElementById('searchInput').value.toLowerCase().trim();
    const config = modeManager.getCurrentConfig();
    const data = modeManager.currentData;
    
    if (!query) {
        modeManager.renderTable(data);
        modeManager.updateStatusBar(data);
        document.getElementById('statusRecords').textContent = `Записей: ${Object.keys(data).length}`;
        return;
    }
    
    const filtered = {};
    for (const [id, item] of Object.entries(data)) {
        let found = false;
        for (const [key, value] of Object.entries(item)) {
            if (typeof value === 'string' && value.toLowerCase().includes(query)) {
                found = true;
                break;
            }
            if (typeof value === 'number' && String(value).includes(query)) {
                found = true;
                break;
            }
            if (Array.isArray(value) && value.some(v => 
                typeof v === 'string' && v.toLowerCase().includes(query)
            )) {
                found = true;
                break;
            }
        }
        if (found) {
            filtered[id] = item;
        }
    }
    
    modeManager.renderTable(filtered);
    document.getElementById('statusRecords').textContent = 
        `Найдено: ${Object.keys(filtered).length} из ${Object.keys(data).length}`;
}

/**
 * Применить фильтр по статусу
 */
function applyFilter() {
    if (!modeManager) return;
    
    const status = document.getElementById('statusFilter').value;
    const data = modeManager.currentData;
    
    if (status === 'all') {
        modeManager.renderTable(data);
        modeManager.updateStatusBar(data);
        return;
    }
    
    const filtered = {};
    for (const [id, item] of Object.entries(data)) {
        if (item.status === status) {
            filtered[id] = item;
        }
    }
    
    modeManager.renderTable(filtered);
    document.getElementById('statusRecords').textContent = 
        `Найдено: ${Object.keys(filtered).length} из ${Object.keys(data).length}`;
}

/**
 * Печать таблицы
 */
function printTable() {
    const config = modeManager?.getCurrentConfig();
    if (!config) return;
    
    const table = document.getElementById('dataTable');
    if (!table) return;
    
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
        showNotification('⚠️ Разрешите всплывающие окна для печати', 'warning');
        return;
    }
    
    const statusMap = config.statusMap || {};
    const statusColor = config.statusColor || {};
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Печать - ${config.title}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    font-family: 'Segoe UI', Arial, sans-serif; 
                    padding: 20px; 
                    background: white;
                }
                .header {
                    margin-bottom: 20px;
                    padding-bottom: 10px;
                    border-bottom: 2px solid #1a3a8a;
                }
                .header h1 {
                    color: #1a3a8a;
                    font-size: 20px;
                }
                .header p {
                    color: #666;
                    font-size: 13px;
                    margin-top: 4px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 13px;
                }
                th {
                    background: #d4d0c8;
                    color: #333;
                    padding: 8px 12px;
                    text-align: left;
                    font-weight: 600;
                    border: 1px solid #999;
                }
                td {
                    padding: 6px 12px;
                    border: 1px solid #ccc;
                }
                tr.status-new td:first-child {
                    border-left: 4px solid #ff8c00;
                }
                tr.status-in_work td:first-child {
                    border-left: 4px solid #0066cc;
                }
                tr.status-completed td:first-child {
                    border-left: 4px solid #00a86b;
                }
                .footer {
                    margin-top: 20px;
                    padding-top: 10px;
                    border-top: 1px solid #ccc;
                    font-size: 12px;
                    color: #666;
                    display: flex;
                    justify-content: space-between;
                }
                @media print {
                    body { padding: 10px; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>📄 ${config.title}</h1>
                <p>Дата печати: ${new Date().toLocaleString()}</p>
                <p>Пользователь: ${db.getCurrentUser().fullName}</p>
            </div>
            <table>
                <thead>
                    <tr>
                        ${config.columns.map(col => `<th>${col}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${table.querySelector('tbody').innerHTML}
                </tbody>
            </table>
            <div class="footer">
                <span>АРМ Конструктора СТО v1.0</span>
                <span>Всего записей: ${modeManager.currentData ? Object.keys(modeManager.currentData).length : 0}</span>
            </div>
            <div class="no-print" style="text-align: center; margin-top: 20px;">
                <button onclick="window.print()" style="padding: 8px 24px; cursor: pointer; background: #1a3a8a; color: white; border: none; border-radius: 4px; font-size: 14px;">
                    🖨️ Распечатать
                </button>
                <button onclick="window.close()" style="padding: 8px 24px; cursor: pointer; background: #999; color: white; border: none; border-radius: 4px; font-size: 14px; margin-left: 8px;">
                    ✕ Закрыть
                </button>
            </div>
        </body>
        </html>
    `);
    
    printWindow.document.close();
    
    // Ждем загрузки, затем открываем диалог печати
    setTimeout(() => {
        printWindow.focus();
        printWindow.print();
    }, 500);
}

/**
 * Показать диалог справки
 */
function showHelpDialog() {
    const content = `
        <div style="padding: 10px;">
            <h3 style="color: #1a3a8a; margin-bottom: 12px;">📖 Справка АРМ Конструктора СТО</h3>
            
            <div style="margin-bottom: 16px;">
                <h4 style="color: #333; margin-bottom: 6px;">🎯 Назначение</h4>
                <p style="font-size: 13px; color: #555; line-height: 1.6;">
                    Автоматизированное рабочее место для проектирования и управления 
                    оснасткой в составе ПУ ТПП.
                </p>
            </div>
            
            <div style="margin-bottom: 16px;">
                <h4 style="color: #333; margin-bottom: 6px;">📋 Режимы работы</h4>
                <ul style="font-size: 13px; color: #555; line-height: 1.8; padding-left: 20px;">
                    <li><strong>📋 План ТПП</strong> — просмотр плана-графика (только чтение)</li>
                    <li><strong>📝 Список работ</strong> — управление нарядами на изготовление (CRUD)</li>
                    <li><strong>📂 Спецификации</strong> — работа с деревом изделий (CRUD + блокировка)</li>
                    <li><strong>📦 Архив ТЗ</strong> — хранение выполненных ТЗ (только чтение)</li>
                </ul>
            </div>
            
            <div style="margin-bottom: 16px;">
                <h4 style="color: #333; margin-bottom: 6px;">⌨️ Горячие клавиши</h4>
                <table style="font-size: 13px; color: #555; border-collapse: collapse;">
                    <tr><td style="padding: 4px 12px; font-weight: 500;">Ctrl+N</td><td>Создать запись</td></tr>
                    <tr><td style="padding: 4px 12px; font-weight: 500;">Ctrl+E</td><td>Редактировать запись</td></tr>
                    <tr><td style="padding: 4px 12px; font-weight: 500;">Delete</td><td>Удалить запись</td></tr>
                    <tr><td style="padding: 4px 12px; font-weight: 500;">Ctrl+R</td><td>Обновить данные</td></tr>
                    <tr><td style="padding: 4px 12px; font-weight: 500;">Ctrl+P</td><td>Печать</td></tr>
                    <tr><td style="padding: 4px 12px; font-weight: 500;">Ctrl+F</td><td>Поиск</td></tr>
                    <tr><td style="padding: 4px 12px; font-weight: 500;">Esc</td><td>Закрыть модальное окно</td></tr>
                </table>
            </div>
            
            <div style="margin-bottom: 16px;">
                <h4 style="color: #333; margin-bottom: 6px;">🔒 Блокировка спецификаций</h4>
                <p style="font-size: 13px; color: #555; line-height: 1.6;">
                    При редактировании спецификации она автоматически блокируется для других пользователей.
                    Блокировка снимается при сохранении или отмене редактирования.
                </p>
            </div>
            
            <div style="padding: 12px; background: #f8f8f8; border-radius: 4px; border: 1px solid #e0e0e0;">
                <p style="font-size: 12px; color: #666;">
                    📌 Версия: 1.0<br>
                    📅 Дата: ${new Date().toLocaleDateString()}<br>
                    👤 Разработчик: Команда разработки АРМ СТО
                </p>
            </div>
        </div>
    `;
    
    showModal('📖 Справка', content, () => {
        return true;
    }, 'Закрыть');
}

/**
 * Показать диалог переключения режима
 */
function showModeSwitchDialog() {
    const modes = [
        { id: 'plan', label: '📋 План ТПП', desc: 'Просмотр плана-графика (только чтение)' },
        { id: 'tasks', label: '📝 Список работ', desc: 'Управление нарядами на изготовление' },
        { id: 'specs', label: '📂 Спецификации', desc: 'Работа с деревом изделий' },
        { id: 'archive', label: '📦 Архив ТЗ', desc: 'Хранение выполненных ТЗ' }
    ];
    
    let content = `
        <div style="padding: 10px;">
            <p style="color: #666; margin-bottom: 12px;">Выберите режим работы:</p>
            <div style="display: flex; flex-direction: column; gap: 8px;">
    `;
    
    modes.forEach(mode => {
        const isActive = modeManager?.currentMode === mode.id;
        content += `
            <div onclick="switchToMode('${mode.id}')" 
                 style="padding: 12px 16px; border: 2px solid ${isActive ? '#1a3a8a' : '#e0e0e0'}; 
                        border-radius: 4px; cursor: pointer; transition: all 0.2s;
                        background: ${isActive ? '#f0f4ff' : 'white'};
                        display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 20px;">${mode.label.split(' ')[0]}</span>
                <div>
                    <div style="font-weight: 500; font-size: 14px;">${mode.label}</div>
                    <div style="font-size: 12px; color: #999;">${mode.desc}</div>
                </div>
                ${isActive ? '<span style="margin-left: auto; color: #1a3a8a; font-weight: bold;">✓ Текущий</span>' : ''}
            </div>
        `;
    });
    
    content += `
            </div>
        </div>
    `;
    
    showModal('🔄 Переключение режима', content, () => {
        return true;
    }, 'Закрыть');
}

/**
 * Переключить режим (глобальная функция)
 * @param {string} mode - ID режима
 */
function switchToMode(mode) {
    if (modeManager) {
        modeManager.switchMode(mode);
        hideModal();
        showNotification(`Переключено на режим: ${modeManager.getCurrentConfig().title}`, 'info');
    }
}

// ============================================
// ЗАПУСК ПРИЛОЖЕНИЯ
// ============================================

// Ждем загрузки DOM
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM загружен, запускаем приложение...');
    
    // Добавляем обработчик для контекстного меню
    document.addEventListener('contextmenu', function(e) {
        // Блокируем системное контекстное меню в приложении
        if (e.target.closest('#app')) {
            // Контекстное меню обрабатывается в таблице
        }
    });
    
    // Инициализация
    initApp();
});

// Обработка ошибок
window.onerror = function(message, source, lineno, colno, error) {
    console.error('❌ Глобальная ошибка:', message, error);
    showNotification(`❌ Ошибка: ${message}`, 'error', 5000);
};

// Обработка необработанных промисов
window.onunhandledrejection = function(event) {
    console.error('❌ Необработанный промис:', event.reason);
    showNotification(`❌ Ошибка: ${event.reason?.message || 'Неизвестная ошибка'}`, 'error', 5000);
};

// Экспорт глобальных функций
window.switchToMode = switchToMode;
window.performSearch = performSearch;
window.applyFilter = applyFilter;
window.printTable = printTable;

console.log('📦 Модуль app.js загружен');
console.log('ℹ️ АРМ Конструктора СТО готов к работе');
console.log('📖 Используйте Ctrl+H для справки');
