import {
  Navigate,
  Outlet
} from "react-router-dom";


import {
  useAuth
} from "@/context/authContext";



function ProtectedRoutes(){


const {
  user,
  token
}=useAuth();



if(!user || !token){

return (

<Navigate
to="/"
replace
/>

);

}



return <Outlet />;


}



export default ProtectedRoutes;