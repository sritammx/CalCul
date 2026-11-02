// Calculator State
const state = {
    currentInput: '0',
    previousInput: '',
    operator: null,
    waitingForOperand: false,
    memory: 0,
    angleMode: 'deg',
    lastAnswer: 0,
    history: [],
    currentTab: 'basic'
};

// Scientific tab builds a full expression and only evaluates it on "=".
const sci = {
    tokens: [],
    justEvaluated: false
};

// DOM Elements
const mainDisplay = document.getElementById('mainDisplay');
const historyDisplay = document.getElementById('historyDisplay');
const historyList = document.getElementById('historyList');
const financialResult = document.getElementById('financialResult');
const amortizationTable = document.getElementById('amortizationTable');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('calculatorTheme') === 'light') {
        document.body.classList.add('light-theme');
    }
    loadHistory();
    setupEventListeners();
    setupKeyboardSupport();
    updateDisplay();
});

function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);

    // Calculator buttons
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('click', handleButtonClick);
    });

    // Angle mode toggle
    document.querySelectorAll('.angle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            state.angleMode = btn.dataset.angle;
            document.querySelectorAll('.angle-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Financial calculator
    document.querySelectorAll('.btn-financial').forEach(btn => {
        btn.addEventListener('click', handleFinancialCalculation);
    });

    document.getElementById('generateAmortization').addEventListener('click', generateAmortizationSchedule);

    // History controls
    document.getElementById('clearHistory').addEventListener('click', clearHistory);
    document.getElementById('copyHistory').addEventListener('click', copyHistory);
}

function setupKeyboardSupport() {
    document.addEventListener('keydown', (e) => {
        if (state.currentTab === 'financial') return;
        if (state.currentTab === 'scientific') {
            handleScientificKey(e);
            return;
        }

        const key = e.key;

        // Numbers
        if (/[0-9]/.test(key)) {
            handleNumber(key);
        }
        // Decimal
        else if (key === '.') {
            handleDecimal();
        }
        // Operators
        else if (key === '+') {
            handleOperator('add');
        } else if (key === '-') {
            handleOperator('subtract');
        } else if (key === '*') {
            handleOperator('multiply');
        } else if (key === '/') {
            e.preventDefault();
            handleOperator('divide');
        }
        // Equals
        else if (key === 'Enter' || key === '=') {
            e.preventDefault();
            handleEquals();
        }
        // Clear
        else if (key === 'Escape') {
            handleClear();
        }
        // Backspace
        else if (key === 'Backspace') {
            handleBackspace();
        }
        // Percent
        else if (key === '%') {
            handlePercent();
        }
    });
}

function handleButtonClick(e) {
    const btn = e.currentTarget;
    const action = btn.dataset.action;
    const value = btn.dataset.value;
    const calc = btn.dataset.calc;

    if (btn.closest('#scientific')) {
        handleScientificInput(action, value);
        return;
    }

    if (value) {
        handleNumber(value);
    } else if (action) {
        handleAction(action);
    }
}

function handleAction(action) {
    switch (action) {
        case 'clear':
            handleClear();
            break;
        case 'backspace':
            handleBackspace();
            break;
        case 'decimal':
            handleDecimal();
            break;
        case 'negate':
            handleNegate();
            break;
        case 'percent':
            handlePercent();
            break;
        case 'equals':
            handleEquals();
            break;
        case 'add':
        case 'subtract':
        case 'multiply':
        case 'divide':
            handleOperator(action);
            break;
        case 'mc':
        case 'mr':
        case 'm-plus':
        case 'm-minus':
            handleMemory(action);
            break;
    }
}

function handleNumber(num) {
    if (state.waitingForOperand) {
        state.currentInput = num;
        state.waitingForOperand = false;
    } else {
        state.currentInput = state.currentInput === '0' ? num : state.currentInput + num;
    }
    updateDisplay();
}

function handleDecimal() {
    if (state.waitingForOperand) {
        state.currentInput = '0.';
        state.waitingForOperand = false;
    } else if (!state.currentInput.includes('.')) {
        state.currentInput += '.';
    }
    updateDisplay();
}

function handleOperator(op) {
    const inputValue = parseFloat(state.currentInput);

    if (state.operator && state.waitingForOperand) {
        state.operator = op;
        updateDisplay();
        return;
    }

    if (state.previousInput === '') {
        state.previousInput = inputValue;
    } else if (state.operator) {
        calculateResult(state.previousInput, inputValue, state.operator);
    }

    state.waitingForOperand = true;
    state.operator = op;
    updateDisplay();
}

async function calculateResult(a, b, op) {
    try {
        const data = await CalculatorAPI.basicCalculate(a, b, op);
        state.currentInput = String(data.result);
        state.previousInput = data.result;
        state.lastAnswer = data.result;
        
        // Refresh history from server
        await loadHistory();
    } catch (error) {
        console.error('API Error:', error);
        // Fallback to local calculation
        const result = calculateLocally(a, b, op);
        state.currentInput = String(result);
        state.previousInput = result;
        state.lastAnswer = result;
    }
    updateDisplay();
}

function calculateLocally(a, b, op) {
    switch (op) {
        case 'add': return a + b;
        case 'subtract': return a - b;
        case 'multiply': return a * b;
        case 'divide':
            if (b === 0) throw new Error('Division by zero');
            return a / b;
        case 'power': return Math.pow(a, b);
        default: return b;
    }
}

async function handleEquals() {
    if (!state.operator || state.previousInput === '') return;

    const inputValue = parseFloat(state.currentInput);
    
    try {
        const data = await CalculatorAPI.basicCalculate(state.previousInput, inputValue, state.operator);
        
        state.currentInput = String(data.result);
        state.previousInput = '';
        state.operator = null;
        state.waitingForOperand = true;
        state.lastAnswer = data.result;
        
        updateDisplay();
        await loadHistory();
    } catch (error) {
        console.error('API Error:', error);
        // Fallback to local calculation
        try {
            const result = calculateLocally(state.previousInput, inputValue, state.operator);
            const expression = `${state.previousInput} ${getOperatorSymbol(state.operator)} ${inputValue}`;
            addToLocalHistory(expression, result);
            
            state.currentInput = String(result);
            state.previousInput = '';
            state.operator = null;
            state.waitingForOperand = true;
            state.lastAnswer = result;
            
            updateDisplay();
        } catch (e) {
            state.currentInput = 'Error';
            updateDisplay();
            setTimeout(() => handleClear(), 1500);
        }
    }
}

function getOperatorSymbol(op) {
    switch (op) {
        case 'add': return '+';
        case 'subtract': return '-';
        case 'multiply': return '×';
        case 'divide': return '÷';
        case 'power': return '^';
        default: return '';
    }
}

function handleClear() {
    state.currentInput = '0';
    state.previousInput = '';
    state.operator = null;
    state.waitingForOperand = false;
    sci.tokens = [];
    sci.justEvaluated = false;
    updateDisplay();
}

function handleBackspace() {

    if (state.waitingForOperand) return;
    
    state.currentInput = state.currentInput.slice(0, -1);
    if (state.currentInput === '' || state.currentInput === '-') {
        state.currentInput = '0';
    }
    updateDisplay();
}

function handleNegate() {
    state.currentInput = String(-parseFloat(state.currentInput));
    updateDisplay();
}

function handlePercent() {
    state.currentInput = String(parseFloat(state.currentInput) / 100);
    updateDisplay();
}

function handleMemory(action) {
    const currentValue = parseFloat(state.currentInput);

    switch (action) {
        case 'mc':
            state.memory = 0;
            break;
        case 'mr':
            state.currentInput = String(state.memory);
            state.waitingForOperand = true;
            break;
        case 'm-plus':
            state.memory += currentValue;
            break;
        case 'm-minus':
            state.memory -= currentValue;
            break;
    }
    updateDisplay();
}

// Scientific Calculator: expression entry
const SCI_FUNCTIONS = {
    sin: 'sin(', cos: 'cos(', tan: 'tan(',
    asin: 'sin⁻¹(', acos: 'cos⁻¹(', atan: 'tan⁻¹(',
    log: 'log(', ln: 'ln(', sqrt: '√('
};
const SCI_FUNCTION_NAMES = Object.fromEntries(
    Object.entries(SCI_FUNCTIONS).map(([name, label]) => [label, name])
);
const SCI_BINARY = ['+', '−', '×', '÷', '^', 'E'];
const SCI_OPERATOR_TOKENS = {
    add: '+', subtract: '−', multiply: '×', divide: '÷', power: '^', exp: 'E'
};
const SCI_CONSTANTS = { pi: 'π', e: 'e', ans: 'ANS' };

const isNumberToken = (t) => /^[0-9.]+$/.test(t);
const endsValue = (t) => t !== undefined && (isNumberToken(t) || [')', 'π', 'e', 'ANS', '!'].includes(t));
const opensGroup = (t) => t === '(' || t in SCI_FUNCTION_NAMES;

function openParenCount() {
    return sci.tokens.reduce((n, t) => n + (opensGroup(t) ? 1 : t === ')' ? -1 : 0), 0);
}

function startFreshIfEvaluated(keepResult) {
    if (!sci.justEvaluated) return;
    sci.tokens = keepResult ? [String(state.lastAnswer)] : [];
    sci.justEvaluated = false;
}

function handleScientificInput(action, value) {
    if (value !== undefined) return sciAppendNumber(value);
    if (action === 'decimal') return sciAppendNumber('.');
    if (action === 'equals') return evaluateScientific();
    if (action === 'clear') return handleClear();
    if (action === 'backspace') {
        startFreshIfEvaluated(false);
        const last = sci.tokens.pop();
        if (last && isNumberToken(last) && last.length > 1) sci.tokens.push(last.slice(0, -1));
        return updateDisplay();
    }
    if (SCI_OPERATOR_TOKENS[action]) return sciAppendOperator(SCI_OPERATOR_TOKENS[action]);
    if (SCI_FUNCTIONS[action]) return sciPush(SCI_FUNCTIONS[action]);
    if (SCI_CONSTANTS[action]) return sciPush(SCI_CONSTANTS[action]);
    if (action === 'open-paren') return sciPush('(');
    if (action === 'close-paren') {
        const last = sci.tokens[sci.tokens.length - 1];
        if (openParenCount() > 0 && endsValue(last)) sciPush(')');
        return;
    }
    if (action === 'factorial') {
        startFreshIfEvaluated(true);
        if (endsValue(sci.tokens[sci.tokens.length - 1])) sciPush('!');
    }
}

function sciPush(token) {
    startFreshIfEvaluated(false);
    sci.tokens.push(token);
    updateDisplay();
}

function sciAppendNumber(ch) {
    startFreshIfEvaluated(false);
    const last = sci.tokens[sci.tokens.length - 1];
    if (last !== undefined && isNumberToken(last)) {
        if (ch === '.' && last.includes('.')) return;
        sci.tokens[sci.tokens.length - 1] = last === '0' && ch !== '.' ? ch : last + ch;
    } else {
        sci.tokens.push(ch === '.' ? '0.' : ch);
    }
    updateDisplay();
}

function sciAppendOperator(op) {
    startFreshIfEvaluated(true);
    const last = sci.tokens[sci.tokens.length - 1];
    if (op === 'E' && !isNumberToken(last || '')) return;
    if (last === undefined || opensGroup(last)) {
        if (op === '−') sciPush(op);
        else if (last === undefined) { sci.tokens.push('0'); sciPush(op); }
        return;
    }
    if (SCI_BINARY.includes(last)) {
        if (op === '−' && last !== '−' && last !== '+') return sciPush(op);
        const prev = sci.tokens[sci.tokens.length - 2];
        if (prev === undefined || opensGroup(prev) || SCI_BINARY.includes(prev)) return;
        sci.tokens[sci.tokens.length - 1] = op;
        return updateDisplay();
    }
    sciPush(op);
}

function scientificDisplayText() {
    if (sci.justEvaluated || sci.tokens.length === 0) return state.currentInput;
    return formatScientificExpression(sci.tokens);
}

function formatScientificExpression(tokens) {
    return tokens.map((t, i) => {
        if (!['+', '−', '×', '÷'].includes(t)) return t;
        const prev = tokens[i - 1];
        const unary = t === '−' && (prev === undefined || opensGroup(prev) || SCI_BINARY.includes(prev));
        return unary ? t : ` ${t} `;
    }).join('');
}

async function evaluateScientific() {
    if (sci.justEvaluated || sci.tokens.length === 0) return;
    const tokens = [...sci.tokens];
    for (let open = openParenCount(); open > 0; open--) tokens.push(')');
    const expression = formatScientificExpression(tokens);

    let result;
    try {
        result = roundResult(evaluateTokens(tokens));
    } catch (error) {
        sci.tokens = [];
        sci.justEvaluated = true;
        state.currentInput = 'Error';
        updateDisplay();
        showToast(error.message);
        return;
    }

    state.lastAnswer = result;
    state.currentInput = String(result);
    sci.tokens = [];
    sci.justEvaluated = true;
    updateDisplay();

    try {
        await CalculatorAPI.saveHistory(expression, result, 'scientific');
        await loadHistory();
    } catch (error) {
        addToLocalHistory(expression, result);
    }
}

function roundResult(v) {
    if (Math.abs(v) < 1e-12) return 0;
    return parseFloat(v.toPrecision(12));
}

function applyScientific(name, x) {
    const toAngle = (r) => state.angleMode === 'deg' ? fromRadians(r) : r;
    const fromAngle = (a) => state.angleMode === 'deg' ? toRadians(a) : a;
    switch (name) {
        case 'sin': return Math.sin(fromAngle(x));
        case 'cos': return Math.cos(fromAngle(x));
        case 'tan': {
            const r = Math.tan(fromAngle(x));
            if (Math.abs(r) > 1e15) throw new Error('tan is undefined here');
            return r;
        }
        case 'asin':
        case 'acos':
            if (x < -1 || x > 1) throw new Error('Input must be between -1 and 1');
            return toAngle(name === 'asin' ? Math.asin(x) : Math.acos(x));
        case 'atan': return toAngle(Math.atan(x));
        case 'log':
        case 'ln':
            if (x <= 0) throw new Error('Input must be positive');
            return name === 'log' ? Math.log10(x) : Math.log(x);
        case 'sqrt':
            if (x < 0) throw new Error('Input must be non-negative');
            return Math.sqrt(x);
    }
    throw new Error('Invalid function');
}

// Recursive-descent parser: + − < × ÷ (and implicit ×) < unary − < ^ E < ! < primary
function evaluateTokens(tokens) {
    const lex = [];
    tokens.forEach(t => {
        if (isNumberToken(t)) lex.push({ n: parseFloat(t) });
        else if (t in SCI_FUNCTION_NAMES) lex.push({ f: SCI_FUNCTION_NAMES[t] }, '(');
        else lex.push(t);
    });

    let i = 0;
    const peek = () => lex[i];
    const next = () => lex[i++];
    const expect = (tk) => { if (next() !== tk) throw new Error('Syntax error'); };
    const startsValue = (tk) => tk !== undefined && (typeof tk === 'object' || ['(', 'π', 'e', 'ANS'].includes(tk));

    function parseExpr() {
        let v = parseTerm();
        while (peek() === '+' || peek() === '−') {
            v = next() === '+' ? v + parseTerm() : v - parseTerm();
        }
        return v;
    }
    function parseTerm() {
        let v = parseUnary();
        for (;;) {
            const tk = peek();
            if (tk === '×') { next(); v *= parseUnary(); }
            else if (tk === '÷') {
                next();
                const d = parseUnary();
                if (d === 0) throw new Error('Division by zero');
                v /= d;
            }
            else if (startsValue(tk)) v *= parsePower();
            else return v;
        }
    }
    function parseUnary() {
        if (peek() === '−') { next(); return -parseUnary(); }
        return parsePower();
    }
    function parsePower() {
        const base = parsePostfix();
        if (peek() === '^') { next(); return Math.pow(base, parseUnary()); }
        if (peek() === 'E') { next(); return base * Math.pow(10, parseUnary()); }
        return base;
    }
    function parsePostfix() {
        let v = parsePrimary();
        while (peek() === '!') {
            next();
            if (!Number.isInteger(v)) throw new Error('n! needs a whole number');
            v = factorial(v);
        }
        return v;
    }
    function parsePrimary() {
        const tk = next();
        if (tk === undefined) throw new Error('Incomplete expression');
        if (typeof tk === 'object' && 'n' in tk) return tk.n;
        if (typeof tk === 'object') {
            expect('(');
            const arg = parseExpr();
            expect(')');
            return applyScientific(tk.f, arg);
        }
        if (tk === '(') {
            const v = parseExpr();
            expect(')');
            return v;
        }
        if (tk === 'π') return Math.PI;
        if (tk === 'e') return Math.E;
        if (tk === 'ANS') return state.lastAnswer;
        throw new Error('Syntax error');
    }

    const value = parseExpr();
    if (i < lex.length) throw new Error('Syntax error');
    if (!Number.isFinite(value)) throw new Error('Result is undefined');
    return value;
}

const SCI_KEYS = {
    '.': 'decimal', '+': 'add', '-': 'subtract', '*': 'multiply', '/': 'divide',
    '^': 'power', '!': 'factorial', '(': 'open-paren', ')': 'close-paren',
    'Enter': 'equals', '=': 'equals', 'Escape': 'clear', 'Backspace': 'backspace'
};

function handleScientificKey(e) {
    if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleScientificInput(undefined, e.key);
    } else if (SCI_KEYS[e.key]) {
        e.preventDefault();
        handleScientificInput(SCI_KEYS[e.key]);
    }
}

function toRadians(degrees) {
    return state.angleMode === 'deg' ? degrees * (Math.PI / 180) : degrees;
}

function fromRadians(radians) {
    return state.angleMode === 'deg' ? radians * (180 / Math.PI) : radians;
}

function factorial(n) {
    if (n < 0) throw new Error('Invalid input');
    if (n === 0 || n === 1) return 1;
    if (n > 170) throw new Error('Number too large');
    
    let result = 1;
    for (let i = 2; i <= n; i++) {
        result *= i;
    }
    return result;
}

// Financial Calculator Functions
async function handleFinancialCalculation(e) {
    const calc = e.currentTarget.dataset.calc;
    if (!calc) return;
    
    if (calc === 'clear-financial') {
        clearFinancialInputs();
        return;
    }

    const n = parseFloat(document.getElementById('n').value) || 0;
    const iy = parseFloat(document.getElementById('iy').value) || 0;
    const pv = parseFloat(document.getElementById('pv').value) || 0;
    const pmt = parseFloat(document.getElementById('pmt').value) || 0;
    const fv = parseFloat(document.getElementById('fv').value) || 0;

    try {
        const data = await CalculatorAPI.financialCalculate({
            n,
            iy,
            pv,
            pmt,
            fv,
            solveFor: calc.replace('solve-', '')
        });
        
        // Update the appropriate input field
        if (calc === 'solve-n') document.getElementById('n').value = data.result.toFixed(2);
        if (calc === 'solve-iy') document.getElementById('iy').value = data.result.toFixed(2);
        if (calc === 'solve-pv') document.getElementById('pv').value = data.result.toFixed(2);
        if (calc === 'solve-pmt') document.getElementById('pmt').value = data.result.toFixed(2);
        if (calc === 'solve-fv') document.getElementById('fv').value = data.result.toFixed(2);
        
        financialResult.textContent = `Result: ${data.result.toFixed(2)}`;
        await loadHistory();
    } catch (error) {
        console.error('API Error:', error);
        financialResult.textContent = `Error: ${error.message || 'Unable to calculate'}`;
    }
}

async function generateAmortizationSchedule() {
    const n = parseFloat(document.getElementById('n').value);
    const iy = parseFloat(document.getElementById('iy').value);
    const pv = parseFloat(document.getElementById('pv').value);
    const pmt = parseFloat(document.getElementById('pmt').value);

    if (!n || Number.isNaN(iy) || !pv || !pmt) {
        amortizationTable.innerHTML = '<p>Please fill in N, I/Y, PV, and PMT fields</p>';
        return;
    }

    try {
        const data = await CalculatorAPI.amortization({ n, iy, pv, pmt, fv: 0 });
        
        let html = '<table><thead><tr><th>Period</th><th>Payment</th><th>Interest</th><th>Principal</th><th>Balance</th></tr></thead><tbody>';
        
        data.schedule.forEach(row => {
            html += `<tr>
                <td>${row.period}</td>
                <td>${row.payment.toFixed(2)}</td>
                <td>${row.interest.toFixed(2)}</td>
                <td>${row.principal.toFixed(2)}</td>
                <td>${row.balance.toFixed(2)}</td>
            </tr>`;
        });
        
        html += '</tbody></table>';
        amortizationTable.innerHTML = html;
    } catch (error) {
        console.error('API Error:', error);
        amortizationTable.innerHTML = '<p>Error generating amortization schedule</p>';
    }
}

function clearFinancialInputs() {
    document.getElementById('n').value = '';
    document.getElementById('iy').value = '';
    document.getElementById('pv').value = '';
    document.getElementById('pmt').value = '';
    document.getElementById('fv').value = '';
    financialResult.textContent = '';
    amortizationTable.innerHTML = '';
}

// UI Functions
function switchTab(tab) {
    state.currentTab = tab;
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === tab);
    });

    handleClear();
}

function toggleTheme() {
    const isLight = document.body.classList.toggle('light-theme');
    localStorage.setItem('calculatorTheme', isLight ? 'light' : 'dark');
}

let toastTimer;
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
}

function updateDisplay() {
    if (state.currentTab === 'scientific') {
        mainDisplay.textContent = scientificDisplayText();
    } else if (state.operator && state.previousInput !== '') {
        const pending = `${state.previousInput} ${getOperatorSymbol(state.operator)}`;
        mainDisplay.textContent = state.waitingForOperand ? pending : `${pending} ${state.currentInput}`;
    } else {
        mainDisplay.textContent = state.currentInput;
    }
    historyDisplay.textContent = '';

    const length = mainDisplay.textContent.length;
    mainDisplay.dataset.size = length > 18 ? 'xs' : length > 13 ? 'sm' : length > 9 ? 'md' : 'lg';

    document.querySelectorAll('.btn-operator').forEach(btn => {
        btn.classList.toggle('is-active', state.waitingForOperand && btn.dataset.action === state.operator);
    });
}

// History Functions
async function loadHistory() {
    try {
        const data = await CalculatorAPI.getHistory(50);
        state.history = data;
        renderHistory();
    } catch (error) {
        console.error('Failed to load history from server:', error);
        // Use localStorage as fallback
        const saved = localStorage.getItem('calculatorHistory');
        if (saved) {
            state.history = JSON.parse(saved);
            renderHistory();
        }
    }
}

function addToLocalHistory(expression, result) {
    const historyItem = {
        expression,
        result: result.toFixed(10).replace(/\.?0+$/, ''),
        calculation_type: state.currentTab,
        timestamp: new Date().toISOString()
    };
    
    state.history.unshift(historyItem);
    
    if (state.history.length > 50) {
        state.history.pop();
    }
    
    localStorage.setItem('calculatorHistory', JSON.stringify(state.history));
    renderHistory();
}

function renderHistory() {
    if (!state.history.length) {
        historyList.innerHTML = '<div class="history-empty">No calculations yet</div>';
        return;
    }

    historyList.innerHTML = state.history.map(item => `
        <div class="history-item" data-expression="${item.expression}" data-result="${item.result}">
            <span class="history-expression">${item.expression} =</span>
            <span class="history-result">${item.result}</span>
        </div>
    `).join('');

    // Add click handlers to history items
    document.querySelectorAll('.history-item').forEach(item => {
        item.addEventListener('click', () => {
            if (state.currentTab === 'scientific') {
                sci.tokens = [item.dataset.result];
                sci.justEvaluated = false;
            }
            state.currentInput = item.dataset.result;
            state.waitingForOperand = true;
            updateDisplay();
        });
    });
}

async function clearHistory() {
    try {
        await CalculatorAPI.clearHistory();
        state.history = [];
        renderHistory();
        localStorage.removeItem('calculatorHistory');
    } catch (error) {
        console.error('Failed to clear history:', error);
        // Fallback to local clear
        state.history = [];
        localStorage.removeItem('calculatorHistory');
        renderHistory();
    }
}

function copyHistory() {
    const historyText = state.history.map(item => `${item.expression} = ${item.result}`).join('\n');
    navigator.clipboard.writeText(historyText).then(() => {
        showToast('History copied to clipboard');
    });
}
