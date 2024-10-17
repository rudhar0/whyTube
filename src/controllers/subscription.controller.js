import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  // TODO: toggle subscription

  if (!mongoose.Types.ObjectId.isValid(channelId)) {
    throw new ApiError(400, "Invalid comment ID");
  }
  const channelIsExit = await Subscription.findOne({
    channel: channelId,
    subscriber: req.user._id,
  });

  if (!channelIsExit) {
    const creatingSubscribe = await Subscription.create({
      channel: channelId,
      subscriber: req.user._id,
    });

    if (!creatingSubscribe) {
      throw new ApiError(404, "channel subscribed succesfully");
    }

    return res.status(200).json(new ApiResponse(200, creatingSubscribe));
  }

  const deletingSubscribe = await Subscription.findOneAndDelete({
    channel: channelId,
    subscriber: req.user._id,
  });

  if (!deletingSubscribe) {
    throw new ApiError(404, "channel not unsubscribed");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "channel unsubscribed sucesfully"));
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(channelId)) {
    throw new ApiError(400, "Invalid channel ID");
  }

  const subscribers = await Subscription.find({ channel: channelId })
    .populate("subscriber", "fullName username email avatar")
    .exec();

  if (!subscribers.length) {
    throw new ApiError(404, "No subscribers found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, subscribers, "Subscribers fetched successfully")
    );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(subscriberId)) {
    throw new ApiError(400, "Invalid subscriberId ID");
  }

  const subscribingTo = await Subscription.find({ subscriber: subscriberId })
    .populate("channel", "fullName username email avatar")
    .exec();

  if (!subscribingTo.length) {
    throw new ApiError(404, "No subscribed channel found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, subscribingTo, "Subscribed channel fetched successfully")
    );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
