import packageJson from '../../package.json';

export const APP_NAME = 'Workforce Planning';
export const APP_VERSION = packageJson.version;
export const BUILD_TIME = process.env.NEXT_PUBLIC_BUILD_TIME ?? '';
export const GIT_COMMIT = process.env.NEXT_PUBLIC_GIT_COMMIT ?? '';
