const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Create data directory if it doesn't exist
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Create feedbacks.json if it doesn't exist
const FEEDBACK_FILE = path.join(DATA_DIR, 'feedbacks.json');
if (!fs.existsSync(FEEDBACK_FILE)) {
    fs.writeFileSync(FEEDBACK_FILE, '[]', 'utf8');
}

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10kb' })); // Limit payload size
app.use(express.static('public'));

// Helper function to read feedbacks from file
function readFeedbacks() {
    try {
        const data = fs.readFileSync(FEEDBACK_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading feedbacks:', error);
        return [];
    }
}

// Helper function to write feedbacks to file
function writeFeedbacks(feedbacks) {
    try {
        // Validate feedbacks is an array
        if (!Array.isArray(feedbacks)) {
            throw new Error('Feedbacks must be an array');
        }
        
        // Write to a temporary file first
        const tempFile = FEEDBACK_FILE + '.tmp';
        fs.writeFileSync(tempFile, JSON.stringify(feedbacks, null, 2), 'utf8');
        
        // Rename temp file to actual file (atomic operation)
        fs.renameSync(tempFile, FEEDBACK_FILE);
        return true;
    } catch (error) {
        console.error('Error writing feedbacks:', error);
        return false;
    }
}

// Validate feedback data
function validateFeedback(feedback) {
    if (!feedback || typeof feedback !== 'object') {
        return false;
    }

    const requiredFields = ['facultyName', 'course', 'teachingQuality', 'communication'];
    for (const field of requiredFields) {
        if (!feedback[field]) {
            return false;
        }
    }

    // Validate ratings are numbers between 1 and 5
    if (![1, 2, 3, 4, 5].includes(Number(feedback.teachingQuality)) ||
        ![1, 2, 3, 4, 5].includes(Number(feedback.communication))) {
        return false;
    }

    return true;
}

// Route to handle form submission
app.post('/submit-feedback', (req, res) => {
    try {
        const feedback = req.body;
        
        // Validate feedback data
        if (!validateFeedback(feedback)) {
            return res.status(400).json({ 
                error: 'Invalid feedback data. Please check all required fields and ratings.' 
            });
        }

        // Add timestamp to feedback
        feedback.timestamp = new Date().toISOString();

        const feedbacks = readFeedbacks();
        feedbacks.push(feedback);
        
        if (writeFeedbacks(feedbacks)) {
            res.status(200).json({ 
                message: 'Feedback received successfully',
                feedback: feedback
            });
        } else {
            res.status(500).json({ 
                error: 'Failed to save feedback. Please try again.' 
            });
        }
    } catch (error) {
        console.error('Error processing feedback:', error);
        res.status(500).json({ 
            error: 'An unexpected error occurred. Please try again.' 
        });
    }
});

// Route to view all feedbacks
app.get('/view-feedbacks', (req, res) => {
    try {
        const feedbacks = readFeedbacks();
        res.json(feedbacks);
    } catch (error) {
        console.error('Error retrieving feedbacks:', error);
        res.status(500).json({ 
            error: 'Failed to retrieve feedbacks. Please try again.' 
        });
    }
});

// Route to serve the feedback viewer page
app.get('/view', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'view.html'));
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ 
        error: 'An unexpected error occurred. Please try again.' 
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Feedback form: http://localhost:${PORT}`);
    console.log(`View feedbacks: http://localhost:${PORT}/view`);
}); 