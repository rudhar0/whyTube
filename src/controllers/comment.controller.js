import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Like } from "../models/like.model.js";

const getVideoComments = asyncHandler(async (req, res) => {
  //TODO: get all comments for a video
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;
});


const addComment = asyncHandler(async (req, res) => {
  // TODO: add a comment to a video
  const { videoId } = req.params;
  const { content } = req.body;

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  if (!content) {
    throw new ApiError(400, "comment content required");
  }

  const comment = await Comment.create({
    content,
    owner: req.user._id,
    video: videoId,
  });

  if (!comment) {
    throw new ApiError(400, "comment not added");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, comment, "comment added succesfully"));
});

const updateComment = asyncHandler(async (req, res) => {
  // TODO: update a comment
  const { videoId } = req.params;
  const { content } = req.body;

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  if (!content) {
    throw new ApiError(400, "comment content required");
  }

  const comment = await Comment.findOne({
    $and: [
      {
        owner: req.user._id,
      },
      {
        video: videoId,
      },
    ],
  });

  if (!comment) {
    throw new ApiError(400, "comment not found");
  }

  comment.content = content;
  await comment.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, comment, "comment updated succesfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
  // TODO: delete a comment

  const { videoId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const comment = await Comment.findOneAndDelete({
    $and: [
      {
        owner: req.user._id,
      },
      {
        video: videoId,
      },
    ],
  });

  if (!comment) {
    throw new ApiError(400, "comment not found");
  }
  await Like.deleteMany({ comment: comment._id });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "comment Deleted succesfully"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
