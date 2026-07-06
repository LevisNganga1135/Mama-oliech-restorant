// middleware/errorHandler.js
// Global middleware to intercept, format, and return Express errors in JSON format

module.exports = (err, req, res, next) => {
    console.error('💥 Backend Error Logged:', err.stack || err);

    const statusCode = err.statusCode || 500;
    const response = {
        error: err.message || 'Internal Server Error'
    };

    // Include stack trace only in development environment
    if (process.env.NODE_ENV === 'development') {
        response.stack = err.stack;
    }

    return res.status(statusCode).json(response);
};
