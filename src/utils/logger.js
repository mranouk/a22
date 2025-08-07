const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.prettyPrint()
);

// Create logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: 'telegram-marketplace-bot' },
    transports: [
        // Console transport for development
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple(),
                winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
                    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
                    return `${timestamp} [${service}] ${level}: ${message} ${metaStr}`;
                })
            )
        }),
        
        // File transport for all logs
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 10485760, // 10MB
            maxFiles: 5
        }),
        
        // File transport for combined logs
        new winston.transports.File({
            filename: path.join(logsDir, 'combined.log'),
            maxsize: 10485760, // 10MB
            maxFiles: 5
        })
    ]
});

// Add audit logging for sensitive operations
logger.audit = (action, userId, data = {}) => {
    logger.info('AUDIT', {
        action,
        userId,
        timestamp: new Date().toISOString(),
        data
    });
};

// Add error logging with context
logger.error = (message, error = {}, context = {}) => {
    logger.log('error', message, {
        error: {
            message: error.message,
            stack: error.stack,
            ...error
        },
        context
    });
};

module.exports = logger;
