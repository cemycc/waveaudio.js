import typescript from 'rollup-plugin-typescript';

export default {
    entry: 'src/main.ts',
    dest: 'dist/waveaudio.js',
    sourceMap: 'dist/waveaudio.js.map',
    format: 'umd',
    moduleName: 'waveaudiojs',
    plugins: [
        typescript()
    ]
}