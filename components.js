// ============================================
// components.js — Рендеринг компонентов UI
// Модальные окна, формы, уведомления, диалоги
// ============================================

/**
 * Показать модальное окно
 * @param {string} title - Заголовок окна
 * @param {string} content - HTML содержимое
 * @param {Function} onSave - Callback при сохранении
 * @param {string} saveText - Текст кнопки сохранения
 */
function showModal(title, content, onSave, saveText = 'Сохранить') {
    const overlay = document.getElementById('modalOverlay');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const saveBtn = document.getElementById('modalSave');
    const cancelBtn = document.getElementById('modalCancel');
    const closeBtn = document.getElementById('modalClose');
    
    modalTitle.textContent = title;
    modalBody.innerHTML = content;
    saveBtn.textContent = saveText;
    saveBtn.className = 'btn btn-primary';
    
    // Сохраняем callback
    saveBtn.onclick = function() {
        try {
            const result = onSave();
            if (result !== false) {
                hideModal();
            }
        } catch (error) {
            console.error('❌ Ошибка в обработчике сохранения:', error);
            showNotification(`Ошибка: ${error.message}`, 'error');
        }
    };
    
    // Отмена
    const cancelHandler = () => {
        hideModal();
    };
    
    cancelBtn.onclick = cancelHandler;
    closeBtn.onclick = cancelHandler;
    
    // Закрытие по клику на оверлей
    overlay.onclick = function(e) {
        if (e.target === overlay) {
            hideModal();
        }
    };
    
    // Закрытие по Escape
    document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') {
            hideModal();
            document.removeEventListener('keydown', escHandler);
        }
    });
    
    overlay.style.display = 'flex';
    
    // Фокус на первое поле ввода
    setTimeout(() => {
        const firstInput = modalBody.querySelector('input, select, textarea');
        if (firstInput) {
            firstInput.focus();
        }
    }, 100);
}

/**
 * Скрыть модальное окно
 */
function hideModal() {
    const overlay = document.getElementById('modalOverlay');
    overlay.style.display = 'none';
    
    // Очищаем обработчики
    const saveBtn = document.getElementById('modalSave');
    const cancelBtn = document.getElementById('modalCancel');
    const closeBtn = document.getElementById('modalClose');
    
    saveBtn.onclick = null;
    cancelBtn.onclick = null;
    closeBtn.onclick = null;
    overlay.onclick = null;
}

/**
 * Показать уведомление
 * @param {string} message - Текст уведомления
 * @param {string} type - Тип: success, error, info, warning
 * @param {number} duration - Время показа в мс
 */
function showNotification(message, type = 'info', duration = 3000) {
    const container = document.getElementById('notificationContainer');
    const notification = document.createElement('div');
    
    // Иконки для разных типов
    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️',
        warning: '⚠️'
    };
    
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span style="font-size: 18px;">${icons[type] || 'ℹ️'}</span>
        <span style="flex: 1;">${message}</span>
        <button onclick="this.parentElement.remove()" 
                style="background: none; border: none; color: white; cursor: pointer; font-size: 16px; opacity: 0.7;">
            ✕
        </button>
    `;
    
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        notification.style.transition = 'all 0.3s ease';
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 300);
    }, duration);
}

// ============================================
// ФОРМЫ ДЛЯ РАЗНЫХ РЕЖИМОВ
// ============================================

/**
 * Создать форму для режима "План ТПП"
 * @param {Object} data - Данные для заполнения
 * @returns {string} HTML формы
 */
function createPlanForm(data = {}) {
    const quarters = ['Q1-2026', 'Q2-2026', 'Q3-2026', 'Q4-2026'];
    const statuses = [
        { value: 'new', label: '🟠 Новый' },
        { value: 'in_work', label: '🔵 В работе' },
        { value: 'completed', label: '🟢 Выполнен' }
    ];
    const users = [
        { value: 'user_001', label: 'Иванов И.И.' },
        { value: 'user_002', label: 'Петров С.А.' },
        { value: 'user_003', label: 'Сидорова Е.В.' },
        { value: 'user_004', label: 'Козлов Д.Н.' },
        { value: 'user_005', label: 'Михайлова А.С.' }
    ];
    
    return `
        <div class="form-group">
            <label for="planName">Наименование работ <span class="required">*</span></label>
            <input type="text" id="planName" value="${data.name || ''}" 
                   placeholder="Введите наименование работ" required />
        </div>
        <div class="form-group">
            <label for="planQuarter">Квартал <span class="required">*</span></label>
            <select id="planQuarter" required>
                ${quarters.map(q => 
                    `<option value="${q}" ${data.quarter === q ? 'selected' : ''}>${q}</option>`
                ).join('')}
            </select>
        </div>
        <div class="form-group">
            <label for="planStatus">Статус <span class="required">*</span></label>
            <select id="planStatus" required>
                ${statuses.map(s => 
                    `<option value="${s.value}" ${data.status === s.value ? 'selected' : ''}>${s.label}</option>`
                ).join('')}
            </select>
        </div>
        <div class="form-group">
            <label for="planResponsible">Ответственный <span class="required">*</span></label>
            <select id="planResponsible" required>
                ${users.map(u => 
                    `<option value="${u.value}" ${data.responsible === u.value ? 'selected' : ''}>${u.label}</option>`
                ).join('')}
            </select>
        </div>
    `;
}

/**
 * Создать форму для режима "Список работ"
 * @param {Object} data - Данные для заполнения
 * @returns {string} HTML формы
 */
function createTaskForm(data = {}) {
    const statuses = [
        { value: 'new', label: '🟠 Новый' },
        { value: 'in_work', label: '🔵 В работе' },
        { value: 'completed', label: '🟢 Выполнен' }
    ];
    const users = [
        { value: 'user_001', label: 'Иванов И.И.' },
        { value: 'user_002', label: 'Петров С.А.' },
        { value: 'user_003', label: 'Сидорова Е.В.' },
        { value: 'user_004', label: 'Козлов Д.Н.' },
        { value: 'user_005', label: 'Михайлова А.С.' }
    ];
    
    const today = new Date().toISOString().split('T')[0];
    const deadline = data.deadline || today;
    
    return `
        <div class="form-group">
            <label for="taskNumber">№ наряда <span class="required">*</span></label>
            <input type="text" id="taskNumber" value="${data.number || ''}" 
                   placeholder="Н-001/26" required />
        </div>
        <div class="form-group">
            <label for="taskToolingName">Наименование оснастки <span class="required">*</span></label>
            <input type="text" id="taskToolingName" value="${data.toolingName || ''}" 
                   placeholder="Введите наименование оснастки" required />
        </div>
        <div class="form-group">
            <label for="taskDeadline">Срок изготовления <span class="required">*</span></label>
            <input type="date" id="taskDeadline" value="${deadline}" required />
        </div>
        <div class="form-group">
            <label for="taskStatus">Статус <span class="required">*</span></label>
            <select id="taskStatus" required>
                ${statuses.map(s => 
                    `<option value="${s.value}" ${data.status === s.value ? 'selected' : ''}>${s.label}</option>`
                ).join('')}
            </select>
        </div>
        <div class="form-group">
            <label for="taskResponsible">Ответственный <span class="required">*</span></label>
            <select id="taskResponsible" required>
                ${users.map(u => 
                    `<option value="${u.value}" ${data.responsible === u.value ? 'selected' : ''}>${u.label}</option>`
                ).join('')}
            </select>
        </div>
    `;
}

/**
 * Создать форму для режима "Спецификации"
 * @param {Object} data - Данные для заполнения
 * @returns {string} HTML формы
 */
function createSpecForm(data = {}) {
    const statuses = [
        { value: 'active', label: '🟢 Активен' },
        { value: 'draft', label: '🟠 Черновик' },
        { value: 'approved', label: '✅ Утвержден' }
    ];
    
    return `
        <div class="form-group">
            <label for="specName">Наименование <span class="required">*</span></label>
            <input type="text" id="specName" value="${data.name || ''}" 
                   placeholder="КГ СТО-001" required />
        </div>
        <div class="form-group">
            <label for="specDesignation">Обозначение <span class="required">*</span></label>
            <input type="text" id="specDesignation" value="${data.designation || ''}" 
                   placeholder="АБВГ.123456.001" required />
        </div>
        <div class="form-group">
            <label for="specStatus">Статус <span class="required">*</span></label>
            <select id="specStatus" required>
                ${statuses.map(s => 
                    `<option value="${s.value}" ${data.status === s.value ? 'selected' : ''}>${s.label}</option>`
                ).join('')}
            </select>
        </div>
        <div class="form-group" style="background: #f8f8f8; padding: 12px; border-radius: 4px; border: 1px solid #e0e0e0;">
            <label style="font-weight: normal; color: #666;">
                ℹ️ Дерево спецификации будет создано автоматически
            </label>
        </div>
    `;
}

/**
 * Создать форму для режима "Архив"
 * @param {Object} data - Данные для заполнения
 * @returns {string} HTML формы
 */
function createArchiveForm(data = {}) {
    const statuses = [
        { value: 'agreed', label: '🟢 Согласован' },
        { value: 'disagreed', label: '🔴 Не согласован' },
        { value: 'in_progress', label: '🟠 В процессе' }
    ];
    
    // Получаем список спецификаций асинхронно
    let specOptions = '';
    db.getAllSpecifications().then(specs => {
        if (specs) {
            const select = document.getElementById('archiveSpecId');
            if (select) {
                specOptions = Object.entries(specs).map(([id, spec]) => 
                    `<option value="${id}" ${data.specificationId === id ? 'selected' : ''}>${spec.name} (${spec.designation})</option>`
                ).join('');
                select.innerHTML = `<option value="">Выберите спецификацию</option>${specOptions}`;
            }
        }
    });
    
    const today = new Date().toISOString().split('T')[0];
    const tzDate = data.tzDate || today;
    
    return `
        <div class="form-group">
            <label for="archiveTzNumber">№ ТЗ <span class="required">*</span></label>
            <input type="text" id="archiveTzNumber" value="${data.tzNumber || ''}" 
                   placeholder="ТЗ-001/26" required />
        </div>
        <div class="form-group">
            <label for="archiveTzDate">Дата <span class="required">*</span></label>
            <input type="date" id="archiveTzDate" value="${tzDate}" required />
        </div>
        <div class="form-group">
            <label for="archiveSpecId">Спецификация <span class="required">*</span></label>
            <select id="archiveSpecId" required>
                <option value="">Загрузка спецификаций...</option>
                ${data.specificationId ? `<option value="${data.specificationId}" selected>Загрузка...</option>` : ''}
            </select>
        </div>
        <div class="form-group">
            <label for="archiveStatus">Статус согласования <span class="required">*</span></label>
            <select id="archiveStatus" required>
                ${statuses.map(s => 
                    `<option value="${s.value}" ${data.status === s.value ? 'selected' : ''}>${s.label}</option>`
                ).join('')}
            </select>
        </div>
        <div class="form-group">
            <label for="archiveFiles">Файлы (через запятую)</label>
            <input type="text" id="archiveFiles" 
                   value="${Array.isArray(data.files) ? data.files.join(', ') : ''}" 
                   placeholder="файл1.pdf, файл2.pdf" />
        </div>
        <div class="form-group">
            <label for="archiveDescription">Описание</label>
            <textarea id="archiveDescription" rows="3" 
                      placeholder="Краткое описание ТЗ">${data.description || ''}</textarea>
        </div>
    `;
}

// ============================================
// ПОЛУЧЕНИЕ ДАННЫХ ИЗ ФОРМ
// ============================================

/**
 * Получить данные из формы
 * @param {string} mode - Режим
 * @returns {Object} Данные формы
 */
function getFormData(mode) {
    const configs = {
        plan: () => ({
            name: document.getElementById('planName').value.trim(),
            quarter: document.getElementById('planQuarter').value,
            status: document.getElementById('planStatus').value,
            responsible: document.getElementById('planResponsible').value
        }),
        tasks: () => ({
            number: document.getElementById('taskNumber').value.trim(),
            toolingName: document.getElementById('taskToolingName').value.trim(),
            deadline: document.getElementById('taskDeadline').value,
            status: document.getElementById('taskStatus').value,
            responsible: document.getElementById('taskResponsible').value
        }),
        specs: () => ({
            name: document.getElementById('specName').value.trim(),
            designation: document.getElementById('specDesignation').value.trim(),
            status: document.getElementById('specStatus').value
        }),
        archive: () => {
            const filesInput = document.getElementById('archiveFiles');
            const files = filesInput ? filesInput.value.split(',').map(f => f.trim()).filter(f => f) : [];
            return {
                tzNumber: document.getElementById('archiveTzNumber').value.trim(),
                tzDate: document.getElementById('archiveTzDate').value,
                specificationId: document.getElementById('archiveSpecId').value,
                status: document.getElementById('archiveStatus').value,
                files: files,
                description: document.getElementById('archiveDescription')?.value.trim() || ''
            };
        }
    };
    
    const getData = configs[mode];
    if (!getData) {
        console.error(`❌ Неизвестный режим для формы: ${mode}`);
        return {};
    }
    
    return getData();
}

/**
 * Валидация данных формы
 * @param {Object} data - Данные для проверки
 * @param {Array} requiredFields - Обязательные поля
 * @returns {boolean}
 */
function validateFormData(data, requiredFields) {
    for (const field of requiredFields) {
        const value = data[field];
        if (value === undefined || value === null || value === '') {
            showNotification(`Поле "${field}" обязательно для заполнения`, 'warning');
            return false;
        }
    }
    return true;
}

// ============================================
// ДИАЛОГИ ДЛЯ РАЗНЫХ ОПЕРАЦИЙ
// ============================================

/**
 * Показать диалог создания записи
 * @param {ModeManager} modeManager - Экземпляр ModeManager
 */
function showCreateDialog(modeManager) {
    const mode = modeManager.currentMode;
    const config = modeManager.getCurrentConfig();
    
    if (config.readonly) {
        showNotification('⚠️ Этот режим только для чтения', 'warning');
        return;
    }
    
    let formHtml;
    let requiredFields = [];
    
    switch (mode) {
        case 'plan':
            formHtml = createPlanForm();
            requiredFields = ['name', 'quarter', 'status', 'responsible'];
            break;
        case 'tasks':
            formHtml = createTaskForm();
            requiredFields = ['number', 'toolingName', 'deadline', 'status', 'responsible'];
            break;
        case 'specs':
            formHtml = createSpecForm();
            requiredFields = ['name', 'designation', 'status'];
            break;
        case 'archive':
            formHtml = createArchiveForm();
            requiredFields = ['tzNumber', 'tzDate', 'specificationId', 'status'];
            break;
        default:
            showNotification('❌ Неизвестный режим', 'error');
            return;
    }
    
    showModal(`➕ Создать запись (${config.title})`, formHtml, () => {
        const data = getFormData(mode);
        
        // Валидация
        if (!validateFormData(data, requiredFields)) {
            return false;
        }
        
        // Для архива проверяем, что выбрана спецификация
        if (mode === 'archive' && !data.specificationId) {
            showNotification('Выберите спецификацию', 'warning');
            return false;
        }
        
        modeManager.createRecord(data);
        return true;
    });
}

/**
 * Показать диалог редактирования записи
 * @param {ModeManager} modeManager - Экземпляр ModeManager
 */
function showEditDialog(modeManager) {
    const mode = modeManager.currentMode;
    const config = modeManager.getCurrentConfig();
    const id = modeManager.selectedId;
    
    if (config.readonly) {
        showNotification('⚠️ Этот режим только для чтения', 'warning');
        return;
    }
    
    if (!id) {
        showNotification('⚠️ Выберите запись для редактирования', 'warning');
        return;
    }
    
    // Проверка блокировки для спецификаций
    if (mode === 'specs') {
        const spec = modeManager.currentData[id];
        if (spec && spec.lockedBy) {
            const user = db.getCurrentUser();
            if (spec.lockedBy !== user.id) {
                showNotification('⚠️ Запись заблокирована другим пользователем', 'warning');
                return;
            }
        }
    }
    
    showEditForm(modeManager, mode, id, config);
}

/**
 * Показать форму редактирования
 * @param {ModeManager} modeManager - Экземпляр ModeManager
 * @param {string} mode - Режим
 * @param {string} id - ID записи
 * @param {Object} config - Конфигурация режима
 */
function showEditForm(modeManager, mode, id, config) {
    modeManager.getRecordForEdit(id).then(data => {
        if (!data) {
            showNotification('❌ Запись не найдена', 'error');
            return;
        }
        
        let formHtml;
        let requiredFields = [];
        
        switch (mode) {
            case 'plan':
                formHtml = createPlanForm(data);
                requiredFields = ['name', 'quarter', 'status', 'responsible'];
                break;
            case 'tasks':
                formHtml = createTaskForm(data);
                requiredFields = ['number', 'toolingName', 'deadline', 'status', 'responsible'];
                break;
            case 'specs':
                formHtml = createSpecForm(data);
                requiredFields = ['name', 'designation', 'status'];
                break;
            case 'archive':
                formHtml = createArchiveForm(data);
                requiredFields = ['tzNumber', 'tzDate', 'specificationId', 'status'];
                break;
            default:
                showNotification('❌ Неизвестный режим', 'error');
                return;
        }
        
        showModal(`✏️ Редактировать запись (${config.title})`, formHtml, () => {
            const formData = getFormData(mode);
            
            // Валидация
            if (!validateFormData(formData, requiredFields)) {
                return false;
            }
            
            // Для архива проверяем, что выбрана спецификация
            if (mode === 'archive' && !formData.specificationId) {
                showNotification('Выберите спецификацию', 'warning');
                return false;
            }
            
            modeManager.updateRecord(id, formData);
            return true;
        });
    });
}

/**
 * Показать диалог удаления записи
 * @param {ModeManager} modeManager - Экземпляр ModeManager
 */
function showDeleteDialog(modeManager) {
    const config = modeManager.getCurrentConfig();
    const id = modeManager.selectedId;
    
    if (config.readonly) {
        showNotification('⚠️ Этот режим только для чтения', 'warning');
        return;
    }
    
    if (!id) {
        showNotification('⚠️ Выберите запись для удаления', 'warning');
        return;
    }
    
    modeManager.deleteRecord(id);
}

/**
 * Показать диалог управления блокировкой спецификации
 * @param {ModeManager} modeManager - Экземпляр ModeManager
 */
function showLockDialog(modeManager) {
    const id = modeManager.selectedId;
    if (!id) {
        showNotification('⚠️ Выберите спецификацию', 'warning');
        return;
    }
    
    const spec = modeManager.currentData[id];
    if (!spec) {
        showNotification('❌ Спецификация не найдена', 'error');
        return;
    }
    
    const user = db.getCurrentUser();
    const isLockedByMe = spec.lockedBy === user.id;
    const isLockedByOther = spec.lockedBy && spec.lockedBy !== user.id;
    
    if (isLockedByOther) {
        showNotification(`🔒 Спецификация заблокирована пользователем ${spec.lockedBy}`, 'warning');
        return;
    }
    
    const title = isLockedByMe ? '🔓 Разблокировать спецификацию' : '🔒 Заблокировать спецификацию';
    const message = isLockedByMe 
        ? 'Вы уверены, что хотите разблокировать эту спецификацию?' 
        : 'Вы уверены, что хотите заблокировать эту спецификацию для редактирования?';
    
    const content = `
        <div style="text-align: center; padding: 20px;">
            <div style="font-size: 48px; margin-bottom: 16px;">${isLockedByMe ? '🔓' : '🔒'}</div>
            <p style="font-size: 16px; margin-bottom: 8px;">${message}</p>
            <p style="color: #666; font-size: 14px;">
                Спецификация: <strong>${spec.name}</strong>
            </p>
            ${isLockedByMe ? `
                <p style="color: #00a86b; font-size: 13px; margin-top: 8px;">
                    Заблокирована: ${new Date(spec.lockedAt).toLocaleString()}
                </p>
            ` : ''}
        </div>
    `;
    
    showModal(title, content, () => {
        if (isLockedByMe) {
            modeManager.unlockSpecification(id);
        } else {
            modeManager.lockSpecification(id);
        }
        return true;
    }, isLockedByMe ? 'Разблокировать' : 'Заблокировать');
}

/**
 * Показать диалог добавления узла в дерево спецификации
 * @param {ModeManager} modeManager - Экземпляр ModeManager
 * @param {string} parentId - ID родительского узла
 */
function showAddNodeDialog(modeManager, parentId = 'root') {
    const specId = modeManager.selectedId;
    if (!specId) {
        showNotification('⚠️ Выберите спецификацию', 'warning');
        return;
    }
    
    const spec = modeManager.currentData[specId];
    if (!spec) {
        showNotification('❌ Спецификация не найдена', 'error');
        return;
    }
    
    // Проверка блокировки
    const user = db.getCurrentUser();
    if (spec.lockedBy && spec.lockedBy !== user.id) {
        showNotification('⚠️ Спецификация заблокирована другим пользователем', 'warning');
        return;
    }
    
    const formHtml = `
        <div class="form-group">
            <label for="nodeName">Наименование <span class="required">*</span></label>
            <input type="text" id="nodeName" placeholder="Введите наименование узла" required />
        </div>
        <div class="form-group">
            <label for="nodeQuantity">Количество <span class="required">*</span></label>
            <input type="number" id="nodeQuantity" value="1" min="1" required />
        </div>
        <div class="form-group">
            <label for="nodeDesignation">Обозначение</label>
            <input type="text" id="nodeDesignation" placeholder="АБВГ.123456.001" />
        </div>
        <div class="form-group">
            <label for="nodeMaterial">Материал</label>
            <input type="text" id="nodeMaterial" placeholder="Сталь 45 ГОСТ 1050-88" />
        </div>
        <div class="form-group">
            <label for="nodeStatus">Статус</label>
            <select id="nodeStatus">
                <option value="new">📋 Новый</option>
                <option value="in_work">🔄 В работе</option>
                <option value="approved">✅ Утвержден</option>
            </select>
        </div>
        <div class="form-group" style="background: #f8f8f8; padding: 8px 12px; border-radius: 4px; border: 1px solid #e0e0e0;">
            <span style="font-size: 12px; color: #666;">
                📁 Родительский узел: <strong>${parentId === 'root' ? 'Корень' : parentId}</strong>
            </span>
        </div>
    `;
    
    showModal('➕ Добавить узел в дерево', formHtml, async () => {
        const name = document.getElementById('nodeName').value.trim();
        const quantity = parseInt(document.getElementById('nodeQuantity').value) || 1;
        const designation = document.getElementById('nodeDesignation').value.trim();
        const material = document.getElementById('nodeMaterial').value.trim();
        const status = document.getElementById('nodeStatus').value;
        
        if (!name) {
            showNotification('Введите наименование узла', 'warning');
            return false;
        }
        
        try {
            // Получаем текущую спецификацию
            const currentSpec = await db.getData(`specifications/${specId}`);
            if (!currentSpec || !currentSpec.tree) {
                showNotification('❌ Спецификация не найдена', 'error');
                return false;
            }
            
            // Создаем новый узел
            const newNode = {
                name: name,
                quantity: quantity,
                designation: designation || '',
                material: material || '',
                status: status || 'new',
                children: {}
            };
            
            // Находим родительский узел
            let parentNode = currentSpec.tree.root;
            if (parentId !== 'root') {
                const findNode = (node, targetId) => {
                    if (!node || !node.children) return null;
                    for (const [id, child] of Object.entries(node.children)) {
                        if (id === targetId) return child;
                        const result = findNode(child, targetId);
                        if (result) return result;
                    }
                    return null;
                };
                const found = findNode(currentSpec.tree.root, parentId);
                if (found) {
                    parentNode = found;
                } else {
                    showNotification('❌ Родительский узел не найден', 'error');
                    return false;
                }
            }
            
            // Добавляем узел
            const nodeId = db.generateId();
            if (!parentNode.children) {
                parentNode.children = {};
            }
            parentNode.children[nodeId] = newNode;
            
            // Сохраняем
            await db.updateData(`specifications/${specId}`, {
                tree: currentSpec.tree,
                updatedAt: new Date().toISOString()
            });
            
            showNotification('✅ Узел добавлен успешно', 'success');
            await modeManager.loadData();
            return true;
        } catch (error) {
            console.error('❌ Ошибка добавления узла:', error);
            showNotification(`❌ Ошибка: ${error.message}`, 'error');
            return false;
        }
    });
}

/**
 * Показать диалог редактирования узла дерева
 * @param {ModeManager} modeManager - Экземпляр ModeManager
 * @param {string} nodeId - ID узла
 */
function showEditNodeDialog(modeManager, nodeId) {
    const specId = modeManager.selectedId;
    if (!specId) {
        showNotification('⚠️ Выберите спецификацию', 'warning');
        return;
    }
    
    const spec = modeManager.currentData[specId];
    if (!spec) {
        showNotification('❌ Спецификация не найдена', 'error');
        return;
    }
    
    // Проверка блокировки
    const user = db.getCurrentUser();
    if (spec.lockedBy && spec.lockedBy !== user.id) {
        showNotification('⚠️ Спецификация заблокирована другим пользователем', 'warning');
        return;
    }
    
    // Находим узел в дереве
    const findNode = (node, targetId) => {
        if (!node) return null;
        // Добавляем временный id для поиска
        if (node._tempId === targetId) return node;
        if (node.children) {
            for (const [id, child] of Object.entries(node.children)) {
                // Сохраняем id в объекте для поиска
                child._tempId = id;
                const result = findNode(child, targetId);
                if (result) return result;
            }
        }
        return null;
    };
    
    // Клонируем дерево и добавляем временные id
    const treeCopy = JSON.parse(JSON.stringify(spec.tree));
    treeCopy.root._tempId = 'root';
    const node = findNode(treeCopy.root, nodeId);
    
    if (!node) {
        showNotification('❌ Узел не найден', 'error');
        return;
    }
    
    const formHtml = `
        <div class="form-group">
            <label for="nodeName">Наименование <span class="required">*</span></label>
            <input type="text" id="nodeName" value="${node.name || ''}" required />
        </div>
        <div class="form-group">
            <label for="nodeQuantity">Количество <span class="required">*</span></label>
            <input type="number" id="nodeQuantity" value="${node.quantity || 1}" min="1" required />
        </div>
        <div class="form-group">
            <label for="nodeDesignation">Обозначение</label>
            <input type="text" id="nodeDesignation" value="${node.designation || ''}" />
        </div>
        <div class="form-group">
            <label for="nodeMaterial">Материал</label>
            <input type="text" id="nodeMaterial" value="${node.material || ''}" />
        </div>
        <div class="form-group">
            <label for="nodeStatus">Статус</label>
            <select id="nodeStatus">
                <option value="new" ${node.status === 'new' ? 'selected' : ''}>📋 Новый</option>
                <option value="in_work" ${node.status === 'in_work' ? 'selected' : ''}>🔄 В работе</option>
                <option value="approved" ${node.status === 'approved' ? 'selected' : ''}>✅ Утвержден</option>
            </select>
        </div>
    `;
    
    showModal('✏️ Редактировать узел дерева', formHtml, async () => {
        const name = document.getElementById('nodeName').value.trim();
        const quantity = parseInt(document.getElementById('nodeQuantity').value) || 1;
        const designation = document.getElementById('nodeDesignation').value.trim();
        const material = document.getElementById('nodeMaterial').value.trim();
        const status = document.getElementById('nodeStatus').value;
        
        if (!name) {
            showNotification('Введите наименование узла', 'warning');
            return false;
        }
        
        try {
            // Получаем актуальную спецификацию
            const currentSpec = await db.getData(`specifications/${specId}`);
            if (!currentSpec || !currentSpec.tree) {
                showNotification('❌ Спецификация не найдена', 'error');
                return false;
            }
            
            // Функция для обновления узла
            const updateNode = (node, targetId) => {
                if (!node) return false;
                // Добавляем временный id
                if (node._tempId === targetId) {
                    node.name = name;
                    node.quantity = quantity;
                    node.designation = designation || '';
                    node.material = material || '';
                    node.status = status || 'new';
                    return true;
                }
                if (node.children) {
                    for (const [id, child] of Object.entries(node.children)) {
                        child._tempId = id;
                        if (updateNode(child, targetId)) {
                            delete child._tempId;
                            return true;
                        }
                    }
                }
                return false;
            };
            
            // Добавляем временные id
            currentSpec.tree.root._tempId = 'root';
            for (const [id, child] of Object.entries(currentSpec.tree.root.children
