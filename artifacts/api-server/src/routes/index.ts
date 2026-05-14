import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import clientsRouter from "./clients.js";
import assetsRouter from "./assets.js";
import liabilitiesRouter from "./liabilities.js";
import dashboardRouter from "./dashboard.js";
import stocksRouter from "./stocks.js";
import familyMembersRouter from "./family-members.js";
import documentsRouter from "./documents.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(clientsRouter);
router.use(assetsRouter);
router.use(liabilitiesRouter);
router.use(dashboardRouter);
router.use(stocksRouter);
router.use(familyMembersRouter);
router.use("/documents", documentsRouter);

export default router;
