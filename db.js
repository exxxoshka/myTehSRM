// ============================================
// db.js — Все операции с Firebase Realtime Database
// ============================================

/**
 * Класс Database для работы с Firebase
 * Обеспечивает CRUD операции, подписку на изменения,
 * управление блокировками и загрузку тестовых данных
 */
class Database {
    constructor() {
        this.db = database;
        this.listeners = [];
        this.isTestDataLoaded = false;
    }

    /**
     * Получить ссылку на узел в базе данных
     * @param {string} path - Путь к узлу
     * @returns {firebase.database.Reference}
     */
    ref(path) {
        return this.db.ref(path);
    }

    /**
     * Получить данные один раз (без подписки)
     * @param {string} path - Путь к данным
     * @returns {Promise<any>}
     */
    async getData(path) {
        try {
            const snapshot = await this.ref(path).once('value');
            return snapshot.val();
        } catch (error) {
            console.error('❌ Ошибка получения данных:', error);
            throw new Error(`Не удалось получить данные: ${error.message}`);
        }
    }

    /**
     * Получить данные с дочерними узлами
     * @param {string} path - Путь к данным
     * @returns {Promise<Object>}
     */
    async getDataWithChildren(path) {
        try {
            const snapshot = await this.ref(path).once('value');
            const data = snapshot.val();
            if (!data) return null;
            
            // Получаем все дочерние ключи
            const children = {};
            const childSnapshot = await this.ref(path).orderByKey().once('value');
            childSnapshot.forEach((child) => {
                children[child.key] = child.val();
            });
            
            return children;
        } catch (error) {
            console.error('❌ Ошибка получения данных с дочерними узлами:', error);
            throw error;
        }
    }

    /**
     * Установить данные по пути (полная замена)
     * @param {string} path - Путь к данным
     * @param {any} data - Данные для установки
     * @returns {Promise<boolean>}
     */
    async setData(path, data) {
        try {
            await this.ref(path).set(data);
            console.log(`✅ Данные установлены: ${path}`);
            return true;
        } catch (error) {
            console.error('❌ Ошибка установки данных:', error);
            throw new Error(`Не удалось установить данные: ${error.message}`);
        }
    }

    /**
     * Обновить данные по пути (частичное обновление)
     * @param {string} path - Путь к данным
     * @param {Object} data - Данные для обновления
     * @returns {Promise<boolean>}
     */
    async updateData(path, data) {
        try {
            await this.ref(path).update(data);
            console.log(`✅ Данные обновлены: ${path}`);
            return true;
        } catch (error) {
            console.error('❌ Ошибка обновления данных:', error);
            throw new Error(`Не удалось обновить данные: ${error.message}`);
        }
    }

    /**
     * Удалить данные по пути
     * @param {string} path - Путь к данным
     * @returns {Promise<boolean>}
     */
    async deleteData(path) {
        try {
            await this.ref(path).remove();
            console.log(`✅ Данные удалены: ${path}`);
            return true;
        } catch (error) {
            console.error('❌ Ошибка удаления данных:', error);
            throw new Error(`Не удалось удалить данные: ${error.message}`);
        }
    }

    /**
     * Добавить данные с автоматической генерацией ID
     * @param {string} path - Путь к родительскому узлу
     * @param {Object} data - Данные для добавления
     * @returns {Promise<string>} - ID созданной записи
     */
    async pushData(path, data) {
        try {
            const newRef = this.ref(path).push();
            await newRef.set(data);
            console.log(`✅ Данные добавлены: ${path}/${newRef.key}`);
            return newRef.key;
        } catch (error) {
            console.error('❌ Ошибка добавления данных:', error);
            throw new Error(`Не удалось добавить данные: ${error.message}`);
        }
    }

    /**
     * Подписаться на изменения данных
     * @param {string} path - Путь к данным
     * @param {Function} callback - Функция обратного вызова
     * @returns {Function} - Функция для отписки
     */
    subscribe(path, callback) {
        const listener = this.ref(path).on('value', (snapshot) => {
            try {
                callback(snapshot.val());
            } catch (error) {
                console.error('❌ Ошибка в callback подписки:', error);
            }
        });
        
        this.listeners.push({ path, listener });
        console.log(`📡 Подписка добавлена: ${path}`);
        return listener;
    }

    /**
     * Подписаться на изменения с фильтрацией по дочерним узлам
     * @param {string} path - Путь к данным
     * @param {string} childKey - Ключ дочернего узла для фильтрации
     * @param {any} childValue - Значение для фильтрации
     * @param {Function} callback - Функция обратного вызова
     * @returns {Function}
     */
    subscribeFiltered(path, childKey, childValue, callback) {
        const query = this.ref(path).orderByChild(childKey).equalTo(childValue);
        const listener = query.on('value', (snapshot) => {
            try {
                callback(snapshot.val());
            } catch (error) {
                console.error('❌ Ошибка в callback фильтрованной подписки:', error);
            }
        });
        
        this.listeners.push({ path, listener, filtered: true });
        console.log(`📡 Фильтрованная подписка добавлена: ${path} (${childKey}=${childValue})`);
        return listener;
    }

    /**
     * Отписаться от изменений
     * @param {string} path - Путь к данным
     * @param {Function} listener - Функция слушателя
     */
    unsubscribe(path, listener) {
        if (listener) {
            this.ref(path).off('value', listener);
        } else {
            // Если listener не передан, отписываемся от всех слушателей на этом пути
            this.ref(path).off();
        }
        console.log(`📡 Отписка: ${path}`);
    }

    /**
     * Отписаться от всех изменений
     */
    unsubscribeAll() {
        this.listeners.forEach(({ path, listener }) => {
            try {
                this.ref(path).off('value', listener);
            } catch (error) {
                console.warn(`⚠️ Ошибка при отписке ${path}:`, error);
            }
        });
        this.listeners = [];
        console.log('📡 Все подписки удалены');
    }

    /**
     * Создать уникальный ID
     * @returns {string}
     */
    generateId() {
        return this.db.ref().push().key;
    }

    /**
     * Получить текущего пользователя
     * В реальном приложении здесь был бы запрос к Firebase Auth
     * @returns {Object}
     */
    getCurrentUser() {
        return {
            id: 'user_001',
            lastName: 'Иванов',
            firstName: 'Иван',
            patronymic: 'Иванович',
            department: '01',
            role: 'constructor',
            position: 'Инженер-конструктор I категории',
            fullName: 'Иванов Иван Иванович'
        };
    }

    /**
     * Получить пользователя по ID
     * @param {string} userId - ID пользователя
     * @returns {Promise<Object|null>}
     */
    async getUser(userId) {
        try {
            const user = await this.getData(`users/${userId}`);
            return user;
        } catch (error) {
            console.error('❌ Ошибка получения пользователя:', error);
            return null;
        }
    }

    /**
     * Получить имя пользователя по ID
     * @param {string} userId - ID пользователя
     * @returns {Promise<string>}
     */
    async getUserName(userId) {
        try {
            const user = await this.getUser(userId);
            if (user) {
                return `${user.lastName} ${user.firstName.charAt(0)}.${user.patronymic.charAt(0)}.`;
            }
            return userId;
        } catch (error) {
            return userId;
        }
    }

    /**
     * Проверить блокировку спецификации
     * @param {string} specId - ID спецификации
     * @returns {Promise<Object|null>}
     */
    async getSpecificationLock(specId) {
        try {
            const data = await this.getData(`specifications/${specId}`);
            if (!data) return null;
            return {
                lockedBy: data.lockedBy || null,
                lockedAt: data.lockedAt || null
            };
        } catch (error) {
            console.error('❌ Ошибка получения блокировки:', error);
            return null;
        }
    }

    /**
     * Проверить, заблокирована ли спецификация другим пользователем
     * @param {string} specId - ID спецификации
     * @param {string} userId - ID текущего пользователя
     * @returns {Promise<boolean>}
     */
    async isLockedByOther(specId, userId) {
        try {
            const lock = await this.getSpecificationLock(specId);
            if (!lock || !lock.lockedBy) return false;
            return lock.lockedBy !== userId;
        } catch (error) {
            console.error('❌ Ошибка проверки блокировки:', error);
            return false;
        }
    }

    /**
     * Заблокировать спецификацию для редактирования
     * @param {string} specId - ID спецификации
     * @param {string} userId - ID пользователя, который блокирует
     * @returns {Promise<boolean>}
     */
    async lockSpecification(specId, userId) {
        try {
            // Проверяем, не заблокирована ли уже
            const lock = await this.getSpecificationLock(specId);
            if (lock && lock.lockedBy && lock.lockedBy !== userId) {
                throw new Error('Спецификация уже заблокирована другим пользователем');
            }
            
            await this.updateData(`specifications/${specId}`, {
                lockedBy: userId,
                lockedAt: new Date().toISOString()
            });
            console.log(`🔒 Спецификация ${specId} заблокирована пользователем ${userId}`);
            return true;
        } catch (error) {
            console.error('❌ Ошибка блокировки:', error);
            throw error;
        }
    }

    /**
     * Разблокировать спецификацию
     * @param {string} specId - ID спецификации
     * @returns {Promise<boolean>}
     */
    async unlockSpecification(specId) {
        try {
            await this.updateData(`specifications/${specId}`, {
                lockedBy: null,
                lockedAt: null
            });
            console.log(`🔓 Спецификация ${specId} разблокирована`);
            return true;
        } catch (error) {
            console.error('❌ Ошибка разблокировки:', error);
            throw error;
        }
    }

    /**
     * Получить все спецификации
     * @returns {Promise<Object>}
     */
    async getAllSpecifications() {
        try {
            return await this.getData('specifications');
        } catch (error) {
            console.error('❌ Ошибка получения спецификаций:', error);
            return {};
        }
    }

    /**
     * Получить спецификацию с деревом
     * @param {string} specId - ID спецификации
     * @returns {Promise<Object|null>}
     */
    async getSpecificationWithTree(specId) {
        try {
            const spec = await this.getData(`specifications/${specId}`);
            if (!spec) return null;
            return spec;
        } catch (error) {
            console.error('❌ Ошибка получения спецификации:', error);
            return null;
        }
    }

    /**
     * Загрузить тестовые данные
     * Создает 15 записей в каждом разделе
     * @returns {Promise<boolean>}
     */
    async loadTestData() {
        try {
            // Проверяем, есть ли уже данные
            const snapshot = await this.ref('plans').once('value');
            if (snapshot.exists()) {
                console.log('ℹ️ Тестовые данные уже загружены');
                this.isTestDataLoaded = true;
                return true;
            }

            console.log('🔄 Загрузка тестовых данных...');

            // ============ ПОЛЬЗОВАТЕЛИ ============
            const users = {
                'user_001': {
                    lastName: 'Иванов',
                    firstName: 'Иван',
                    patronymic: 'Иванович',
                    department: '01',
                    role: 'constructor',
                    position: 'Инженер-конструктор I категории'
                },
                'user_002': {
                    lastName: 'Петров',
                    firstName: 'Сергей',
                    patronymic: 'Александрович',
                    department: '02',
                    role: 'constructor',
                    position: 'Инженер-конструктор II категории'
                },
                'user_003': {
                    lastName: 'Сидорова',
                    firstName: 'Елена',
                    patronymic: 'Викторовна',
                    department: '01',
                    role: 'constructor',
                    position: 'Ведущий инженер-конструктор'
                },
                'user_004': {
                    lastName: 'Козлов',
                    firstName: 'Дмитрий',
                    patronymic: 'Николаевич',
                    department: '03',
                    role: 'technologist',
                    position: 'Инженер-технолог'
                },
                'user_005': {
                    lastName: 'Михайлова',
                    firstName: 'Анна',
                    patronymic: 'Сергеевна',
                    department: '02',
                    role: 'constructor',
                    position: 'Инженер-конструктор III категории'
                }
            };

            // ============ ПЛАНЫ ТПП ============
            const plans = {};
            const planNames = [
                'Разработка оснастки для детали "Кронштейн"',
                'Изготовление приспособления "Кондуктор сверлильный"',
                'Проектирование штамповой оснастки для листовых деталей',
                'Разработка КИП для сборки узла',
                'Модернизация существующей оснастки цеха №5',
                'Разработка технологической документации на оснастку',
                'Изготовление прототипа оснастки для испытаний',
                'Проектирование контрольно-измерительной оснастки',
                'Разработка управляющей программы для ЧПУ',
                'Изготовление специального режущего инструмента',
                'Проектирование приспособления для сварки корпуса',
                'Разработка системы крепления для станка',
                'Изготовление модельной оснастки для литья',
                'Проектирование пресс-формы для пластиковых деталей',
                'Разработка технологии сборки и контроля'
            ];
            const quarters = ['Q1-2026', 'Q2-2026', 'Q3-2026', 'Q4-2026'];
            const statuses = ['new', 'in_work', 'completed'];
            const responsible = ['user_001', 'user_002', 'user_003', 'user_004', 'user_005'];

            for (let i = 0; i < 15; i++) {
                const id = `plan_${String(i + 1).padStart(3, '0')}`;
                const statusIdx = i % 3;
                plans[id] = {
                    name: planNames[i % planNames.length] + (i > 10 ? ` (вариант ${i})` : ''),
                    quarter: quarters[i % quarters.length],
                    status: statuses[statusIdx],
                    responsible: responsible[i % responsible.length],
                    createdAt: new Date(2026, 0, i + 1).toISOString(),
                    updatedAt: new Date(2026, 0, i + 15).toISOString()
                };
            }

            // ============ ЗАДАЧИ (НАРЯДЫ) ============
            const tasks = {};
            const toolingNames = [
                'Приспособление для фрезерования пазов',
                'Кондуктор сверлильный универсальный',
                'Штамп вырубной для детали "Пластина"',
                'Приспособление для сборки корпуса',
                'Калибр-пробка резьбовая',
                'Инструмент специальный для расточки',
                'Приспособление для сварки трубопровода',
                'Штамп гибочный для уголков',
                'Приспособление для контроля геометрии',
                'Приспособление для обработки отверстий',
                'Штамп формовочный для днища',
                'Приспособление для разметки заготовок',
                'Приспособление для запрессовки втулок',
                'Приспособление для токарной обработки валов',
                'Приспособление для шлифовки плоскостей'
            ];

            for (let i = 0; i < 15; i++) {
                const id = `task_${String(i + 1).padStart(3, '0')}`;
                const year = 2026;
                const month = (i % 12) + 1;
                const day = (i * 3) % 28 + 1;
                const statusIdx = i % 3;
                tasks[id] = {
                    number: `Н-${String(i + 1).padStart(3, '0')}/${String(year).slice(-2)}`,
                    toolingName: toolingNames[i % toolingNames.length] + (i > 10 ? ` v${i}` : ''),
                    deadline: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
                    status: statuses[statusIdx],
                    responsible: responsible[i % responsible.length],
                    createdAt: new Date(2026, 0, i + 1).toISOString()
                };
            }

            // ============ СПЕЦИФИКАЦИИ КГ СТО ============
            const specs = {};
            const specNames = ['КГ СТО-001', 'КГ СТО-002', 'КГ СТО-003', 'КГ СТО-004', 'КГ СТО-005'];
            const designations = ['АБВГ.123456.001', 'АБВГ.123456.002', 'АБВГ.123456.003', 'АБВГ.123456.004', 'АБВГ.123456.005'];
            const materials = ['Сталь 45 ГОСТ 1050-88', 'Сталь 3 ГОСТ 380-2005', 'Алюминий Д16Т', 'Чугун СЧ20 ГОСТ 1412-85', 'Бронза БрОЦ4-3'];
            const specStatuses = ['active', 'draft', 'active', 'draft', 'active'];

            for (let i = 0; i < 5; i++) {
                const id = `spec_${String(i + 1).padStart(3, '0')}`;
                const tree = {
                    root: {
                        name: specNames[i],
                        quantity: 1,
                        designation: designations[i],
                        material: materials[i % materials.length],
                        status: i < 3 ? 'approved' : 'in_work',
                        children: {}
                    }
                };

                // Добавляем дочерние узлы
                const childNames = [
                    ['Плита основания', 'Колонна вертикальная', 'Пластина опорная'],
                    ['Плита базовая', 'Опора регулируемая', 'Прижим пневматический'],
                    ['Плита опорная', 'Стойка направляющая', 'Упор регулируемый'],
                    ['Плита крепёжная', 'Кронштейн поворотный', 'Корпус защитный'],
                    ['Плита установочная', 'Опора сферическая', 'Прижим механический']
                ];

                for (let j = 0; j < 3; j++) {
                    const childId = `node_${String(j + 1).padStart(2, '0')}`;
                    const childMatIdx = (i + j) % materials.length;
                    tree.root.children[childId] = {
                        name: childNames[i % childNames.length][j],
                        quantity: j + 1,
                        designation: `АБВГ.123456.${String(i + 1).padStart(3, '0')}${String(j + 1).padStart(2, '0')}`,
                        material: materials[childMatIdx],
                        status: j < 2 ? 'approved' : 'in_work',
                        children: {}
                    };

                    // Добавляем вложенные узлы для первого дочернего узла
                    if (j === 0) {
                        const subChildId = `node_${String(j + 1).padStart(2, '0')}_1`;
                        const subMatIdx = (i + j + 1) % materials.length;
                        tree.root.children[childId].children[subChildId] = {
                            name: `Элемент крепления ${j + 1}`,
                            quantity: 2,
                            designation: `АБВГ.123456.${String(i + 1).padStart(3, '0')}${String(j + 1).padStart(2, '0')}A`,
                            material: materials[subMatIdx],
                            status: 'approved',
                            children: {}
                        };
                    }
                }

                specs[id] = {
                    name: specNames[i],
                    designation: designations[i],
                    status: specStatuses[i],
                    createdBy: responsible[i % responsible.length],
                    lockedBy: null,
                    lockedAt: null,
                    tree: tree,
                    createdAt: new Date(2026, 0, i + 1).toISOString()
                };
            }

            // ============ АРХИВ ТЗ ============
            const archives = {};
            const tzStatuses = ['agreed', 'disagreed', 'in_progress', 'agreed', 'agreed'];
            const specIds = ['spec_001', 'spec_002', 'spec_003', 'spec_004', 'spec_005'];

            for (let i = 0; i < 10; i++) {
                const id = `archive_${String(i + 1).padStart(3, '0')}`;
                const year = 2025 + Math.floor(i / 8);
                const month = (i % 12) + 1;
                const day = (i * 2 % 28) + 1;
                const specIdx = i % specIds.length;
                const fileCount = (i % 3) + 1;
                const files = [];
                for (let f = 0; f < fileCount; f++) {
                    files.push(`документ_${i + 1}_${f + 1}.pdf`);
                }
                
                archives[id] = {
                    tzNumber: `ТЗ-${String(i + 1).padStart(3, '0')}/${String(year).slice(-2)}`,
                    tzDate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
                    specificationId: specIds[specIdx],
                    status: tzStatuses[i % tzStatuses.length],
                    files: files,
                    description: `Техническое задание на разработку оснастки (позиция ${i + 1})`,
                    createdAt: new Date(year, month - 1, day).toISOString()
                };
            }

            // Загружаем все данные
            await this.setData('users', users);
            await this.setData('plans', plans);
            await this.setData('tasks', tasks);
            await this.setData('specifications', specs);
            await this.setData('archives', archives);

            this.isTestDataLoaded = true;
            console.log('✅ Тестовые данные успешно загружены!');
            console.log(`📊 Загружено: 
                - Пользователей: ${Object.keys(users).length}
                - Планов ТПП: ${Object.keys(plans).length}
                - Задач: ${Object.keys(tasks).length}
                - Спецификаций: ${Object.keys(specs).length}
                - Архивных ТЗ: ${Object.keys(archives).length}
            `);
            return true;
        } catch (error) {
            console.error('❌ Ошибка загрузки тестовых данных:', error);
            throw error;
        }
    }

    /**
     * Проверить, загружены ли тестовые данные
     * @returns {boolean}
     */
    isTestDataLoadedCheck() {
        return this.isTestDataLoaded;
    }

    /**
     * Получить статистику по базе данных
     * @returns {Promise<Object>}
     */
    async getDatabaseStats() {
        try {
            const stats = {};
            const paths = ['users', 'plans', 'tasks', 'specifications', 'archives'];
            
            for (const path of paths) {
                const data = await this.getData(path);
                stats[path] = data ? Object.keys(data).length : 0;
            }
            
            return stats;
        } catch (error) {
            console.error('❌ Ошибка получения статистики:', error);
            return {};
        }
    }

    /**
     * Очистить все данные (для тестирования)
     * @returns {Promise<boolean>}
     */
    async clearAllData() {
        try {
            const paths = ['users', 'plans', 'tasks', 'specifications', 'archives'];
            for (const path of paths) {
                await this.deleteData(path);
            }
            this.isTestDataLoaded = false;
            console.log('🗑️ Все данные очищены');
            return true;
        } catch (error) {
            console.error('❌ Ошибка очистки данных:', error);
            throw error;
        }
    }
}

// ============================================
// СОЗДАЕМ ЭКЗЕМПЛЯР БАЗЫ ДАННЫХ
// ============================================
const db = new Database();

// Автоматически загружаем тестовые данные при инициализации
setTimeout(async () => {
    try {
        await db.loadTestData();
    } catch (error) {
        console.warn('⚠️ Не удалось загрузить тестовые данные:', error.message);
    }
}, 2000);

// Экспортируем для использования в других файлах
console.log('📦 Модуль db.js загружен');
