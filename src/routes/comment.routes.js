import { Router } from "express";
import {
  addComment,
  deleteComment,
  getVideoComments,
  updateComment,
} from "../controllers/comment.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);
router.route("/add-comment/:videoId").post(addComment);

router.route("/:videoId").get(getVideoComments);
router.route("/delete-comment/:commentId").delete(deleteComment);
router.route("/update-comment/:commentId").patch(updateComment);

export default router;
