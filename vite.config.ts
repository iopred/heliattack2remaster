/** @type {import('vite').UserConfig} */
const MAC = {
    base: '/game',
    devServer: {
        port: 3264,
    },
};

/** @type {import('vite').UserConfig} */
const PC = {
    base: '/game',
    outDir: '/game',
    devServer: {
        port: 3264,
    },
}

export default PC;