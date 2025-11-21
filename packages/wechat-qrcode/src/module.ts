export const createOpencvModule = () => {
  const opencvModule = {
    preRun: [],
    postRun: [],
    onRuntimeInitialized() {
    },
    print() {
      // console.log(text);
    },
    printErr() {
      // console.error(text);
    },
    setStatus() {
      // console.log(text);
    },
    totalDependencies: 0,
  };
  return opencvModule;
};
