import "!style-loader!css-loader?modules=false!./index.css";

import * as React from "react";
import * as ReactDOM from "react-dom";

import { initializeBasisFile } from "./basis_file";
import { BasisImage } from "./components/BasisImage";

async function main(): Promise<void> {
  const container = document.createElement("div");
  document.body.appendChild(container);

  await initializeBasisFile();

  ReactDOM.render(
    <React.Fragment>
      <h1>Hello Basis Universal</h1>
      <h2>Lena</h2>
      <BasisImage src="./assets/lena.basis" />
      <h2>Sushi</h2>
      <BasisImage src="./assets/Sushi_1024x1024.basis" />
      <h2>Garden</h2>
      <BasisImage src="./assets/Garden_1024x1024.basis" />
    </React.Fragment>,
    container);
}

main();
