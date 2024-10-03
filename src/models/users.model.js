import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
   {
      username: {
         type: string,
         required: true,
         lowercase: true,
         unique: true,
      },
      fullName: {
         type: string,
         required: true,
      },
      email: {
         type: string,
         required: true,
         lowercase: true,
         unique: true,
      },
   },
   {
      timestamps: true,
   }
);

export const user = mongoose.model("User", userSchema);
