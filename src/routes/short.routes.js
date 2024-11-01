import { Router } from "express";
import {
  deleteShort,
  getAllShorts,
  getShortById,
  publishAShort,
  togglePublishStatus,
  updateShort,
} from "../controllers/short.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();
router.use(verifyJWT);

router.route("/").get(getAllShorts);

router.route("/publish-Short").post(
  upload.fields([
    {
      name: "ShortFile",
      maxCount: 1,
    },
    {
      name: "thumbnail",
      maxCount: 1,
    },
  ]),
  publishAShort
);

router.route("/:ShortId").get(getShortById);
router
  .route("/update-Short/:ShortId")
  .patch(upload.single("thumbnail"), updateShort);

router.route("/delete-Short/:ShortId").delete(deleteShort);

router.route("/toggle/publish/:ShortId").patch(togglePublishStatus);

export default router;
