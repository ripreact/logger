const { Logger, NodeTransport } = require('.');

const logger = Logger({
    filter: () => true,
    prefix: 'demo:',
    transports: [NodeTransport({ timestamps: true })],
});

const wait = n => new Promise(resolve => setTimeout(resolve, n));

(async () => {
    logger.log`foo:bar`('%o', 'This is error message.');
    await wait(10);

    logger.log`foo:bar`('%o', '`+Nms` is time since last `demo:foo:bar` message.');
    await wait(10);

    logger.log`foo:xyi`('%o', 'Time diff in this message shows time since last message with `demo:foo` prefix.');
    await wait(10);

    logger.log`foo:bar`('%o', 'Diffs in this message shown for both `demo:foo` and `demo:foo:bar`');
})();
