# @ripreact/logger

> An opinionated logger for browser devtools.

Features:

-   Configurable transports.
-   `debug`-like namespaces.
-   Logging with tags.
-   Expressive severity levels.
-   Convenient template-based API.
-   Flexible and powerful filtering.
-   Time differences for segments of namespace and tags.

Devtools transport features:

-   Powerline formatting.
-   Emoji code.

![Screenshot](https://raw.githubusercontent.com/ripreact/logger/master/Screenshot.png)

## API

For advanced API docs see `src/index.ts` (after `Internals` region).

### `Logger`

Creates new logger instance. _Must be used **without** `new` keyword_.

#### Severity levels

1. `apocalypse` — App owner should be alerted immediately. Emoji: Fuck!
2. `fatal` — App owner should be notified the next morning. Emoji: Rage.
3. `crash` — App owner may be notified depending on circumstances. Emoji: Angry.
4. `error` — App can recover on its own. Emoji: Shit.
5. `warning` — Nothing critical. Emoji: Shrug.
6. `ok` — Something good happened. Emoji: Ok.
7. `log` — Regular message in development. Emoji: Writing.
8. `debug` — Helps you to locate errors. Emoji: Paw.
9. `flood` — Use it to flood your console. Emoji: Eyes.

#### Namespace and tags

```
Marker  = _ (Segment (_ ':'+ _ Segment)*)? (_ '+'+ _ (Tag (_ ','+ _ Tag)*)?)? _

Segment = /[^:+,]/
Tag     = /[^:+,]/
_       = /\s*/
```

Message marker may include namespace and tags. Namespace includes names
separated by `:`; tags include names separated by `,`; `+` separates namespace
and tags parts. Both segment and tag names may be surrounded by spaces; empty
names will be ignored. You cannot use `:`, `+`, `,` in names.

#### Substitutions

`@ripreact/logger` doesn’t provide string formatting support by default; you may
use transport, which supports it (e.g. devtools transport).

#### Usage

```javascript
const logger = Logger({
    /**
     * Array of plugins.
     */
    plugins: [LevelFilter({ level: 'flood' }), DevtoolsTransport()],
});

// Levels:
logger.apocalypse`foo:bar`('App owner should be alerted immediately.');
logger.disaster`foo:bar`('App owner should be notified the next morning.');
logger.crash`foo:bar`('App owner may be notified depending on circumstances.');
logger.error`foo:bar`('App can recover on its own.');
logger.warning`foo:bar`('Nothing critical.');
logger.ok`foo:bar`('Something good happened.');
logger.log`foo:bar`('Regular message in development.');
logger.trace`foo:bar`('Helps you to locate errors.');
logger.flood`foo:bar`('Use it to flood your console.');

// Namespace and tags:
logger.log`company:product:package:class:method +tag1, tag2`('Foo bar.');
```

### `DevtoolsTransport`

```javascript
const logger = Logger({
    plugins: [
        DevtoolsTransport({
            /**
             * Transport-specific message preprocessor.
             */
            preprocessor: message => message,

            /**
             * Transport-specific filter. Applied before preprocessor.
             */
            filterMessages: () => true,

            /**
             * Segments filter; allows to hide specific segments (e.g company
             * name prefix).
             */
            filterSegments: ({ name }, index) => name != 'cyka' || index > 0,

            /**
             * Tags filter; allows to hide specific tags.
             */
            filterTags: ({ name }) => !/^user=\d+/.test(name),
        }),
    ],
});
```

### `LevelFilter`

Filters messages by severity level.

```javascript
const logger = Logger({
    plugins: [
        LevelFilter({
            /**
             * Most verbose allowed level. Defaults to `'warning'`.
             */
            level: 'debug',
        }),
    ],
});
```

### `PrefixPreprocessor`

Prepends specific prefix (e.g. company/product/package name) to each namespace.

```javascript
const logger = Logger({
    plugins: [
        PrefixPreprocessor({
            prefix: ['cyka', 'blyat'],
        }),
    ],
});
```

### `getMarker`

Returns message marker string (normalized namespace and normalized deduped
sorted tags).

```javascript
const logger = Logger({
    plugins: [
        {
            preprocessor(message) {
                console.log(getMarker(message)); // ¯\_(ツ)_/¯
            },
        },
    ],
});

logger.log` : : a : : b : : + + , , c , , d , ,  +d, e`(); // `a:b +c,d`
```

### `logger`

Default instance of logger. Provides default level filter and default transport.

## Roadmap

-   [ ] NodeJS console transport.
-   [ ] HTTP transport.
-   [ ] File transport.
-   [ ] WebSocket transport.
-   [ ] journald transport.
-   [ ] Event Log transport.
-   [ ] Stack traces.
-   [ ] High resolution time.
-   [ ] `debug` compatibility layer.
-   [ ] Gotta Go Fast.
