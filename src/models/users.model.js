import mongoose from "mongoose";
import bcrypt from "bcrypt"

const userSchema = new mongoose.Schema(
   {
      username: {
         type: string,
         required: true,
         lowercase: true,
         trim:true,
         index:true,
         unique: true,
      },
      fullName: {
         type: string,
         required: true,
         lowercase:true,
         index:true
      },
      email: {
         type: string,
         required: true,
         lowercase: true,
         unique: true,
         trim:true
      },
      avtar:{
         type:strig,
         required:true
      },
      converImage:{
         type:string
      },
      watchHistory:[{
         type:mongoose.Schema.Types.ObjectId,
         ref:"Videos"
      }],
      password:{
         type:string,
         required:[true,"password is Required"]
      },
      refreshToken:{
         type:string
      }

   },
   {
      timestamps: true,
   }
);



userSchema.methods.isPasswordCorrect = async function(password){
   return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = function(){
   return jwt.sign(
       {
           _id: this._id,
           email: this.email,
           username: this.username,
           fullName: this.fullName
       },
       process.env.ACCESS_TOKEN_SECRET,
       {
           expiresIn: process.env.ACCESS_TOKEN_EXPIRY
       }
   )
}
userSchema.methods.generateRefreshToken = function(){
   return jwt.sign(
       {
           _id: this._id,
           
       },
       process.env.REFRESH_TOKEN_SECRET,
       {
           expiresIn: process.env.REFRESH_TOKEN_EXPIRY
       }
   )
}


export const user = mongoose.model("User", userSchema);
