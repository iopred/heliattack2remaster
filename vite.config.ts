/** @type {import('vite').UserConfig} */
const DEV = {
    base: '/game',
    outDir: '/game',
    devServer: {
        port: 3264,
    },
};

/** @type {import('vite').UserConfig} */
const PROD = {
    base: '/game',
    outDir: '/game',
    devServer: {
        port: 3264,
    },
}

export default PROD;