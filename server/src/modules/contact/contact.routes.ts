import { Router } from "express";
import { createContactInquiry } from "./contact.controller";

const router = Router();

router.post("/", createContactInquiry);

export default router;
