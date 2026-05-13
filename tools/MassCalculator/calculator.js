(() => {
    const ELEMENTS = [
        { symbol: 'C', mass: 12.000000, name: '碳', isHetero: false },
        { symbol: 'H', mass: 1.007825, name: '氢', isHetero: false },
        { symbol: 'N', mass: 14.003074, name: '氮', isHetero: true },
        { symbol: 'S', mass: 31.972071, name: '硫', isHetero: true },
        { symbol: 'P', mass: 30.973762, name: '磷', isHetero: true },
        { symbol: 'F', mass: 18.998403, name: '氟', isHetero: true },
        { symbol: 'Cl', mass: 34.968853, name: '氯', isHetero: true },
        { symbol: 'Br', mass: 78.918337, name: '溴', isHetero: true },
        { symbol: 'I', mass: 126.904473, name: '碘', isHetero: true },
        { symbol: 'O', mass: 15.994915, name: '氧', isHetero: false },
        { symbol: 'B', mass: 11.009305, name: '硼', isHetero: true }
    ];

    const ELEMENT_ORDER_FOR_UI = ['C', 'H', 'O', 'N', 'S', 'P', 'B', 'F', 'Cl', 'Br', 'I'];
    const HETERO_SYMBOLS = ['N', 'S', 'P', 'F', 'Cl', 'Br', 'I', 'B'];
    const VALID_HETERO_NAMES = ['氮', '硫', '磷', '氟', '氯', '溴', '碘', '硼'];
    const CATEGORY_ORDER = ['CHO化合物', '硼化合物', '卤素化合物', '硫/磷化合物', '含氮化合物', '其他化合物'];

    const MIN_MASS = 16.0313;
    const MAX_MASS = 1000;
    const TOLERANCE = 0.002;
    const CALCULATION_TIMEOUT = 10000;
    const MAX_HETERO_ATOMS = 10;
    const NA_MASS = 22.989769;
    const STORAGE_KEY = 'massCalculatorSettings';
    const LEGACY_STORAGE_KEY = 'restrictionSettings';

    const elementBySymbol = new Map(ELEMENTS.map((element) => [element.symbol, element]));

    let dom;
    let restrictionSettings = {};

    class FormulaCalculator {
        constructor(restrictions) {
            this.restrictions = restrictions || {};
            this.stack = [];
            this.results = new Map();
            this.timeout = false;
        }

        initialize(target, tolerance = TOLERANCE, maxHeteroAtoms = null, allowedHeteroTypes = null) {
            this.target = target;
            this.tolerance = tolerance;
            this.maxHeteroAtoms = maxHeteroAtoms;
            this.allowedHeteroIndices = this.parseAllowedHeteroTypes(allowedHeteroTypes);
            this.stack = [{ index: 0, counts: new Array(ELEMENTS.length).fill(0), mass: 0 }];
            this.results.clear();
            this.timeout = false;
        }

        parseAllowedHeteroTypes(typesInput) {
            if (typesInput === null || typesInput === undefined) return null;

            const typeNames = Array.isArray(typesInput)
                ? typesInput.filter(Boolean)
                : typesInput.trim().split(/\s+/).filter(Boolean);

            const allowedIndices = [];
            const invalidTypes = [];

            typeNames.forEach((name) => {
                if (VALID_HETERO_NAMES.includes(name)) {
                    const element = ELEMENTS.find((item) => item.name === name);
                    if (element) allowedIndices.push(ELEMENTS.indexOf(element));
                } else {
                    invalidTypes.push(name);
                }
            });

            if (invalidTypes.length > 0) {
                throw new Error(`无效的杂原子类型: ${invalidTypes.join(', ')}`);
            }

            return allowedIndices;
        }

        calculate() {
            if (this.target > MAX_MASS) return [];

            const startTime = Date.now();
            let lastCheckTime = startTime;

            while (this.stack.length > 0) {
                const currentTime = Date.now();
                if (currentTime - lastCheckTime > 100) {
                    if (currentTime - startTime > CALCULATION_TIMEOUT) {
                        this.timeout = true;
                        return [];
                    }
                    lastCheckTime = currentTime;
                }

                const { index, counts, mass } = this.stack.pop();

                if (index === ELEMENTS.length) {
                    if (this.isValid(counts) && this.checkElementLimits(counts)) {
                        if (this.maxHeteroAtoms !== null) {
                            const totalHetero = this.countHeteroAtoms(counts);
                            if (totalHetero !== this.maxHeteroAtoms) continue;
                        }

                        const formula = this.getFormula(counts);
                        const error = Number((mass - this.target).toFixed(6));
                        if (Math.abs(error) <= this.tolerance) {
                            const category = this.classify(counts);
                            if (!this.results.has(category)) this.results.set(category, []);
                            this.results.get(category).push({
                                formula,
                                mass: Number(mass.toFixed(5)),
                                error,
                                ppm: Number(((error / this.target) * 1e6).toFixed(2)),
                                heteroCount: this.countHeteroAtoms(counts)
                            });
                        }
                    }
                    continue;
                }

                const element = ELEMENTS[index];
                let maxCount = Math.min(
                    Math.floor((this.target + this.tolerance - mass) / element.mass),
                    30
                );

                const elementLimit = this.restrictions[element.symbol];
                if (elementLimit && elementLimit.max !== undefined) {
                    maxCount = Math.min(maxCount, elementLimit.max);
                }

                for (let n = maxCount; n >= 0; n--) {
                    if (elementLimit && elementLimit.min !== undefined && n < elementLimit.min) continue;
                    if (this.allowedHeteroIndices !== null && element.isHetero && n > 0) {
                        if (!this.allowedHeteroIndices.includes(index)) continue;
                    }

                    const newMass = mass + n * element.mass;
                    if (newMass > this.target + this.tolerance) continue;

                    const newCounts = [...counts];
                    newCounts[index] = n;
                    this.stack.push({
                        index: index + 1,
                        counts: newCounts,
                        mass: newMass
                    });
                }
            }

            return this.formatResults();
        }

        checkElementLimits(counts) {
            for (let i = 0; i < counts.length; i++) {
                const element = ELEMENTS[i];
                const settings = this.restrictions[element.symbol];
                if (!settings) continue;
                if (settings.min !== undefined && counts[i] < settings.min) return false;
                if (settings.max !== undefined && counts[i] > settings.max) return false;
            }
            return true;
        }

        countHeteroAtoms(counts) {
            let total = 0;
            for (let i = 0; i < counts.length; i++) {
                if (ELEMENTS[i].isHetero) total += counts[i] || 0;
            }
            return total;
        }

        isValid(counts) {
            const c = counts[0];
            const h = counts[1];
            if (c < 1 || h < 2) return false;

            const o = counts[9];
            const n = counts[2];
            const s = counts[3];
            const p = counts[4];
            const b = counts[10];
            const maxH = 2 * c + 2 + 2 * (n + s + p + b) - 2 * o;
            return h <= maxH;
        }

        getFormula(counts) {
            return ELEMENTS.map((element, index) => {
                const count = counts[index];
                return count > 0 ? element.symbol + (count > 1 ? count : '') : '';
            }).join('');
        }

        classify(counts) {
            const present = ELEMENTS.filter((_, index) => counts[index] > 0).map((element) => element.symbol);
            const elementSet = new Set(present);

            const categories = [
                {
                    name: 'CHO化合物',
                    check: () => [...elementSet].every((symbol) => ['C', 'H', 'O'].includes(symbol))
                },
                {
                    name: '硼化合物',
                    check: () => elementSet.has('B')
                        && [...elementSet].every((symbol) => ['C', 'H', 'O', 'B'].includes(symbol))
                },
                {
                    name: '卤素化合物',
                    check: () => ['F', 'Cl', 'Br', 'I'].some((symbol) => elementSet.has(symbol))
                        && [...elementSet].every((symbol) => ['C', 'H', 'O', 'F', 'Cl', 'Br', 'I'].includes(symbol))
                },
                {
                    name: '硫/磷化合物',
                    check: () => (elementSet.has('S') || elementSet.has('P'))
                        && [...elementSet].every((symbol) => ['C', 'H', 'O', 'S', 'P'].includes(symbol))
                },
                {
                    name: '含氮化合物',
                    check: () => elementSet.has('N')
                        && [...elementSet].every((symbol) => ['C', 'H', 'O', 'N'].includes(symbol))
                }
            ];

            for (const category of categories) {
                if (category.check()) return category.name;
            }
            return '其他化合物';
        }

        formatResults() {
            return CATEGORY_ORDER
                .filter((category) => this.results.has(category))
                .map((category) => [
                    category,
                    this.results.get(category).sort((a, b) => Math.abs(a.error) - Math.abs(b.error))
                ]);
        }
    }

    function init() {
        dom = {
            form: document.getElementById('calculatorForm'),
            massInput: document.getElementById('massInput'),
            modePreview: document.getElementById('modePreview'),
            formStatus: document.getElementById('formStatus'),
            elementLimitGrid: document.getElementById('elementLimitGrid'),
            heteroAtomCount: document.getElementById('heteroAtomCount'),
            heteroTypeChecks: document.getElementById('heteroTypeChecks'),
            clearRestrictions: document.getElementById('clearRestrictions'),
            saveRestrictions: document.getElementById('saveRestrictions'),
            resetForm: document.getElementById('resetForm'),
            clearHistory: document.getElementById('clearHistory'),
            introNote: document.getElementById('introNote'),
            results: document.getElementById('results')
        };

        renderElementLimits();
        renderHeteroChecks();
        restrictionSettings = loadStoredRestrictions();
        applyRestrictionsToUi(restrictionSettings);
        updateModePreview();
        bindEvents();
    }

    function bindEvents() {
        dom.form.addEventListener('submit', handleCalculate);
        dom.saveRestrictions.addEventListener('click', () => {
            const settings = collectRestrictionSettings();
            if (!settings) return;
            restrictionSettings = settings;
            saveStoredRestrictions(settings);
            showStatus('限制已保存。', 'success');
            updateModePreview();
        });
        dom.clearRestrictions.addEventListener('click', clearRestrictions);
        dom.resetForm.addEventListener('click', resetMassInput);
        dom.clearHistory.addEventListener('click', clearHistory);

        document.querySelectorAll('input[name="ionMode"]').forEach((input) => {
            input.addEventListener('change', () => {
                updateModePreview();
                collectAndStoreRestrictionsSilently();
            });
        });

        dom.elementLimitGrid.addEventListener('change', collectAndStoreRestrictionsSilently);
        dom.heteroAtomCount.addEventListener('change', collectAndStoreRestrictionsSilently);
        dom.heteroTypeChecks.addEventListener('change', collectAndStoreRestrictionsSilently);
    }

    function renderElementLimits() {
        const fragment = document.createDocumentFragment();

        ELEMENT_ORDER_FOR_UI.forEach((symbol) => {
            const element = elementBySymbol.get(symbol);
            const row = document.createElement('div');
            row.className = 'limit-row';
            row.dataset.symbol = symbol;

            row.append(
                createElementName(element),
                createNumberInput(`min_${symbol}`, 'min', symbol),
                createNumberInput(`max_${symbol}`, 'max', symbol)
            );
            fragment.appendChild(row);
        });

        dom.elementLimitGrid.appendChild(fragment);
    }

    function createElementName(element) {
        const wrapper = document.createElement('div');
        wrapper.className = 'element-name';

        const symbol = document.createElement('span');
        symbol.className = 'element-symbol';
        symbol.textContent = element.symbol;

        const name = document.createElement('span');
        name.className = 'element-cn';
        name.textContent = element.name;

        wrapper.append(symbol, name);
        return wrapper;
    }

    function createNumberInput(id, role, symbol) {
        const input = document.createElement('input');
        input.type = 'number';
        input.min = '0';
        input.inputMode = 'numeric';
        input.id = id;
        input.dataset.role = role;
        input.dataset.symbol = symbol;
        input.setAttribute('aria-label', `${symbol} ${role === 'min' ? '最小值' : '最大值'}`);
        return input;
    }

    function renderHeteroChecks() {
        const fragment = document.createDocumentFragment();

        HETERO_SYMBOLS.forEach((symbol) => {
            const element = elementBySymbol.get(symbol);
            const label = document.createElement('label');
            const input = document.createElement('input');
            const text = document.createElement('span');

            input.type = 'checkbox';
            input.name = 'heteroTypes';
            input.value = element.name;
            input.checked = true;
            text.textContent = element.symbol;

            label.append(input, text);
            fragment.appendChild(label);
        });

        dom.heteroTypeChecks.appendChild(fragment);
    }

    function loadStoredRestrictions() {
        const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
        if (!stored) return {};

        try {
            return JSON.parse(stored) || {};
        } catch {
            return {};
        }
    }

    function saveStoredRestrictions(settings) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }

    function applyRestrictionsToUi(settings) {
        ELEMENTS.forEach((element) => {
            const minInput = document.getElementById(`min_${element.symbol}`);
            const maxInput = document.getElementById(`max_${element.symbol}`);
            const elementSettings = settings[element.symbol] || {};
            if (minInput) minInput.value = elementSettings.min ?? '';
            if (maxInput) maxInput.value = elementSettings.max ?? '';
        });

        const ionMode = settings.mNaPeak ? 'mNa' : 'neutral';
        const ionInput = document.querySelector(`input[name="ionMode"][value="${ionMode}"]`);
        if (ionInput) ionInput.checked = true;

        dom.heteroAtomCount.value = settings.heteroAtomCount ?? '';

        const allowedNames = settings.allowedHeteroNames;
        document.querySelectorAll('input[name="heteroTypes"]').forEach((input) => {
            input.checked = !Array.isArray(allowedNames) || allowedNames.includes(input.value);
        });
    }

    function collectRestrictionSettings() {
        const settings = {};

        for (const element of ELEMENTS) {
            const minInput = document.getElementById(`min_${element.symbol}`);
            const maxInput = document.getElementById(`max_${element.symbol}`);
            const min = parseOptionalInteger(minInput.value);
            const max = parseOptionalInteger(maxInput.value);

            if (min === false || max === false) {
                showStatus('元素限制必须是非负整数。', 'error');
                return null;
            }

            if (min !== undefined && max !== undefined && min > max) {
                showStatus(`${element.symbol} 的最小值不能大于最大值。`, 'error');
                return null;
            }

            if (min !== undefined || max !== undefined) {
                settings[element.symbol] = {};
                if (min !== undefined) settings[element.symbol].min = min;
                if (max !== undefined) settings[element.symbol].max = max;
            }
        }

        const heteroCount = parseOptionalInteger(dom.heteroAtomCount.value);
        if (heteroCount === false || (heteroCount !== undefined && heteroCount > MAX_HETERO_ATOMS)) {
            showStatus(`杂原子总数必须在 0-${MAX_HETERO_ATOMS} 之间。`, 'error');
            return null;
        }

        if (heteroCount !== undefined) settings.heteroAtomCount = heteroCount;

        const allowedHeteroNames = getAllowedHeteroNames();
        if (allowedHeteroNames.length !== VALID_HETERO_NAMES.length) {
            settings.allowedHeteroNames = allowedHeteroNames;
        }

        settings.mNaPeak = getIonMode() === 'mNa';
        return settings;
    }

    function collectAndStoreRestrictionsSilently() {
        const settings = collectRestrictionSettings();
        if (!settings) return;
        restrictionSettings = settings;
        saveStoredRestrictions(settings);
        updateModePreview();
        showStatus('', '');
    }

    function parseOptionalInteger(value) {
        if (value === '') return undefined;
        if (!/^\d+$/.test(value)) return false;
        return Number.parseInt(value, 10);
    }

    function getIonMode() {
        const selected = document.querySelector('input[name="ionMode"]:checked');
        return selected ? selected.value : 'neutral';
    }

    function getAllowedHeteroNames() {
        return [...document.querySelectorAll('input[name="heteroTypes"]:checked')]
            .map((input) => input.value);
    }

    function updateModePreview() {
        const label = getIonMode() === 'mNa' ? '[M+Na]' : 'Neutral';
        dom.modePreview.value = label;
        dom.modePreview.textContent = label;
    }

    function clearRestrictions() {
        ELEMENTS.forEach((element) => {
            document.getElementById(`min_${element.symbol}`).value = '';
            document.getElementById(`max_${element.symbol}`).value = '';
        });

        const neutral = document.querySelector('input[name="ionMode"][value="neutral"]');
        if (neutral) neutral.checked = true;
        dom.heteroAtomCount.value = '';
        document.querySelectorAll('input[name="heteroTypes"]').forEach((input) => {
            input.checked = true;
        });

        restrictionSettings = {};
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        updateModePreview();
        showStatus('限制已清空。', 'success');
    }

    function resetMassInput() {
        dom.massInput.value = '';
        dom.massInput.focus();
        showStatus('', '');
    }

    function clearHistory() {
        dom.results.replaceChildren();
        dom.introNote.classList.remove('is-hidden');
    }

    function handleCalculate(event) {
        event.preventDefault();
        showStatus('', '');

        const settings = collectRestrictionSettings();
        if (!settings) return;

        const massText = dom.massInput.value.trim();
        const observedMass = massText === '' ? 180.0634 : Number.parseFloat(massText);
        if (Number.isNaN(observedMass)) {
            showStatus('请输入有效数值。', 'error');
            return;
        }

        if (observedMass < MIN_MASS) {
            showStatus(`分子量过小，最小支持 ${MIN_MASS.toFixed(4)} Da。`, 'error');
            return;
        }

        if (observedMass > MAX_MASS) {
            showStatus(`分子量过大，最大支持 ${MAX_MASS} Da。`, 'error');
            return;
        }

        let actualTarget = observedMass;
        if (settings.mNaPeak) {
            actualTarget -= NA_MASS;
            if (actualTarget < MIN_MASS) {
                showStatus(`减去 Na 后的质量 ${actualTarget.toFixed(4)} Da 过小。`, 'error');
                return;
            }
        }

        restrictionSettings = settings;
        saveStoredRestrictions(settings);
        dom.massInput.value = observedMass.toFixed(5);

        const calculator = new FormulaCalculator(settings);
        try {
            calculator.initialize(
                actualTarget,
                TOLERANCE,
                settings.heteroAtomCount ?? null,
                settings.allowedHeteroNames ?? null
            );
            const results = calculator.calculate();
            renderResultCard({
                observedMass,
                actualTarget,
                ionMode: settings.mNaPeak ? '[M+Na]' : 'Neutral',
                results,
                timeout: calculator.timeout
            });
            showStatus(calculator.timeout ? '计算超时，请增加限制条件。' : '计算完成。', calculator.timeout ? 'error' : 'success');
        } catch (error) {
            showStatus(error.message || '计算失败。', 'error');
        }
    }

    function renderResultCard(payload) {
        const { observedMass, actualTarget, ionMode, results, timeout } = payload;
        const card = document.createElement('article');
        card.className = 'result-card';

        const header = document.createElement('header');
        header.className = 'result-card-header';

        const titleBlock = document.createElement('div');
        const title = document.createElement('h3');
        title.className = 'result-title';
        title.textContent = `${observedMass.toFixed(5)} Da`;

        const meta = document.createElement('div');
        meta.className = 'result-meta';
        meta.append(
            createPill(ionMode),
            createPill(`计算质量 ${actualTarget.toFixed(5)} Da`),
            createPill(`${countResults(results)} hits`)
        );

        titleBlock.append(title, meta);

        const time = document.createElement('time');
        time.className = 'result-time';
        time.dateTime = new Date().toISOString();
        time.textContent = new Date().toLocaleString();

        header.append(titleBlock, time);
        card.appendChild(header);

        if (timeout) {
            const warning = document.createElement('div');
            warning.className = 'timeout-warning';
            warning.textContent = '计算超时：10 秒内未完成。';
            card.appendChild(warning);
        }

        if (results.length === 0 && !timeout) {
            const empty = document.createElement('div');
            empty.className = 'no-results';
            empty.textContent = '没有找到符合条件的分子式。';
            card.appendChild(empty);
        }

        results.forEach(([category, items]) => {
            card.appendChild(renderResultGroup(category, items));
        });

        dom.introNote.classList.add('is-hidden');
        dom.results.prepend(card);
        while (dom.results.children.length > 5) dom.results.lastElementChild.remove();
    }

    function renderResultGroup(category, items) {
        const group = document.createElement('section');
        group.className = 'result-group';

        const heading = document.createElement('div');
        heading.className = 'category-row';

        const tag = document.createElement('span');
        tag.className = `category-tag ${getCategoryClass(category)}`;
        tag.textContent = category;

        const count = document.createElement('span');
        count.className = 'category-count';
        count.textContent = `${items.length} 个`;

        heading.append(tag, count);

        const table = document.createElement('div');
        table.className = 'formula-table';
        table.appendChild(renderTableHeader());
        items.forEach((item) => table.appendChild(renderFormulaRow(item)));

        group.append(heading, table);
        return group;
    }

    function renderTableHeader() {
        const row = document.createElement('div');
        row.className = 'formula-table-header';
        ['分子式', '理论值 Da', '偏差 Da', 'ppm', '杂原子'].forEach((label) => {
            const cell = document.createElement('span');
            cell.textContent = label;
            row.appendChild(cell);
        });
        return row;
    }

    function renderFormulaRow(item) {
        const row = document.createElement('div');
        row.className = 'formula-row';

        const formula = document.createElement('span');
        formula.className = 'formula';
        formula.innerHTML = formatFormulaHtml(item.formula);

        const mass = createNumericCell(item.mass.toFixed(5));
        const error = createNumericCell(`${item.error >= 0 ? '+' : ''}${item.error.toFixed(5)}`);
        error.classList.add(item.error >= 0 ? 'error-positive' : 'error-negative');
        const ppm = createNumericCell(item.ppm.toFixed(2));
        const hetero = createNumericCell(String(item.heteroCount));

        row.append(formula, mass, error, ppm, hetero);
        return row;
    }

    function createNumericCell(text) {
        const cell = document.createElement('span');
        cell.className = 'numeric';
        cell.textContent = text;
        return cell;
    }

    function formatFormulaHtml(formula) {
        return formula.replace(/([A-Z][a-z]?)(\d*)/g, (_, symbol, count) => {
            return `${symbol}${count ? `<sub>${count}</sub>` : ''}`;
        });
    }

    function createPill(text) {
        const pill = document.createElement('span');
        pill.className = 'pill';
        pill.textContent = text;
        return pill;
    }

    function countResults(results) {
        return results.reduce((total, [, items]) => total + items.length, 0);
    }

    function getCategoryClass(category) {
        return {
            '卤素化合物': 'halogen',
            '硫/磷化合物': 'sulfur-phosphor',
            '含氮化合物': 'nitrogen',
            'CHO化合物': 'cho',
            '硼化合物': 'boron',
            '其他化合物': 'other'
        }[category] || 'other';
    }

    function showStatus(message, type) {
        dom.formStatus.textContent = message;
        dom.formStatus.classList.toggle('is-error', type === 'error');
        dom.formStatus.classList.toggle('is-success', type === 'success');
    }

    const core = {
        FormulaCalculator,
        ELEMENTS,
        constants: {
            MIN_MASS,
            MAX_MASS,
            TOLERANCE,
            CALCULATION_TIMEOUT,
            MAX_HETERO_ATOMS,
            NA_MASS
        }
    };

    if (typeof window !== 'undefined') {
        window.MassCalculatorCore = core;
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = core;
    }

    if (typeof document !== 'undefined') {
        init();
    }
})();
