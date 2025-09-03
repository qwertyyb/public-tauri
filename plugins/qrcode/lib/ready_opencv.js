import prepareFs from './wechat_qrcode_files';

// 1. 准备Module
let opencvModule = {
  preRun: [],
  postRun: [],
  onRuntimeInitialized() {
    console.log('Emscripten runtime is ready, launching QUnit tests...');
    if (window.cv instanceof Promise) {
      window.cv.then((target) => {
        window.cv = target;
      });
    }
  },
  print: (function () {
    return function (text) {
      console.log(text);
    };
  }()),
  printErr(text) {
    console.error(text);
  },
  setStatus(text) {
    console.log(text);
  },
  totalDependencies: 0,
};

opencvModule.setStatus('Downloading...');

// 加载模型文件
opencvModule = prepareFs(opencvModule, `file://${resolve(__dirname, './wechat_qrcode_files.data')}`);

// 加载opencv wasm
const opencv = require('./opencv')(opencvModule);

module.exports = opencv;


