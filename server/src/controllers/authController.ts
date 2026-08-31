import { Request, Response } from "express";
import authService from "../services/authService";
import { loginSchema, registerSchema } from "../utils/validations/auth-validation";


class AuthController {


  async register(
    req: Request,
    res: Response
  ) {

    try {

      console.log(
        "REGISTER BODY:",
        req.body
      );


      const input = registerSchema.parse(req.body);
      const result = await authService.register(input);



      const {
        password,
        ...safeUser
      } = result.user.toObject();



      return res.status(201).json({

        success:true,

        message:
          "Account created successfully",

        data:{

          user:safeUser,

          token:result.token,

        },

      });



    } catch(error:any) {


      console.error(
        "REGISTER ERROR:",
        error.message
      );


      return res.status(400).json({

        success:false,

        message:error.message,

      });


    }

  }






  async login(
    req: Request,
    res: Response
  ) {


    try {


      const input = loginSchema.parse(req.body);
      const result = await authService.login(input);




      const {

        password,

        ...safeUser

      } = result.user.toObject();





      return res.status(200).json({

        success:true,

        message:
          "Login successful",

        data:{

          user:safeUser,

          token:result.token,

        },

      });



    } catch(error:any) {



      console.error(
        "LOGIN ERROR:",
        error.message
      );



      return res.status(401).json({

        success:false,

        message:error.message,

      });


    }

  }


}



export default new AuthController();
