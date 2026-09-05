/**
 * Health check controller
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const getHealth = (req, res) => {
  return res.status(200).json({
    success: true,
    message: "HydroGuard API is running"
  });
};
