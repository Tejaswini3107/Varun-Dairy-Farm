module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          root: ["."],
          alias: {
            "@": "./src",
            "@varun/shared": "../../packages/shared/src/index.ts",
          },
        },
      ],
    ],
  };
};
