const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

const options = {
  mode: process.env["NODE_ENV"] || "development",
  devtool: false,
  devServer: {
    contentBase: path.join(__dirname, "static")
  },
  entry: "./src/index.tsx",
  target: "web",
  output: {
    filename: "index.js",
    path: __dirname + "/dist"
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", "jsx"]
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        enforce: "pre",
        use: [
          {
            loader: "eslint-loader",
            options: {}
          }
        ]
      },
      {
        test: /\.tsx?$/,
        loader: "ts-loader"
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: "style-loader" // creates style nodes from JS strings
          },
          {
            loader: "css-loader", // translates CSS into CommonJS
            options: {
              sourceMap: process.env["NODE_ENV"] !== "production",
              modules: true
            }
          }
        ]
      }
    ]
  },

  plugins: [
    new HtmlWebpackPlugin({
      title: "Hello Basis",
      template: "template/index.ejs"
    })
  ]
};

if (options.mode !== "production") {
  options.devtool = "source-map";
  options.module.rules.push({
    enforce: "pre",
    test: /\.js$/,
    loader: "source-map-loader"
  });
}

module.exports = options;
