// Low-latency key click (Web Audio, synthesized once and reused) + press feedback.
const ClickSound = (() => {
    const STORAGE_KEY = 'calculatorSound';
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    let volume = typeof saved.volume === 'number' ? saved.volume : 0.6;
    let muted = Boolean(saved.muted);
    let ctx = null;
    let gain = null;
    let buffer = null;

    function save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ volume, muted }));
    }

    // Perceptual curve so the slider feels linear to the ear.
    const toGain = v => v * v;

    function buildClick(audioCtx) {
        const rate = audioCtx.sampleRate;
        const length = Math.floor(rate * 0.028);
        const buf = audioCtx.createBuffer(1, length, rate);
        const data = buf.getChannelData(0);

        for (let i = 0; i < length; i++) {
            const t = i / rate;
            const transient = (Math.random() * 2 - 1) * Math.exp(-t * 1100);
            const body = Math.sin(2 * Math.PI * 3400 * t) * Math.exp(-t * 520) * 0.55
                + Math.sin(2 * Math.PI * 1750 * t) * Math.exp(-t * 700) * 0.3;
            data[i] = transient * 0.55 + body;
        }

        // One-pole high-pass removes low-end thump so the click stays crisp.
        let prevIn = 0;
        let prevOut = 0;
        let peak = 0;
        for (let i = 0; i < length; i++) {
            const out = 0.96 * (prevOut + data[i] - prevIn);
            prevIn = data[i];
            prevOut = out;
            data[i] = out;
            peak = Math.max(peak, Math.abs(out));
        }
        for (let i = 0; i < length; i++) data[i] = (data[i] / peak) * 0.9;
        return buf;
    }

    function ensureContext() {
        if (ctx) return true;
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return false;
        ctx = new AudioCtx({ latencyHint: 'interactive' });
        gain = ctx.createGain();
        gain.gain.value = toGain(volume);
        gain.connect(ctx.destination);
        buffer = buildClick(ctx);
        return true;
    }

    function play() {
        if (muted || volume <= 0 || !ensureContext()) return;
        if (ctx.state === 'suspended') ctx.resume();
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = 0.97 + Math.random() * 0.06;
        source.connect(gain);
        source.start();
    }

    function setVolume(value) {
        volume = Math.min(1, Math.max(0, value));
        if (gain) gain.gain.setTargetAtTime(toGain(volume), ctx.currentTime, 0.01);
        save();
    }

    function setMuted(value) {
        muted = Boolean(value);
        save();
    }

    return {
        play,
        setVolume,
        setMuted,
        get volume() { return volume; },
        get muted() { return muted; },
    };
})();

const PressFeedback = (() => {
    const PRESSABLE = 'button, .history-item';

    function ripple(el, clientX, clientY) {
        const rect = el.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height) * 2;
        const x = (clientX ?? rect.left + rect.width / 2) - rect.left - size / 2;
        const y = (clientY ?? rect.top + rect.height / 2) - rect.top - size / 2;
        const wave = document.createElement('span');
        wave.className = 'ripple';
        wave.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px`;
        el.appendChild(wave);
        wave.addEventListener('animationend', () => wave.remove());
    }

    function press(el, clientX, clientY) {
        ClickSound.play();
        el.classList.add('is-pressed');
        ripple(el, clientX, clientY);
    }

    function release(el) {
        el.classList.remove('is-pressed');
    }

    function flash(el) {
        press(el);
        setTimeout(() => release(el), 110);
    }

    const KEY_SELECTORS = {
        '.': '[data-action="decimal"]',
        '+': '[data-action="add"]',
        '-': '[data-action="subtract"]',
        '*': '[data-action="multiply"]',
        '/': '[data-action="divide"]',
        'Enter': '[data-action="equals"]',
        '=': '[data-action="equals"]',
        'Escape': '[data-action="clear"]',
        'Backspace': '[data-action="backspace"]',
        '%': '[data-action="percent"]',
        '(': '[data-action="open-paren"]',
        ')': '[data-action="close-paren"]',
        '^': '[data-action="power"]',
        '!': '[data-action="factorial"]',
    };

    function buttonForKey(key) {
        const panel = document.querySelector('.tab-content.active');
        if (!panel) return null;
        const selector = /^[0-9]$/.test(key) ? `[data-value="${key}"]` : KEY_SELECTORS[key];
        return selector ? panel.querySelector(selector) : null;
    }

    function init() {
        document.addEventListener('pointerdown', e => {
            if (e.button !== 0) return;
            const el = e.target.closest(PRESSABLE);
            if (!el || el.disabled) return;
            press(el, e.clientX, e.clientY);
            const end = () => {
                release(el);
                el.removeEventListener('pointerup', end);
                el.removeEventListener('pointerleave', end);
                el.removeEventListener('pointercancel', end);
            };
            el.addEventListener('pointerup', end);
            el.addEventListener('pointerleave', end);
            el.addEventListener('pointercancel', end);
        });

        document.addEventListener('keydown', e => {
            if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
            if (e.target.matches('input, textarea')) {
                if (e.key.length === 1 || e.key === 'Backspace') ClickSound.play();
                return;
            }
            const btn = buttonForKey(e.key);
            if (btn) flash(btn);
        });

        const toggle = document.getElementById('soundToggle');
        const slider = document.getElementById('volumeSlider');
        if (!toggle || !slider) return;

        const render = () => {
            const silent = ClickSound.muted || ClickSound.volume === 0;
            toggle.classList.toggle('is-muted', silent);
            toggle.setAttribute('aria-pressed', String(!silent));
            toggle.title = silent ? 'Unmute key sounds' : 'Mute key sounds';
            slider.value = Math.round(ClickSound.volume * 100);
            slider.style.setProperty('--fill', `${slider.value}%`);
        };

        toggle.addEventListener('click', () => {
            if (ClickSound.volume === 0) ClickSound.setVolume(0.6);
            ClickSound.setMuted(!ClickSound.muted);
            render();
        });

        slider.addEventListener('input', () => {
            ClickSound.setVolume(slider.value / 100);
            if (ClickSound.muted && slider.value > 0) ClickSound.setMuted(false);
            render();
        });
        slider.addEventListener('change', () => ClickSound.play());

        render();
    }

    return { init };
})();

document.addEventListener('DOMContentLoaded', PressFeedback.init);
