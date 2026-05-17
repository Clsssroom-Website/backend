// 2. Các lớp thực thi giao diện (Concrete Products)
export class ConsoleLogger {
    info(message, meta) {
        console.log(`[INFO] ${new Date().toISOString()} - ${message}`, meta || '');
    }
    warn(message, meta) {
        console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, meta || '');
    }
    error(message, meta) {
        console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, meta || '');
    }
    debug(message, meta) {
        console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, meta || '');
    }
}
// 3. Lớp Creator (Factory)
export class LoggerFactory {
    getLogger() {
        return this.createLogger();
    }
}
// 4. Các lớp Concrete Creators
export class ConsoleLoggerFactory extends LoggerFactory {
    createLogger() {
        return new ConsoleLogger();
    }
}
// Khởi tạo instance logger duy nhất để sử dụng ở các nơi khác
const factory = new ConsoleLoggerFactory();
export const logger = factory.getLogger();
