export const createOpencvModule = () => {
  let opencvModule = {
    preRun: [],
    postRun: [] ,
    onRuntimeInitialized: function() {
    },
    print: (function() {
      return function(text: string) {
        // console.log(text);
      };
    })(),
    printErr: function(text: string) {
      // console.error(text);
    },
    setStatus: function(text: string) {
      // console.log(text);
    },
    totalDependencies: 0
  };
  return opencvModule
}