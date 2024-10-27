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

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const comments = await Comment.find({ video: videoId })
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .populate("owner", "fullName username avatar")
    .sort({ createdAt: -1 })
    .populate("reply")
    .populate("owner", "fullName username avatar");

  const totalComments = await Comment.countDocuments({ video: videoId });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        comments,
        totalPages: Math.ceil(totalComments / limit),
        currentPage: parseInt(page),
      },
      "Comments fetched successfully"
    )
  );
});

const addComment = asyncHandler(async (req, res) => {
  // TODO: add a comment to a video
  const { videoId, commentId } = req.params;
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

  if (commentId) {
    const parentComment = await Comment.findById(commentId);
    if (!parentComment) {
      throw new ApiError(400, "Reply to comment not found");
    }

    parentComment.reply.push(comment._id);
    await parentComment.save();
  }

  return res
    .status(200)
    .json(new ApiResponse(200, comment, "comment added succesfully"));
});

const updateComment = asyncHandler(async (req, res) => {
  // TODO: update a comment
  const { commentId } = req.params;
  const { content } = req.body;

  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }

  if (!content) {
    throw new ApiError(400, "comment content required");
  }

  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new ApiError(400, "comment not found");
  }

  if (comment._id != req.user._id) {
    throw new ApiError(400, "Unauthorised request");
  }

  comment.content = content;
  comment.isUpdated = true;
  await comment.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, comment, "comment updated succesfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(400, "Comment not found");
  }

  if (comment.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(400, "Unauthorized request");
  }

  comment.isDeleted = true;
  comment.content = null;
  await comment.save({ validateBeforeSave: false });

  await Like.deleteMany({ comment: commentId });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Comment deleted successfully"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
