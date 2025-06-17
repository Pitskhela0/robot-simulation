import { Router } from 'express';
import { pool } from '../../db'; // Adjust the import path as needed

// Create a new router instance
const router = Router();

/**
 * @route   GET /api/health
 * @desc    Checks the health of the server and its database connection
 * @access  Public
 */
router.get('/', async (_req, res) => {
    try {
        // pool.query handles client checkout and release automatically
        await pool.query('SELECT 1'); 

        res.status(200).json({ 
            status: 'ok', 
            message: 'Server and database are healthy.' 
        });
    } catch (err) {
        console.error('Health check database connection failed:', err);

        const error = err instanceof Error ? err : new Error(String(err));

        // 503 Service Unavailable is a more standard status code for this
        res.status(503).json({
            status: 'error',
            message: 'Server is running, but a dependency is unhealthy.',
            database: {
                status: 'disconnected',
                error: error.message,
            }
        });
    }
});

export default router;