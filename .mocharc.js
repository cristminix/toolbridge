export default {
  "node-option": ["loader=esm"],

  spec: ["src/test/**/*.test.js"],

  reporter: "spec",

  timeout: 10000,

  color: true,

  exit: true,
};
