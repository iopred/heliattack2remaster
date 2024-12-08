// https://vitejs.dev/config/
module.exports = PROD;

const DEV = {
    base: '/game',
    outDir: '/game',
    devServer: {
        port: 3264,
    },
};

const PROD = {
    base: '/game',
    outDir: '/game',
    devServer: {
        port: 3264,
    },
}

module.exports = DEV;