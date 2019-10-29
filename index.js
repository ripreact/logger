const { hsl } = require('@ripreact/hsl');
const hash = require('string-hash');
const chalk = require('chalk');

// region Common internals
const timings = {};
const defaultFilter = () => true;

const s = 1000;
const m = s * 60;
const h = m * 60;
const d = h * 24;

const { round } = Math;

const ms = ms => {
    const abs = Math.abs(ms);

    if (abs >= d) return round(ms / d) + 'd';
    if (abs >= h) return round(ms / h) + 'h';
    if (abs >= m) return round(ms / m) + 'm';
    if (abs >= s) return round(ms / s) + 's';

    return ms + 'ms';
};
// endregion Common internals

// region Logger
const send = (raw, time, level, payload) => async t => {
    t({
        raw,
        time,
        level,
        payload,
        namespace: raw.split(':').map((name, i, namespace) => {
            const prefix = namespace.slice(0, i + 1).join(':');
            const diff = time - (timings[prefix] || (timings[prefix] = time));

            timings[prefix] = time;

            return {
                name,
                diff,
            };
        }),
    });
};

const createLoggerFunction = ({ prefix, filter, transports }, level) => {
    return (ss, ...xs) => {
        const raw = xs.reduce((ns, x, i) => ns + ss[i] + String(x), prefix) + ss[ss.length - 1];

        return (...payload) => {
            if (filter(level, raw)) transports.forEach(send(raw, Date.now(), level, payload));
        };
    };
};

module.exports.Logger = config => ({
    error: createLoggerFunction(config, 0),
    warn: createLoggerFunction(config, 1),
    success: createLoggerFunction(config, 2),
    log: createLoggerFunction(config, 3),
    debug: createLoggerFunction(config, 4),
});
// endregion Logger

// region Debug filter
// TODO: Make it fully compatible with `debug`.
const debugFilter = (level, namespace) => {
    if (level > Number(process.env.DEBUG_LEVEL || 0)) return false;

    const enabled = [];
    const disabled = [];

    (process.env.DEBUG || '').split(',').forEach(x => {
        x = x
            .trim()
            .replace(/:\*$/g, ':?*')
            .replace(/\*/g, '.*');

        if (x[0] == '-') disabled.push(x.slice(1));
        else enabled.push(x);
    });

    if (RegExp(`^(?:${disabled.join('|')})$`).test(namespace)) return false;

    return RegExp(`^(?:${enabled.join('|')})$`).test(namespace);
};

module.exports.DebugFilter = () => debugFilter;
// endregion Debug filter

// region Browser transport
const defaultEmoji = ['🖕', '🤦‍♀️', '🤟', 'ℹ️', '🤔'];

module.exports.BrowserTransport = (config = {}) => record => {
    if (typeof window != 'object' || typeof document != 'object' || document.nodeType != 9) return;

    const { level, namespace, payload } = record;

    let { background = '#242424', font = 'unset', symbols = defaultEmoji, filter = defaultFilter } = config;

    //            1 2 3
    let format = '%c%s%c ';

    const params = [
        // 1
        `font-family: ${font};
        background: ${(background = typeof background == 'string' ? background : background[level])};
        color: #fff`,
        // 2
        symbols[level],
        // 3
        ``, // ← reset style
    ];

    namespace.forEach(({ name, diff }, i) => {
        if (!filter(name, namespace, i)) return;

        //         1  2  3
        format += '%c%c %s ';

        params.push(
            // 1
            `color: ${background};
            background: ${(background = hsl(hash(name), 100, 40))};
            text-shadow: 1px 0 0 #fff, 0 1px 0 #fff, 0 -1px 0 #fff`,
            // 2
            `color: #fff;
            background: ${background}`,
            // 3
            name,
        );

        const next = namespace[i + 1];

        if (diff && (!next || next.diff != diff)) {
            format += '+%s ';
            params.push(ms(diff));
        }
    });

    format += '%c%c';
    params.push(`color:${background}`, ``);

    console.log(typeof payload[0] == 'string' ? format + ' ' + payload.shift() : format, ...params, ...payload);
};
// endregion Browser transport

// region Node transport
const defaultSymbols = [' e', ' w', ' s', ' i', ' d'];
const defaultColors = ['#e72600', '#a76900', '#008a38', '#0076e1', '#000'];

const hex = (h, s, l, a) => {
    return `#${hsl(h, s, l, a)
        .replace(/rgba\(|\)/g, '')
        .split(',')
        .map(x => {
            return Number(x)
                .toString(16)
                .padStart(2, '0');
        })
        .join('')}`;
};

module.exports.NodeTransport = (config = {}) => record => {
    if (typeof process != 'object' || !process.versions || !process.versions.node) return;

    const { level, namespace, payload, time } = record;

    let { background = defaultColors, symbols = defaultSymbols, filter = defaultFilter, timestamps } = config;

    let format = '';

    if (timestamps) {
        format += chalk.hex('#fff').bgHex('#000')(' ' + new Date(time).toISOString().replace(/^.*T|Z.*$/g, '') + ' ');

        format += chalk
            .hex('#000')
            .bgHex((background = typeof background == 'string' ? background : background[level]))('');
    }

    format += chalk
        .hex('#fff')
        .bgHex((background = typeof background == 'string' ? background : background[level]))
        .bold(symbols[level] + ' ');

    namespace.forEach(({ name, diff }, i) => {
        if (!filter(name, namespace, i)) return;

        format += chalk.hex(background).bgHex((background = hex(hash(name), 100, 40)))('');
        format += chalk.hex('#fff').bgHex(background)(' ' + name + ' ');

        const next = namespace[i + 1];

        if (diff && (!next || next.diff != diff)) {
            format += chalk
                .hex('#fff')
                .bgHex(background)
                .italic('+' + ms(diff) + ' ');
        }
    });

    format += chalk.hex(background)('');

    console.log(typeof payload[0] == 'string' ? format + ' ' + payload.shift() : format, ...payload);
};
// endregion Node transport
