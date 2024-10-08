import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema({

    
}, { timestamps: true });

export const subscription = mongoose.model("subscription", subscriptionSchema);
