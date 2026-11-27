const isPoster = (req, res, next) => {
  if (req.user && req.user.role === "poster") {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: "Access denied. Only users with role 'poster' can post jobs.",
    });
  }
};

export { isPoster };
