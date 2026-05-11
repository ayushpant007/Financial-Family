import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import clientsRouter from "./clients";
import assetsRouter from "./assets";
import liabilitiesRouter from "./liabilities";
import dashboardRouter from "./dashboard";
import stocksRouter from "./stocks";
import familyMembersRouter from "./family-members";
import documentsRouter from "./documents";

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
