import asyncHandler from "express-async-handler";

export const userDashboard = asyncHandler(async (req, res) => {
  res.json({ message: `Welcome ${req.user.name}, User Dashboard Access Granted` });
});

export const superAdminDashboard = asyncHandler(async (req, res) => {
  res.json({ message: `Hello ${req.user.name}, Super Admin Dashboard Access Granted` });
});
