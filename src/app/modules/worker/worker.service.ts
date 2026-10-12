import prisma from "../../../shared/prisma";
import { calculateDistance } from "../../../helpers/distanceCalculator";
import ApiError from "../../../errors/ApiErrors";
import {
  startOfWeek,
  endOfWeek,
  startOfYear,
  endOfYear,
  getDay,
  getMonth,
} from "date-fns";

const getAllWorkersFromDB = async (
  userId: string,
  rating?: number,
  maxDistance?: number,
  skill?: string,
  gender?: string,
) => {
  const parseTimeToMinutes = (time: string) => {
    const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return Number.POSITIVE_INFINITY;
    let hour = Number(match[1]);
    const minute = Number(match[2]);
    const meridiem = match[3].toUpperCase();
    if (meridiem === "PM" && hour !== 12) hour += 12;
    if (meridiem === "AM" && hour === 12) hour = 0;
    return hour * 60 + minute;
  };

  const userLocation = await prisma.userLocation.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  if (!userLocation) {
    throw new ApiError(
      404,
      "User location not found. Please update your location.",
    );
  }

  const todayDayOfWeek = getDay(new Date());

  const workerWhere: Record<string, unknown> = {
    role: "WORKER",
    status: "Active",
  };

  if (typeof rating === "number") {
    workerWhere.avgRating = { gte: rating };
  }

  if (skill || gender) {
    const profileFilter: Record<string, unknown> = {};

    if (skill) {
      profileFilter.skills = { has: skill };
    }

    if (gender) {
      profileFilter.gender = gender;
    }

    workerWhere.workerProfile = { is: profileFilter };
  }

  const workers = await prisma.user.findMany({
    where: workerWhere,
    select: {
      id: true,
      userName: true,
      avgRating: true,
      profileImage: true,
      workerProfile: {
        select: {
          skills: true,
          hourlyRate: true,
        },
      },
      userLocation: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      availabilities: {
        where: { dayOfWeek: todayDayOfWeek },
        select: {
          slots: {
            select: {
              startTime: true,
              endTime: true,
            },
          },
        },
      },
    },
  });

  const workersWithDistance = workers
    .map((worker) => {
      const todaySlots = worker.availabilities.flatMap(
        (availability) => availability.slots,
      );
      const firstSlot = todaySlots
        .slice()
        .sort(
          (a, b) =>
            parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime),
        )[0];

      if (!firstSlot) return null;

      const workerLocation = worker.userLocation[0];

      const distance = workerLocation
        ? calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            workerLocation.latitude,
            workerLocation.longitude,
          )
        : Infinity;

      if (typeof maxDistance === "number") {
        if (distance === Infinity || distance > maxDistance) return null;
      }

      return {
        id: worker.id,
        userName: worker.userName,
        avgRating: worker.avgRating,
        profileImage: worker.profileImage,
        workerProfile: worker.workerProfile,
        availableSlot: {
          startTime: firstSlot.startTime,
          endTime: firstSlot.endTime,
        },
        distance: distance === Infinity ? null : distance,
      };
    })
    .filter((worker) => worker !== null)
    .sort((a, b) => {
      const distA = a.distance === null ? Infinity : a.distance;
      const distB = b.distance === null ? Infinity : b.distance;
      return distA - distB;
    });

  return workersWithDistance;
};

const getWorkerDetailsFromDB = async (workerId: string) => {
  const parseTimeToMinutes = (time: string) => {
    const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return Number.POSITIVE_INFINITY;
    let hour = Number(match[1]);
    const minute = Number(match[2]);
    const meridiem = match[3].toUpperCase();
    if (meridiem === "PM" && hour !== 12) hour += 12;
    if (meridiem === "AM" && hour === 12) hour = 0;
    return hour * 60 + minute;
  };

  const todayDayOfWeek = getDay(new Date());

  const worker = await prisma.user.findUniqueOrThrow({
    where: { id: workerId, role: "WORKER" },
    select: {
      id: true,
      userName: true,
      avgRating: true,
      totalReview: true,
      profileImage: true,
      workerProfile: {
        select: {
          skills: true,
          hourlyRate: true,
          experience: true,
          bio: true,
          certificateUrl: true,
          cprUrl: true,
          immunizationUrl: true,
          licenceUrl: true,
        },
      },
      receivedReviews: {
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          reviewer: {
            select: {
              id: true,
              userName: true,
              profileImage: true,
            },
          },
        },
      },
      availabilities: {
        where: { dayOfWeek: todayDayOfWeek },
        select: {
          slots: {
            select: {
              startTime: true,
              endTime: true,
            },
          },
        },
      },
    },
  });

  const totalBookings = await prisma.booking.count({
    where: { workerId },
  });

  const cancelledBookings = await prisma.booking.count({
    where: { workerId, status: "Cancelled" },
  });

  const cancellationPercentage =
    totalBookings === 0
      ? 0
      : Number(((cancelledBookings / totalBookings) * 100).toFixed(2));

  const todaySlots = worker.availabilities.flatMap(
    (availability) => availability.slots,
  );
  const firstSlot = todaySlots
    .slice()
    .sort(
      (a, b) =>
        parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime),
    )[0];

  return {
    ...worker,
    availableSlot: firstSlot
      ? {
          startTime: firstSlot.startTime,
          endTime: firstSlot.endTime,
        }
      : null,
    availabilities: undefined,
    cancellationPercentage,
  };
};

const getWorkerEarningSummaryFromDB = async (
  workerId: string,
  type: "weekly" | "monthly",
) => {
  const worker = await prisma.workerProfile.findUniqueOrThrow({
    where: { workerId },
  });

  const days = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  let chartData: any[] = [];

  if (type === "weekly") {
    const start = startOfWeek(new Date(), { weekStartsOn: 6 }); // Sat
    const end = endOfWeek(new Date(), { weekStartsOn: 6 }); // Fri

    const weekEarnings = await prisma.booking.findMany({
      where: {
        workerId,
        status: "Completed",
        createdAt: { gte: start, lte: end },
      },
      select: { price: true, createdAt: true },
    });

    const weeklyData = Array(7).fill(0);

    for (const e of weekEarnings) {
      const localDate = new Date(e.createdAt); // ✅ FIXED
      const dayIndex = getDay(localDate); // 0=Sun ... 6=Sat
      const mappedIndex = (dayIndex - 6 + 7) % 7; // shift so Sat=0
      weeklyData[mappedIndex] += e.price;
    }

    chartData = days.map((day, idx) => ({
      day,
      earnings: weeklyData[idx],
    }));
  }

  if (type === "monthly") {
    const start = startOfYear(new Date());
    const end = endOfYear(new Date());

    const monthEarnings = await prisma.booking.findMany({
      where: {
        workerId,
        status: "Completed",
        createdAt: { gte: start, lte: end },
      },
      select: { price: true, createdAt: true },
    });

    const monthlyData = Array(12).fill(0);

    for (const e of monthEarnings) {
      const localDate = new Date(e.createdAt); // ✅ FIXED
      const monthIndex = getMonth(localDate);
      monthlyData[monthIndex] += e.price;
    }

    chartData = months.map((month, idx) => ({
      month,
      earnings: monthlyData[idx],
    }));
  }

  return {
    currentEarnings: worker.currentEarning,
    allTimeEarnings: worker.allTimeEarning,
    chartData,
  };
};



export const workerServices = {
  getAllWorkersFromDB,
  getWorkerDetailsFromDB,
  getWorkerEarningSummaryFromDB,  
};
