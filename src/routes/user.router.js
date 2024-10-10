import { Router } from "express";
import {
   loginUser,
   logoutUser,
   registerUser,
   refreshAccessToken,
   changeCurrentPassword,
   getCurrentUser,
   updateAccountDetails,
   updateUserAvatar,
   updateUsercoverImage
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const userRouter = Router();

//http://localhost:8000/api/v1/users/register

userRouter.route("/register").post(
   upload.fields([
      {
         name: "avatar",
         maxCount: 1,
      },
      {
         name: "coverImage",
         maxCount: 1,
      },
   ]),
   registerUser
);

userRouter.route("/login").post(loginUser);
userRouter.route("/logout").post(verifyJWT, logoutUser);
userRouter.route("/refresh-Token").post(refreshAccessToken);
userRouter.route("/change-password").post(verifyJWT, changeCurrentPassword);
userRouter.route("/user-Info").post(verifyJWT, getCurrentUser);
userRouter
   .route("/update-user-avatar")
   .post(upload.single("avatar"), verifyJWT, updateUserAvatar);
   userRouter
   .route("/update-user-coverImage")
   .post(upload.single("coverImage"), verifyJWT, updateUsercoverImage);
userRouter.route("/update-user-info").post(verifyJWT, updateAccountDetails);








export default userRouter;
