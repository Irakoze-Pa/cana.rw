import type {
  ReactNode
} from "react";


import {
  AuthProvider
} from "@/context/authContext";
import { ToastProvider } from "@/context/toastContext";



function Providers({

children

}:{

children:ReactNode;

}){


return (

<AuthProvider>
<ToastProvider>{children}</ToastProvider>
</AuthProvider>

);


}



export default Providers;
