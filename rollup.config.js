import { uglify } from 'rollup-plugin-uglify';
import babel from 'rollup-plugin-babel';

module.exports = {
  input: 'src/fluidplayer.js',
  plugins: [babel(), uglify()],
  output: {
    file: 'dist/bundle.js',
    format: 'umd',
    name: 'fluidPlayer',
    sourcemap: true
  }
};
