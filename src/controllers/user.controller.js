import jwt from "jsonwebtoken";
import { User } from "../models/users.model.js";
import { apiError } from "../utils/apiError.js";
import { apiRespone } from "../utils/apiRespone.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import mongoose from "mongoose";

const genrateAccessAndRefreshToken = async (userId) => {
   try {
      const user = await User.findById(userId);
      const accessToken = user.generateAccessToken();
      const refreshToken = user.generateRefreshToken();

      user.refreshToken = refreshToken;
      await user.save({ validateBeforeSave: false });

      return { accessToken, refreshToken };
   } catch (error) {
      throw new apiError(
         500,
         "Something went wrong while generating referesh and access token"
      );
   }
};

const registerUser = asyncHandler(async (req, res) => {
   const { fullName, email, username, password } = req.body;

   if (
      [fullName, email, username, password].some(
         (feild) => feild?.trim() === ""
      )
   ) {
      throw new apiError(400, "All Feilds are required");
   }

   const existedUser = await User.findOne({ $or: [{ username }, { email }] });
   if (existedUser) {
      throw new apiError(409, "User alardy exit");
   }

   const avatarLocalPath = req.files?.avatar[0]?.path;
   const coverImageLocalPath = req.files?.coverImage[0]?.path;

   if (!avatarLocalPath) {
      throw new apiError(400, "avatar file is required");
   }
   const avatar = await uploadOnCloudinary(avatarLocalPath);
   const coverImage = await uploadOnCloudinary(coverImageLocalPath);
   ``;
   if (!avatar) {
      throw new apiError(400, "avatar file is required");
   }

   const user = await User.create({
      fullName,
      avatar: avatar.url,
      coverImage: coverImage?.url || "",
      email,
      password,
      username: username.toLowerCase(),
   });

   const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
   );

   if (!createdUser) {
      throw new ApiError(
         500,
         "Something went wrong while registering the user"
      );
   }

   return res
      .status(201)
      .json(new apiRespone(200, createdUser, "User registered Successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
   const { email, username, password } = req.body;

   if (!(username || email)) {
      throw new apiError(400, "username or password is required");
   }
   const user = await User.findOne({
      $or: [{ username }, { email }],
   });

   if (!user) {
      throw new apiError(404, "User not found");
   }

   const isPasswordValid = await user.isPasswordCorrect(password);
   if (!isPasswordValid) {
      throw new apiError(401, "Incorect password or username");
   }

   const { refreshToken, accessToken } = await genrateAccessAndRefreshToken(
      user._id
   );

   const loggedInUser = await User.findById(user._id).select(
      "-password -refreshToken"
   );
   const options = {
      httpOnly: true,
      secure: true,
   };

   return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
         new apiRespone(
            200,
            {
               user: loggedInUser,
               accessToken,
               refreshToken,
            },
            "User logged In Successfully"
         )
      );
});

const logoutUser = asyncHandler(async (req, res) => {
   await User.findByIdAndUpdate(
      req.user._id,
      {
         $set: {
            refreshToken: undefined,
         },
      },
      {
         new: true,
      }
   );

   const options = {
      httpOnly: true,
      secure: true,
   };

   res.status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json(new apiRespone(200, {}, "User logged Out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
   const incomingRefreshToken =
      req.cookies.refreshToken || req.body.refreshToken;

   if (!incomingRefreshToken) {
      throw new apiError(401, "unauthorised request");
   }
   try {
      const decodedToken = jwt.verify(
         incomingRefreshToken,
         process.env.REFRESH_TOKEN_SECRET
      );

      const user = await User.findById(decodedToken?._id);

      if (!user) {
         throw new apiError(401, "Invalid refresh token");
      }

      if (incomingRefreshToken !== user?.refreshToken) {
         throw new apiError(401, "Refresh Token is expired");
      }

      const options = {
         httpOnly: true,
         secure: true,
      };

      const { accessToken, refreshToken } = await genrateAccessAndRefreshToken(
         user._id
      );

      return res
         .status(200)
         .cookie("accessToken", accessToken, options)
         .cookie("refreshToken", refreshToken, options)
         .json(
            new apiRespone(
               200,
               {
                  accessToken,
                  refreshToken: refreshToken,
               },
               "Access Token refreshed"
            )
         );
   } catch (error) {
      throw new apiError(401, error.message || "Invaild refresh Token");
   }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
   const { oldPassword, newPassword, repeatnewPassword } = req.body;

   const user = await User.findById(req.user?._id);
   const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

   if (!(newPassword === repeatnewPassword)) {
      throw new apiError(404, "Invalid New Password");
   }

   if (!isPasswordCorrect) {
      throw new apiError(404, "Invalid Password");
   }

   if (oldPassword === newPassword) {
      throw new apiError(404, "New Password is same");
   }

   user.password = newPassword;
   await user.save({ validateBeforeSave: false });

   return res
      .status(200)
      .json(new apiRespone(200, {}, "Password changed succesfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
   return res
      .status(200)
      .json(200, new apiRespone(200, req.user, "current user fetched"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
   const { fullName, email } = req.body;
   console.log(fullName, email);
   if (!(fullName || email)) {
      throw new apiError(400, "all feild are required");
   }

   const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
         $set: {
            fullName,
            email: email,
         },
      },
      { new: true }
   ).select("-password");

   return res.status(200).json(new apiRespone(200, user, "Account updated"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
   const avatarLocalPath = req.file?.path;

   if (!avatarLocalPath) {
      throw new apiError(400, "Avatar file is missing");
   }

   const avatar = await uploadOnCloudinary(avatarLocalPath);
   if (!avatar.url) {
      throw new apiError(400, "Error while uploading");
   }
   const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
         $set: {
            avatar: avatar.url,
         },
      },
      {
         new: true,
      }
   ).select("-password");
   return res.status(200).json(new apiRespone(200, user, "coverImage updated"));
});

const updateUsercoverImage = asyncHandler(async (req, res) => {
   const coverImageLocalPath = req.file?.path;

   if (!coverImageLocalPath) {
      throw new apiError(400, "cover Image file is missing");
   }

   const coverImage = await uploadOnCloudinary(coverImageLocalPath);
   if (!coverImage.url) {
      throw new apiError(400, "Error while uploading");
   }
   const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
         $set: {
            coverImage: coverImage.url,
         },
      },
      {
         new: true,
      }
   ).select("-password");
   return res.status(200).json(new apiRespone(200, user, "coverImage updated"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
   const { username } = req.params;

   if (!username?.trim()) {
      throw new apiError(400, "username is missing");
   }

   const channel = await User.aggregate([
      {
         $match: {
            username: username?.toLowerCase(),
         },
      },
      {
         $lookup: {
            from: "subscription",
            localField: "_id",
            foreignField: "channel",
            as: "subscribers",
         },
      },
      {
         $lookup: {
            from: "subscription",
            localField: "_id",
            foreignField: "subscriber",
            as: "subscribedTo",
         },
      },
      {
         $addFields: {
            subscribersCount: {
               $size: "$subscribers",
            },
            channelsSbuscribedToCount: {
               $size: "$subscribedTo",
            },
            isSubscribed: {
               $cond: {
                  if: { $in: [req.user?._id, "subscribers.subscriber"] },
                  then: true,
                  else: false,
               },
            },
         },
      },
      {
         $project: {
            fullName: 1,
            username: 1,
            subscribersCount: 1,
            channelsSbuscribedToCount: 1,
            isSubscribed: 1,
            avatar: 1,
            coverImage: 1,
            email: 1,
         },
      },
   ]);

   if (!channel?.length) {
      throw new apiError(404, "channel does not exit");
   }

   return res
      .status(200)
      .json(
         new apiRespone(200, channel[0], "user Channel fetched succesfully")
      );
});

const getWatchHistory = asyncHandler(async (req, res) => {
   const user = await User.aggregate([
      {
         $match: {
            _id: new mongoose.Types.ObjectId(req.user._id),
         },
      },
      {
         $lookup: {
            from: "Video",
            localField: "watchHistory",
            foreignField: "_id",
            as: "watchHistory",
            pipeline: [
               {
                  $lookup: {
                     from: "User",
                     localField: "owner",
                     foreignField: "_id",
                     as: "owner",
                     pipeline:[
                        {
                           $project:{
                              fullName:1,
                              username:1,
                              avatar:1
                           }
                        }
                     ]
                  },
               },
               {
                  $addFields:{
                     owner:{
                        $first:"$owner"
                     }
                  }
               }
            ],
         },
      },
   ]);

return res.status(200).json(new apiRespone(200,user[0].watchHistory,"wtch history fetched suscefully"))


});

export {
   registerUser,
   loginUser,
   logoutUser,
   refreshAccessToken,
   changeCurrentPassword,
   getCurrentUser,
   updateAccountDetails,
   updateUserAvatar,
   updateUsercoverImage,
   getUserChannelProfile,
   getWatchHistory
};
