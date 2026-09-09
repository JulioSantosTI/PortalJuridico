import express from "express";
import cors from "cors";
import { authRouter } from "./modules/auth/auth.routes";
import { usersRouter } from "./modules/users/users.routes";
import { requestTypesRouter } from "./modules/requestTypes/requestTypes.routes";
import { requestsRouter } from "./modules/requests/requests.routes";
import { interactionsRouter } from "./modules/interactions/interactions.routes";
import { uploadsRouter } from "./modules/uploads/uploads.routes";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes";
import { calendarRouter } from "./modules/calendar/calendar.routes";
import { accessRequestsRouter } from "./modules/accessRequests/accessRequests.routes";
import { adminRouter } from "./modules/admin/admin.routes";
import { internalTicketsRouter } from "./modules/internalTickets/internalTickets.routes";
import { errorHandler } from "./middleware/error.middleware";

export const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") ?? "*" }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/request-types", requestTypesRouter);
app.use("/api/requests", requestsRouter);
app.use("/api/requests", interactionsRouter);
app.use("/api/uploads", uploadsRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/calendar", calendarRouter);
app.use("/api/access-requests", accessRequestsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/internal-tickets", internalTicketsRouter);

app.use(errorHandler);
