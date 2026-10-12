import express from "express";
import { userRoutes } from "../modules/user/user.route";
import { authRoute } from "../modules/auth/auth.routes";
import { messageRoute } from "../modules/message/message.routes";
import { jobRoutes } from "../modules/job/job.route";
import { workerRoutes } from "../modules/worker/worker.route";
import { availabilityRoutes } from "../modules/availability/availability.route";
import { adminRoute } from "../modules/admin/admin.route";
import { bookingRoute } from "../modules/booking/booking.route";
import { reviewRoute } from "../modules/review/review.route";
import { reportRoute } from "../modules/report/report.route";
import { withdrawRoute } from "../modules/withdraw/withdraw.route";
import { notificationsRoute } from "../modules/notifications/notification.route";

const router = express.Router();

const moduleRoutes = [
  {
    path: "/users",
    route: userRoutes,
  },
  {
    path: "/auth",
    route: authRoute,
  },
  {
    path: "/admin",
    route: adminRoute,
  },
  {
    path: "/job",
    route: jobRoutes,
  },
  {
    path: "/booking",
    route: bookingRoute,
  },
  {
    path: "/review",
    route: reviewRoute,
  },
  {
    path: "/report",
    route: reportRoute,
  },
  {
    path: "/notification",
    route: notificationsRoute,
  },
  {
    path: "/withdraw",
    route: withdrawRoute,
  },
  {
    path: "/worker",
    route: workerRoutes,
  },
  {
    path: "/availability",
    route: availabilityRoutes,
  },
  {
    path: "/message",
    route: messageRoute,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
