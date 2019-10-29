import { hsl } from '@ripreact/hsl';
import hash from 'string-hash';

// region Internals
const s = 1000;
const m = s * 60;
const h = m * 60;
const d = h * 24;
const colors = {} as Record<string, string>;
const { compare } = new Intl.Collator('en-us', { numeric: true, sensitivity: 'base' });
const { round } = Math;

const ms = (ms: number) => {
    const abs = Math.abs(ms);

    if (abs >= d) return round(ms / d) + 'd';
    if (abs >= h) return round(ms / h) + 'h';
    if (abs >= m) return round(ms / m) + 'm';
    if (abs >= s) return round(ms / s) + 's';

    return ms + 'ms';
};

const cached = (id: string, l: number) => colors[id] || (colors[id] = hsl(hash(id), 100, l));
const yes = () => true;
const identity = <a>(a: a) => a;
const noop = () => {};
const stringToSegment = (id = '') => (name: string): Segment => ({ name, id: id += ':' + name, diff: 0 });
const stringToTag = (name: string): Tag => ({ name, id: '+' + name, diff: 0 });
const getName = ({ name }: Tag | Segment) => name;

const addDiff = (time: number, timings: Timings) => ({ name, id }: Tag | Segment): Tag | Segment => {
    const diff = time - (timings[id] || (timings[id] = time));

    timings[id] = time;

    return { name, id, diff };
};

const filter = (plugins: readonly Plugin[], message: Message) => {
    for (const { filter = yes } of plugins) if (!filter(message)) return false;

    return true;
};

const createLoggerFunction = (config: Config, timings: Timings, level: number) => {
    const { plugins = [] } = config;

    return (ss: TemplateStringsArray, ...xs: readonly unknown[]) => {
        // Reduce template literal arguments to string ↓
        const raw = xs.reduce((ns, x, i) => ns + ss[i] + String(x), '') + ss[ss.length - 1];

        // Prepare namespace and tags ↓
        const [head, tail = ''] = raw.trim().split(/\s*\++\s*/);
        const namespace = head
            .split(/\s*:+\s*/)
            .filter(Boolean)
            .map(stringToSegment());
        const tags = [...new Set(tail.split(/\s*,+\s*/))]
            .filter(Boolean)
            .sort(compare)
            .map(stringToTag);

        return (...payload: readonly unknown[]) => {
            const time = Date.now();

            let message = plugins.reduce((message, { preprocessor = identity }) => preprocessor(message) || message, {
                time,
                level,
                payload,
                namespace,
                tags,
            } as Message);

            message = {
                ...message,
                namespace: message.namespace.map(addDiff(time, timings)),
                tags: message.tags.map(addDiff(time, timings)),
            };

            if (filter(plugins, message)) plugins.forEach(({ transport = noop }) => transport(message));
        };
    };
};

const emoji = [
    '', //                                  0 Empty
    '\u{1F92C}', //                         1 Fuck!
    '\u{1F621}', //                         2 Rage
    '\u{1F620}', //                         3 Angry
    '\u{1F4A9}', //                         4 Shit
    '\u{1F937}\u{200D}\u{2640}\u{FE0F}', // 5 Shrug
    '\u{1F44C}', //                         6 Ok
    '\u{270D}\u{FE0F}', //                  7 Writing
    '\u{1F43E}', //                         8 Paw
    '\u{1F440}', //                         9 Eyes
];

const font = `font-family:'Fira Code',Twemoji,monospace,system-ui;`;
const head = font + `background:#242424;color:#fff;`;
const tag = head + `font-weight:700;color:`;
const powerline = head + `text-shadow:1px 0 0 #fff,0 1px 0 #fff,0 -1px 0 #fff;color:`;
const segment = head + `color:#fff;background:`;
const timing = `;font-style:italic;color:#fff;font-weight:100`;

const levels: { readonly [k in keyof Logger]: number } = {
    apocalypse: 1,
    disaster: 2,
    crash: 3,
    error: 4,
    warning: 5,
    ok: 6,
    log: 7,
    trace: 8,
    flood: 9,
};
// endregion Internals

// region Types
export type Level = 'apocalypse' | 'disaster' | 'crash' | 'error' | 'warning' | 'ok' | 'log' | 'trace' | 'flood';

/**
 * Logger type.
 */
export type Logger = {
    readonly [l in Level]: (ss: TemplateStringsArray, ...xs: readonly unknown[]) => (...xs: readonly unknown[]) => void;
};

/**
 * Logger message.
 */
export interface Message {
    /**
     * Message timestamp in milliseconds.
     */
    readonly time: number;

    /**
     * Message severity level.
     *
     * 1. `apocalypse` — App owner should be alerted immediately.
     * 2. `disaster` — App owner should be notified the next morning.
     * 3. `crash` — App owner may be notified depending on circumstances.
     * 4. `error` — App can recover on its own.
     * 5. `warning` — Nothing critical.
     * 6. `ok` — Something good happened.
     * 7. `log` — Regular message in development.
     * 8. `trace` — Helps you to locate errors.
     * 9. `flood` — Use it to flood your console.
     */
    readonly level: number;

    /**
     * Message namespace.
     */
    readonly namespace: Namespace;

    /**
     * Message tags array.
     */
    readonly tags: Tags;

    /**
     * Message data.
     */
    readonly payload: readonly unknown[];
}

/**
 * Namespace type.
 */
export type Namespace = readonly Segment[];

/**
 * Namespace segment type.
 */
export interface Segment {
    /**
     * Segment identifier (used internally).
     */
    readonly id: string;

    /**
     * Segment name.
     */
    readonly name: string;

    /**
     * Milliseconds since last message with same prefix.
     */
    readonly diff: number;
}

/**
 * Tags type.
 */
export type Tags = readonly Tag[];

/**
 * Message tag type.
 */
export interface Tag {
    /**
     * Tag identifier (used internally).
     */
    readonly id: string;

    /**
     * Tag name.
     */
    readonly name: string;

    /**
     * Milliseconds since last message with same tag.
     */
    readonly diff: number;
}

/**
 * Logger plugin.
 */
export interface Plugin {
    /**
     * Filters messages before applying other plugins.
     */
    readonly filter?: (message: Message) => boolean;

    /**
     * Preprocesses messages before calculating diffs and passing to transports.
     */
    readonly preprocessor?: (message: Message) => Message | null | undefined | void;

    /**
     * Transport function provided by plugin.
     */
    readonly transport?: (message: Message) => unknown;
}

/**
 * Logger constructor options.
 */
export interface Config {
    /**
     * Array of plugins.
     */
    readonly plugins: readonly Plugin[];
}

/**
 * Timings state type.
 */
export type Timings = Record<string, number>;
// endregion Types

// region Devtools transport
/**
 * Devtools transport options object.
 */
export interface DevtoolsTransportConfig {
    /**
     * Transport-specific preprocessor function.
     */
    readonly preprocessor?: (message: Message) => Message;

    /**
     * Transport-specific messages filtering function. Applied **before**
     * `preprocess` function.
     */
    readonly filterMessages?: (message: Message) => unknown;

    /**
     * Segments filtering function. Allows to hide some segments; e.g., company
     * name prefix.
     */
    readonly filterSegments?: (segment: Segment, index: number, namespace: Namespace) => unknown;

    /**
     * Tags filtering function. Allows to hide some tags; e.g. user ID tags.
     */
    readonly filterTags?: (tag: Tag, index: number, tags: Tags) => unknown;
}

/**
 * Creates devtools transport instance.
 *
 * > **NB:** Must be called **without** `new`.
 *
 * @param config Optional configuration object.
 */
export const DevtoolsTransport = (config = {} as DevtoolsTransportConfig): Plugin => {
    const { preprocessor = identity, filterMessages = yes, filterSegments = yes, filterTags = yes } = config;

    return {
        transport: message => {
            if (typeof window != 'object' || typeof document != 'object' || document.nodeType != 9) return;
            if (!filterMessages(message)) return;

            message = preprocessor(message);

            const { level, tags, namespace, payload } = message;

            let format = '%c%s ';
            let params = [head, emoji[level]] as unknown[];
            let bg = '#242424';
            let next: Tag | Segment;
            let fullTagCss: string;
            let fullSegmentCss: string;

            if (tags.length) {
                tags.forEach((x, i, { length }) => {
                    if (!filterTags(x, i, tags)) return;

                    const { id, name, diff } = x;

                    format += '%c%s';
                    params.push((fullTagCss = tag + cached(id, 50)), name);

                    next = tags[i + 1] || namespace[0];

                    if (diff && (!next || next.diff != diff)) {
                        format += ' %c+%s%c';
                        params.push(fullTagCss + timing, ms(diff), fullTagCss);
                    }

                    format += '%c';
                    params.push(head);

                    format += i < length - 1 ? ', ' : ' ';
                });
            }

            namespace.forEach((x, i) => {
                if (!filterSegments(x, i, tags)) return;

                const { id, name, diff } = x;

                format += '%c\u{E0B0}%c %s ';
                params.push(
                    powerline + bg + `;background:` + (bg = cached(id, 40)),
                    (fullSegmentCss = segment + bg),
                    name,
                );

                next = namespace[i + 1];

                if (diff && (!next || next.diff != diff)) {
                    format += '%c+%s%c ';
                    params.push(fullSegmentCss + timing, ms(diff), fullSegmentCss);
                }
            });

            format += '%c\u{E0B0}%c';
            params.push(`color:` + bg, ``);

            console.log(
                typeof payload[0] == 'string' ? format + ' ' + (payload as unknown[]).shift() : format,
                ...params,
                ...payload,
            );
        },
    };
};
// endregion Devtools transport

// region Level filter
/**
 * Level filter options object.
 */
export interface LevelFilterConfig {
    /**
     * Most verbose allowed level. Defaults to `'warning'`.
     */
    readonly level?: Level;
}

/**
 * Creates new level filter instance. Allows to filter messages by severity
 * level.
 *
 * > **NB:** Must be called **without** `new`.
 *
 * @param config Optional configuration object.
 */
export const LevelFilter = (config = {} as LevelFilterConfig): Plugin => ({
    filter: message => message.level <= levels[config.level || 'warning'],
});
// endregion Level filter

// region Prefix preprocessor
export interface PrefixPreprocessorConfig {
    /**
     * Array of segment names to prepend to namespace. Defaults to `[]`.
     */
    readonly prefix?: readonly string[];
}

/**
 * Creates prefix preprocessor instance. Allows to add specific prefix to each
 * message namespace.
 *
 * > **NB:** Must be called **without** `new`.
 *
 * @param config Optional configuration object.
 */
export const PrefixPreprocessor = (config = {} as PrefixPreprocessorConfig): Plugin => {
    const { prefix = [] } = config;

    return {
        preprocessor: ({ namespace, ...message }, added = prefix.map(stringToSegment())) => ({
            ...message,
            namespace: [...added, ...namespace.map(getName).map(stringToSegment(added[added.length - 1].id))],
        }),
    };
};
// endregion Prefix preprocessor

// region Logger
/**
 * Creates new logger instance.
 *
 * > **NB:** Must be called **without** `new`.
 *
 * @param config Logger config object.
 * @param timings Optional timings object. May be used to share timings info
 * between multiple instances and/or for reconfiguring existing logger.
 */
export const Logger = (config = {} as Config, timings = {} as Timings): Logger => ({
    apocalypse: createLoggerFunction(config, timings, 1),
    disaster: createLoggerFunction(config, timings, 2),
    crash: createLoggerFunction(config, timings, 3),
    error: createLoggerFunction(config, timings, 4),
    warning: createLoggerFunction(config, timings, 5),
    ok: createLoggerFunction(config, timings, 6),
    log: createLoggerFunction(config, timings, 7),
    trace: createLoggerFunction(config, timings, 8),
    flood: createLoggerFunction(config, timings, 9),
});

/**
 * Returns message marker string (normalized namespace and deduped sorted tags).
 *
 * @param message Target message.
 */
export const getMarker = (message: Message) => {
    const { namespace, tags } = message;

    return (namespace[namespace.length - 1].id + ' +' + tags.map(getName).join(', ')).trim().replace(/ \+$/, '');
};

export const logger = Logger({ plugins: [LevelFilter(), DevtoolsTransport()] });
// endregion Logger
