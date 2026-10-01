import type {
  ReactNode
} from "react";


import {
  AuthProvider
} from "@/context/authContext";
import { ToastProvider } from "@/context/toastContext";
import { ConfirmationProvider } from "@/context/confirmationContext";



function Providers({

children

}:{

children:ReactNode;

}){


return (

<AuthProvider>
<ToastProvider><ConfirmationProvider>{children}</ConfirmationProvider></ToastProvider>
</AuthProvider>

);


}



export default Providers;
