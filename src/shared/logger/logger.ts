type LogType = 'warn' | 'error' | 'debug' | 'log';

const log = (logType: LogType, ...args: unknown[]) => {
    if (logType === 'debug') {
        console.debug(...args);
    } else if (logType === 'log') {
        console.log(...args);
    } else if (logType === 'warn') {
        console.warn(...args);
    } else if (logType === 'error') {
        console.error(...args);
    }
};

export const logger = {
    debug: (...args: unknown[]) => log('debug', ...args),
    log: (...args: unknown[]) => log('log', ...args),
    warn: (...args: unknown[]) => log('warn', ...args),
    error: (...args: unknown[]) => log('error', ...args),
};
