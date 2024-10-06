import { User } from "../models/users.model.js";
import { apiError } from "../utils/apiError.js";
import { apiRespone } from "../utils/apiRespone.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

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
         "Somethng went wrong while genrating refresh token "
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
   const { email, password, username } = req.body;

   if (!username || !email) {
      throw new apiError(400, "username or password is required");
   }

   const user = await User.findOne({ $or: [{ username }, { email }] });

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

   const loggedInUser = User.findById(user._id).select(
      "-password -refreshToken"
   );

   const options = {
      httpOnly: true,
      secure: true,
   };

   res.status(200)
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
            "user loged in succesfully"
         )
      );
});


const logoutUser = asyncHandler( async (req,res)=>{
   
})

export { registerUser, loginUser };
