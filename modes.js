
// ============================================
// modes.js — Логика переключения режимов
// Управляет состояниями, загрузкой данных,
// рендерингом таблиц и деревьев
// ============================================

/**
 * Класс ModeManager - управляет всеми режимами работы приложения
 */
class ModeManager {
    constructor() {
        this.currentMode = 'plan';
        this.selectedId = null;
        this.currentData = {};
        this.isLoading = false;
        
        // Конфигурация всех режимов
        this.modeConfigs = {
            // ---------- РЕЖИМ "ПЛАН ТПП" ----------
            plan: {
                title: 'План ТПП (текущий)',
                icon: '📋',
                columns: ['№ п/п', 'Наименование работ', 'Квартал', 'Статус', 'Ответственный'],
                fields: ['name', 'quarter', 'status', 'responsible'],
                readonly: true,
                statusMap: {
                    'new': '🟠 Новый',
                    'in_work': '🔵 В работе',
                    'completed': '🟢 Выполнен'
                },
                statusColor: {
                    'new': 'status-new',
                    'in_work': 'status-in_work',
                    'completed': 'status-completed'
                },
                path: 'plans',
                idPrefix: 'plan_',
                hasTree: false,
                sortField: 'createdAt',
                sortDirection: 'desc'
            },
            
            // ---------- РЕЖИМ "СПИСОК РАБОТ" ----------
            tasks: {
                title: 'Список работ исполнителя',
                icon: '📝',
                columns: ['№ наряда', 'Наименование оснастки', 'Срок изготовления', 'Статус'],
                fields: ['number', 'toolingName', 'deadline', 'status'],
                readonly: false,
                statusMap: {
                    'new': '🟠 Новый',
                    'in_work': '🔵 В работе',
                    'completed': '🟢 Выполнен'
                },
                statusColor: {
                    'new': 'status-new',
                    'in_work': 'status-in_work',
                    'completed': 'status-completed'
                },
                path: 'tasks',
                idPrefix: 'task_',
                hasTree: false,
                sortField: 'deadline',
                sortDirection: 'asc'
            },
            
            // ---------- РЕЖИМ "СПЕЦИФИКАЦИИ" ----------
            specs: {
                title: 'Спецификации КГ СТО',
                icon: '📂',
                columns: ['Наименование', 'Обозначение', 'Статус', 'Автор', 'Блокировка'],
                fields: ['name', 'designation', 'status', 'createdBy', 'lockedBy'],
                readonly: false,
                statusMap: {
                    'active': '🟢 Активен',
                    'draft': '🟠 Черновик',
                    'approved': '🟢 Утвержден'
                },
                statusColor: {
                    'active': 'status-in_work',
                    'draft': 'status-new',
                    'approved': 'status-completed'
                },
                path: 'specifications',
                idPrefix: 'spec_',
                hasTree: true,
                sortField: 'createdAt',
                sortDirection: 'desc'
            },
            
            // ---------- РЕЖИМ "АРХИВ" ----------
            archive: {
                title: 'Архив ТЗ на СТО',
                icon: '📦',
                columns: ['№ ТЗ', 'Дата', 'Спецификация', 'Статус согласования', 'Файлы'],
                fields: ['tzNumber', 'tzDate', 'specificationId', 'status', 'files'],
                readonly: true,
                statusMap: {
                    'agreed': '🟢 Согласован',
                    'disagreed': '🔴 Не согласован',
                    'in_progress': '🟠 В процессе'
                },
                statusColor: {
                    'agreed': 'status-completed',
                    'disagreed': 'status-new',
                    'in_progress': 'status-in_work'
                },
                path: 'archives',
                idPrefix: 'archive_',
                hasTree: false,
                sortField: 'tzDate',
                sortDirection: 'desc'
            }
        };
        
        // Подписки на изменения в реальном времени
        this.subscriptions = {};
        
        // Инициализация
        this.initSubscriptions();
    }

    /**
     * Инициализация подписок на изменения в реальном времени
     */
    initSubscriptions() {
        // Подписываемся на все разделы для обновления бейджей
        const paths = ['plans', 'tasks', 'specifications', 'archives'];
        const badgeMap = {
            'plans': 'badgePlan',
            'tasks': 'badgeTasks',
            'specifications': 'badgeSpecs',
            'archives': 'badgeArchive'
        };
        
        paths.forEach(path => {
            const badgeId = badgeMap[path];
            if (badgeId) {
                db.subscribe(path, (data) => {
                    const badge = document.getElementById(badgeId);
                    if (badge) {
                        const count = data ? Object.keys(data).length : 0;
                        badge.textContent = count;
                    }
                });
            }
        });
        
        // Подписываемся на текущий раздел для реактивного обновления
        this.subscribeToCurrentMode();
    }

    /**
     * Подписка на изменения в текущем режиме
     */
    subscribeToCurrentMode() {
        const config = this.getCurrentConfig();
        if (!config) return;
        
        // Отписываемся от предыдущей подписки
        if (this.subscriptions[config.path]) {
            db.unsubscribe(config.path, this.subscriptions[config.path]);
            delete this.subscriptions[config.path];
        }
        
        // Создаем новую подписку
        this.subscriptions[config.path] = db.subscribe(config.path, (data) => {
            if (!this.isLoading) {
                this.currentData = data || {};
                this.renderTable(this.currentData);
                this.updateStatusBar(this.currentData);
                
                // Если есть дерево и выбран ID - обновляем дерево
                if (config.hasTree && this.selectedId) {
                    const spec = this.currentData[this.selectedId];
                    if (spec && spec.tree) {
                        this.renderTree(spec.tree);
                    }
                }
            }
        });
    }

    /**
     * Переключить режим
     * @param {string} mode - Имя режима
     */
    switchMode(mode) {
        if (!this.modeConfigs[mode]) {
            console.error(`❌ Неизвестный режим: ${mode}`);
            return;
        }
        
        this.currentMode = mode;
        this.selectedId = null;
        this.isLoading = true;
        
        // Обновляем подписку
        this.subscribeToCurrentMode();
        
        // Обновляем UI
        this.updateUI();
        
        // Загружаем данные
        this.loadData().finally(() => {
            this.isLoading = false;
        });
    }

    /**
     * Получить конфигурацию текущего режима
     * @returns {Object}
     */
    getCurrentConfig() {
        return this.modeConfigs[this.currentMode];
    }

    /**
     * Получить данные текущего режима
     * @returns {Promise<Object>}
     */
    async getCurrentData() {
        try {
            const config = this.getCurrentConfig();
            const data = await db.getData(config.path);
            this.currentData = data || {};
            return this.currentData;
        } catch (error) {
            console.error('❌ Ошибка получения данных:', error);
            showNotification('Ошибка загрузки данных', 'error');
            return {};
        }
    }

    /**
     * Обновить UI при смене режима
     */
    updateUI() {
        const config = this.getCurrentConfig();
        if (!config) return;
        
        // Обновляем заголовок
        const titleElement = document.querySelector('.window-title');
        if (titleElement) {
            titleElement.textContent = `АРМ Конструктора СТО — ${config.title}`;
        }
        
        // Обновляем строку состояния
        document.getElementById('statusMode').textContent = `Режим: ${config.title}`;
        document.getElementById('statusAccess').textContent = 
            `Доступ: ${config.readonly ? '🔒 Только чтение' : '✏️ Чтение/Запись'}`;
        
        // Показываем/скрываем кнопки
        document.getElementById('btnCreate').style.display = config.readonly ? 'none' : 'inline-block';
        document.getElementById('btnEdit').style.display = config.readonly ? 'none' : 'inline-block';
        document.getElementById('btnDelete').style.display = config.readonly ? 'none' : 'inline-block';
        
        // Обновляем активный пункт меню
        document.querySelectorAll('.mode-item').forEach(item => {
            item.classList.toggle('active', item.dataset.mode === this.currentMode);
        });
        
        // Показываем/скрываем дерево
        const treeContainer = document.getElementById('treeContainer');
        if (treeContainer) {
            treeContainer.style.display = config.hasTree ? 'block' : 'none';
        }
        
        // Обновляем состояние кнопок
        this.updateButtons();
    }

    /**
     * Загрузить данные для текущего режима
     */
    async loadData() {
        try {
            this.isLoading = true;
            const data = await this.getCurrentData();
            
            // Рендерим таблицу
            this.renderTable(data);
            
            // Обновляем статус-бар
            this.updateStatusBar(data);
            
            // Если есть дерево и выбран ID - рендерим его
            const config = this.getCurrentConfig();
            if (config.hasTree && this.selectedId) {
                const spec = data[this.selectedId];
                if (spec && spec.tree) {
                    this.renderTree(spec.tree);
                }
            }
            
            // Обновляем кнопки
            this.updateButtons();
            
        } catch (error) {
            console.error('❌ Ошибка загрузки данных:', error);
            showNotification('Ошибка загрузки данных', 'error');
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Обновить строку состояния
     * @param {Object} data - Данные для отображения
     */
    updateStatusBar(data) {
        const count = data ? Object.keys(data).length : 0;
        document.getElementById('statusRecords').textContent = `Записей: ${count}`;
    }

    /**
     * Рендеринг таблицы
     * @param {Object} data - Данные для отображения
     */
    renderTable(data) {
        const config = this.getCurrentConfig();
        const header = document.getElementById('tableHeader');
        const body = document.getElementById('tableBody');

        // Очищаем
        header.innerHTML = '';
        body.innerHTML = '';

        // Заголовки
        config.columns.forEach(col => {
            const th = document.createElement('th');
            th.textContent = col;
            header.appendChild(th);
        });

        // Данные
        if (!data || Object.keys(data).length === 0) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = config.columns.length;
            td.textContent = '📭 Нет данных';
            td.style.textAlign = 'center';
            td.style.padding = '40px';
            td.style.color = '#999';
            td.style.fontSize = '16px';
            tr.appendChild(td);
            body.appendChild(tr);
            return;
        }

        // Сортируем данные
        const entries = Object.entries(data);
        if (config.sortField) {
            entries.sort((a, b) => {
                const valA = a[1][config.sortField] || '';
                const valB = b[1][config.sortField] || '';
                const direction = config.sortDirection === 'desc' ? -1 : 1;
                if (valA < valB) return -1 * direction;
                if (valA > valB) return 1 * direction;
                return 0;
            });
        }

        const user = db.getCurrentUser();
        let rowNum = 1;

        entries.forEach(([id, item]) => {
            const tr = document.createElement('tr');
            tr.dataset.id = id;
            
            // Добавляем класс статуса
            if (item.status && config.statusColor[item.status]) {
                tr.className = config.statusColor[item.status];
            }

            // Добавляем обработчик клика
            tr.addEventListener('click', () => {
                this.selectRow(id);
            });

            // Двойной клик для редактирования
            tr.addEventListener('dblclick', () => {
                if (!config.readonly) {
                    showEditDialog(this);
                }
            });

            // Если это текущая выбранная строка
            if (id === this.selectedId) {
                tr.classList.add('selected');
            }

            // Формируем ячейки
            let cellIndex = 0;
            
            // Специальная обработка для первого столбца (№ п/п)
            const firstField = config.fields[0];
            
            config.fields.forEach((field, index) => {
                const td = document.createElement('td');
                
                if (index === 0 && config.idPrefix === 'plan_') {
                    // Для планов добавляем номер п/п
                    td.textContent = rowNum;
                } else if (field === 'status' && config.statusMap[item[field]]) {
                    td.textContent = config.statusMap[item[field]];
                } else if (field === 'responsible' && typeof item[field] === 'string') {
                    // Показываем имя пользователя
                    db.getUserName(item[field]).then(name => {
                        td.textContent = name;
                    }).catch(() => {
                        td.textContent = item[field];
                    });
                    td.textContent = '...'; // Временное значение
                } else if (field === 'specificationId' && item[field]) {
                    // Показываем имя спецификации
                    db.getData(`specifications/${item[field]}/name`).then(name => {
                        td.textContent = name || item[field];
                    }).catch(() => {
                        td.textContent = item[field];
                    });
                    td.textContent = '...'; // Временное значение
                } else if (field === 'files' && Array.isArray(item[field])) {
                    td.textContent = item[field].length > 0 ? 
                        `📎 ${item[field].join(', ')}` : '—';
                } else if (field === 'lockedBy' && item[field]) {
                    // Показываем статус блокировки
                    td.textContent = item[field] === user.id ? 
                        '🔒 Мной' : `🔒 ${item[field]}`;
                    td.style.color = item[field] === user.id ? '#00a86b' : '#c42b1c';
                } else if (field === 'createdBy' && typeof item[field] === 'string') {
                    db.getUserName(item[field]).then(name => {
                        td.textContent = name;
                    }).catch(() => {
                        td.textContent = item[field];
                    });
                    td.textContent = '...'; // Временное значение
                } else {
                    td.textContent = item[field] !== undefined && item[field] !== null ? 
                        String(item[field]) : '—';
                }
                
                tr.appendChild(td);
                cellIndex++;
            });

            body.appendChild(tr);
            rowNum++;
        });
    }

    /**
     * Рендеринг дерева спецификаций
     * @param {Object} treeData - Данные дерева
     */
    renderTree(treeData) {
        const container = document.getElementById('treeView');
        if (!container) return;
        
        if (!treeData || !treeData.root) {
            container.innerHTML = '<div class="loading-indicator">Нет данных для дерева</div>';
            return;
        }
        
        container.innerHTML = this.renderTreeNode(treeData.root, 'root', 0);
    }

    /**
     * Рекурсивный рендеринг узла дерева
     * @param {Object} node - Узел дерева
     * @param {string} nodeId - ID узла
     * @param {number} level - Уровень вложенности
     * @returns {string} HTML строка
     */
    renderTreeNode(node, nodeId, level) {
        if (!node) return '';

        const hasChildren = node.children && Object.keys(node.children).length > 0;
        const statusMap = {
            'approved': '✅ Утвержден',
            'in_work': '🔄 В работе',
            'new': '📋 Новый'
        };
        const statusClass = {
            'approved': 'status-completed',
            'in_work': 'status-in_work',
            'new': 'status-new'
        };

        let html = `<div class="tree-node" data-node-id="${nodeId}" style="padding-left: ${level * 4}px;">`;
        html += `<div class="tree-node-content">`;
        
        // Toggle для детей
        if (hasChildren) {
            html += `<span class="toggle" onclick="window.toggleTreeNode(this)">▼</span>`;
        } else {
            html += `<span class="toggle" style="visibility:hidden;">•</span>`;
        }
        
        // Иконка
        const icon = hasChildren ? '📁' : '📄';
        html += `<span class="icon">${icon}</span>`;
        
        // Имя и детали
        html += `<span class="name">${node.name || 'Без имени'}</span>`;
        html += `<span class="details">${node.quantity || 1} шт.`;
        if (node.designation) {
            html += ` | ${node.designation}`;
        }
        if (node.material) {
            html += ` | ${node.material}`;
        }
        html += `</span>`;
        
        if (node.status && statusMap[node.status]) {
            html += `<span class="status-badge ${statusClass[node.status] || ''}">${statusMap[node.status]}</span>`;
        }
        
        // Кнопки для управления узлом (если режим не readonly)
        const config = this.getCurrentConfig();
        if (!config.readonly && this.selectedId) {
            html += `<span style="margin-left: 8px; display: flex; gap: 4px;">`;
            html += `<button onclick="window.showEditNodeDialog(window.modeManager, '${nodeId}')" 
                           class="tool-btn" style="font-size:12px; padding:0 4px;" title="Редактировать узел">✏️</button>`;
            html += `<button onclick="window.showAddNodeDialog(window.modeManager, '${nodeId}')" 
                           class="tool-btn" style="font-size:12px; padding:0 4px;" title="Добавить подузел">➕</button>`;
            html += `</span>`;
        }
        
        html += `</div>`;
        
        // Дети
        if (hasChildren) {
            html += `<div class="tree-children">`;
            for (const [childId, childNode] of Object.entries(node.children)) {
                html += this.renderTreeNode(childNode, childId, level + 1);
            }
            html += `</div>`;
        }
        
        html += `</div>`;
        return html;
    }

    /**
     * Выбрать строку в таблице
     * @param {string} id - ID записи
     */
    selectRow(id) {
        this.selectedId = id;
        const config = this.getCurrentConfig();
        
        // Обновляем выделение в таблице
        document.querySelectorAll('#tableBody tr').forEach(tr => {
            tr.classList.toggle('selected', tr.dataset.id === id);
        });

        // Если есть дерево - обновляем
        if (config.hasTree && id) {
            const spec = this.currentData[id];
            if (spec && spec.tree) {
                this.renderTree(spec.tree);
            } else {
                document.getElementById('treeView').innerHTML = '<div class="loading-indicator">Загрузка дерева...</div>';
            }
        }

        // Обновляем состояние кнопок
        this.updateButtons();
    }

    /**
     * Обновить состояние кнопок
     */
    updateButtons() {
        const config = this.getCurrentConfig();
        const isReadonly = config.readonly;
        const isSelected = !!this.selectedId;
        const btnEdit = document.getElementById('btnEdit');
        const btnDelete = document.getElementById('btnDelete');
        
        if (isReadonly) {
            btnEdit.style.opacity = '0.5';
            btnEdit.style.cursor = 'default';
            btnEdit.disabled = true;
            btnDelete.style.opacity = '0.5';
            btnDelete.style.cursor = 'default';
            btnDelete.disabled = true;
            return;
        }
        
        // Проверяем блокировку для спецификаций
        let isLocked = false;
        if (config.hasTree && this.selectedId) {
            const spec = this.currentData[this.selectedId];
            if (spec && spec.lockedBy) {
                const user = db.getCurrentUser();
                isLocked = spec.lockedBy !== user.id;
            }
        }
        
        const canEdit = isSelected && !isLocked;
        const canDelete = isSelected;
        
        btnEdit.style.opacity = canEdit ? '1' : '0.5';
        btnEdit.style.cursor = canEdit ? 'pointer' : 'default';
        btnEdit.disabled = !canEdit;
        
        btnDelete.style.opacity = canDelete ? '1' : '0.5';
        btnDelete.style.cursor = canDelete ? 'pointer' : 'default';
        btnDelete.disabled = !canDelete;
    }

    /**
     * Создать новую запись
     * @param {Object} data - Данные для создания
     * @returns {Promise<boolean>}
     */
    async createRecord(data) {
        try {
            const config = this.getCurrentConfig();
            const user = db.getCurrentUser();
            
            // Добавляем метаданные
            const record = {
                ...data,
                createdBy: user.id,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            // Если это спецификация, инициализируем дерево
            if (this.currentMode === 'specs') {
                record.tree = {
                    root: {
                        name: data.name || 'Новая спецификация',
                        quantity: 1,
                        designation: data.designation || '',
                        material: '',
                        status: 'new',
                        children: {}
                    }
                };
                record.lockedBy = null;
                record.lockedAt = null;
            }
            
            const id = db.generateId();
            await db.setData(`${config.path}/${id}`, record);
            
            showNotification('✅ Запись успешно создана', 'success');
            await this.loadData();
            this.selectRow(id);
            return true;
        } catch (error) {
            console.error('❌ Ошибка создания:', error);
            showNotification(`❌ Ошибка создания записи: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * Обновить запись
     * @param {string} id - ID записи
     * @param {Object} data - Данные для обновления
     * @returns {Promise<boolean>}
     */
    async updateRecord(id, data) {
        try {
            const config = this.getCurrentConfig();
            
            // Проверка блокировки для спецификаций
            if (config.hasTree) {
                const spec = this.currentData[id];
                if (spec && spec.lockedBy) {
                    const user = db.getCurrentUser();
                    if (spec.lockedBy !== user.id) {
                        showNotification('⚠️ Запись заблокирована другим пользователем', 'warning');
                        return false;
                    }
                }
            }
            
            // Добавляем дату обновления
            const record = {
                ...data,
                updatedAt: new Date().toISOString()
            };
            
            await db.updateData(`${config.path}/${id}`, record);
            
            showNotification('✅ Запись успешно обновлена', 'success');
            await this.loadData();
            return true;
        } catch (error) {
            console.error('❌ Ошибка обновления:', error);
            showNotification(`❌ Ошибка обновления записи: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * Удалить запись
     * @param {string} id - ID записи
     * @returns {Promise<boolean>}
     */
    async deleteRecord(id) {
        try {
            const config = this.getCurrentConfig();
            
            // Подтверждение
            const confirmed = await new Promise(resolve => {
                const modal = document.getElementById('modalOverlay');
                const body = document.getElementById('modalBody');
                const title = document.getElementById('modalTitle');
                
                title.textContent = '⚠️ Подтверждение удаления';
                body.innerHTML = `
                    <div style="text-align: center; padding: 20px;">
                        <div style="font-size: 48px; margin-bottom: 16px;">🗑️</div>
                        <p style="font-size: 16px; margin-bottom: 8px; color: #c42b1c; font-weight: bold;">
                            Вы уверены, что хотите удалить эту запись?
                        </p>
                        <p style="color: #666; font-size: 14px;">
                            Это действие невозможно отменить.
                        </p>
                    </div>
                `;
                
                const saveBtn = document.getElementById('modalSave');
                const cancelBtn = document.getElementById('modalCancel');
                const closeBtn = document.getElementById('modalClose');
                
                saveBtn.textContent = '🗑️ Удалить';
                saveBtn.className = 'btn btn-danger';
                saveBtn.onclick = () => {
                    resolve(true);
                    hideModal();
                };
                
                const cancelHandler = () => {
                    resolve(false);
                    hideModal();
                };
                
                cancelBtn.onclick = cancelHandler;
                closeBtn.onclick = cancelHandler;
                modal.onclick = (e) => {
                    if (e.target === modal) {
                        cancelHandler();
                    }
                };
                
                modal.style.display = 'flex';
            });
            
            if (!confirmed) return false;
            
            // Проверка блокировки для спецификаций
            if (config.hasTree) {
                const spec = this.currentData[id];
                if (spec && spec.lockedBy) {
                    const user = db.getCurrentUser();
                    if (spec.lockedBy !== user.id) {
                        showNotification('⚠️ Запись заблокирована другим пользователем', 'warning');
                        return false;
                    }
                }
                // Разблокируем перед удалением
                await db.unlockSpecification(id);
            }
            
            await db.deleteData(`${config.path}/${id}`);
            
            showNotification('✅ Запись успешно удалена', 'success');
            this.selectedId = null;
            await this.loadData();
            this.updateButtons();
            return true;
        } catch (error) {
            console.error('❌ Ошибка удаления:', error);
            showNotification(`❌ Ошибка удаления записи: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * Получить запись для редактирования
     * @param {string} id - ID записи
     * @returns {Promise<Object|null>}
     */
    async getRecordForEdit(id) {
        try {
            const config = this.getCurrentConfig();
            const data = await db.getData(`${config.path}/${id}`);
            return data;
        } catch (error) {
            console.error('❌ Ошибка получения записи:', error);
            return null;
        }
    }

    /**
     * Заблокировать спецификацию
     * @param {string} specId - ID спецификации
     * @returns {Promise<boolean>}
     */
    async lockSpecification(specId) {
        try {
            const user = db.getCurrentUser();
            await db.lockSpecification(specId, user.id);
            await this.loadData();
            this.updateButtons();
            showNotification('🔒 Спецификация заблокирована', 'success');
            return true;
        } catch (error) {
            console.error('❌ Ошибка блокировки:', error);
            showNotification(`❌ Ошибка блокировки: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * Разблокировать спецификацию
     * @param {string} specId - ID спецификации
     * @returns {Promise<boolean>}
     */
    async unlockSpecification(specId) {
        try {
            await db.unlockSpecification(specId);
            await this.loadData();
            this.updateButtons();
            showNotification('🔓 Спецификация разблокирована', 'success');
            return true;
        } catch (error) {
            console.error('❌ Ошибка разблокировки:', error);
            showNotification(`❌ Ошибка разблокировки: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * Обновить дерево спецификации
     * @param {string} specId - ID спецификации
     * @param {Object} treeData - Новые данные дерева
     * @returns {Promise<boolean>}
     */
    async updateSpecificationTree(specId, treeData) {
        try {
            await db.updateData(`specifications/${specId}`, {
                tree: treeData,
                updatedAt: new Date().toISOString()
            });
            await this.loadData();
            return true;
        } catch (error) {
            console.error('❌ Ошибка обновления дерева:', error);
            showNotification(`❌ Ошибка обновления дерева: ${error.message}`, 'error');
            return false;
        }
    }
}

// Глобальные функции для использования в HTML
window.toggleTreeNode = function(element) {
    const childrenContainer = element.closest('.tree-node').querySelector('.tree-children');
    if (childrenContainer) {
        const isHidden = childrenContainer.style.display === 'none';
        childrenContainer.style.display = isHidden ? 'block' : 'none';
        element.textContent = isHidden ? '▼' : '▶';
        element.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(-90deg)';
    }
};

// Экспортируем для использования в других файлах
console.log('📦 Модуль modes.js загружен');
