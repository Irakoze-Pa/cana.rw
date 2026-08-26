import type {
  ReactNode
} from "react";


import {
  AuthProvider
} from "@/context/authContext";



function Providers({

children

}:{

children:ReactNode;

}){


return (

<AuthProvider>

{children}

</AuthProvider>

);


}



export default Providers;