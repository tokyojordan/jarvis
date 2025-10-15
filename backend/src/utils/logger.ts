export class Logger {
  static info(message: string, ...args: any[]) {
    console.log(`ℹ️  ${message}`, ...args);
  }

  static error(message: string, error?: any) {
    console.error(`❌ ${message}`, error);
  }

  static warn(message: string, ...args: any[]) {
    console.warn(`⚠️  ${message}`, ...args);
  }

  static success(message: string, ...args: any[]) {
    console.log(`✅ ${message}`, ...args);
  }

  static debug(message: string, ...args: any[]) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`🐛 ${message}`, ...args);
    }
  }
}