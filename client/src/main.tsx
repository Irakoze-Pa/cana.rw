
import React from "react";
import ReactDOM from "react-dom/client";

import Providers from "./app/providers";

import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "@fontsource/manrope/800.css";
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";


import {
  RouterProvider
} from "react-router-dom";


import router from "./app/router";


import "./index.css";


ReactDOM.createRoot(
  document.getElementById("root")!
)
.render(

<React.StrictMode>

<Providers>

<RouterProvider router={router}/>

</Providers>

</React.StrictMode>

);
