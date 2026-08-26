import {
  Navigate,
  Outlet
} from "react-router-dom";


import {
  useAuth
} from "@/context/authContext";



function AdminRoutes(){


const {
  user
}=useAuth();




if(!user){

return <Navigate to="/" replace />;

}




if(
 user.role !== "admin" &&
 user.role !== "staff"
){

return <Navigate to="/dashboard" replace />;

}




return <Outlet />;


}



export default AdminRoutes;