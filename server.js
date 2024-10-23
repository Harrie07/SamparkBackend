require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const twilio = require('twilio');
const multer = require('multer');
const authMiddleware = require('./middleware/Auth'); // Ensure correct case

// Load environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID; // Use environment variable
const authToken = process.env.TWILIO_AUTH_TOKEN; // Use environment variable
const connectionString = process.env.DB_CONNECTION_STRING;

const client = twilio(accountSid, authToken);

// Import models
const Scheme = require('./models/Scheme');
const officeRoutes = require('./routes/Office');
const Grievance = require('./models/Grievance');
const User = require('./models/User');
const Log = require('./models/Log');
const adminRoutes = require('./routes/Admin');
const nearbyOfficeRoutes = require('./routes/NearbyGovernmentOffices');
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: 'http://localhost:3000' })); // Allow requests from frontend
app.use(bodyParser.json()); // For handling JSON requests

// MongoDB connection
mongoose.connect(connectionString)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Import routes
const authRoutes = require('./routes/Auth'); // Import the auth routes

// Register routes
app.use('/api/auth', authRoutes); // Use the auth routes
app.use('/api/offices', officeRoutes); 
app.use('/api/admin', adminRoutes);// Office API routes
app.use('/api/nearby-offices', nearbyOfficeRoutes);

// File upload setup with Multer
const upload = multer({ dest: 'uploads/' });

// Route to send OTP
// Endpoint to send OTP
app.post('/api/send-otp', (req, res) => {
  const { mobileNumber } = req.body;

  if (!mobileNumber) {
    return res.status(400).json({ error: 'Mobile number is required' });
  }

  console.log('Sending OTP to:', mobileNumber);  // Debugging log
  client.verify.v2.services("VAe920933fc317990a30ce768a03c20580")
    .verifications
    .create({ to: mobileNumber, channel: 'sms' })
    .then(verification => {
      console.log('OTP sent successfully:', verification.status);
      res.json({ message: 'OTP sent successfully', status: verification.status });
    })
    .catch(error => {
      console.error('Error sending OTP:', error);
      res.status(500).json({ error: 'Failed to send OTP' });
    });
});

// Endpoint to verify OTP
app.post('/api/verify-otp', (req, res) => {
  const { mobileNumber, otp } = req.body;

  if (!mobileNumber || !otp) {
    return res.status(400).json({ error: 'Mobile number and OTP are required' });
  }

  console.log('Verifying OTP for:', mobileNumber);  // Debugging log
  client.verify.v2.services("VAe920933fc317990a30ce768a03c20580")
    .verificationChecks
    .create({ to: mobileNumber, code: otp })
    .then(verification_check => {
      if (verification_check.status === 'approved') {
        console.log('OTP verified successfully');
        res.json({ message: 'OTP verified successfully' });
      } else {
        console.log('Incorrect OTP');
        res.status(400).json({ error: 'Incorrect OTP' });
      }
    })
    .catch(error => {
      console.error('Error verifying OTP:', error);
      res.status(500).json({ error: 'Failed to verify OTP' });
    });
});



// Endpoint to submit grievances
app.post('/api/grievances', upload.array('attachments'), async (req, res) => {
  try {
    const { complaintName, description, category, location } = req.body;
    const attachments = req.files.map(file => file.path);

    if (!complaintName || !description || !category || !location) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const newGrievance = new Grievance({
      complaintName,
      description,
      category,
      attachments,
      location,
    });

    const savedGrievance = await newGrievance.save();
    res.status(200).json(savedGrievance);
  } catch (error) {
    console.error('Error saving grievance:', error);
    res.status(500).json({ error: 'Failed to submit grievance' });
  }
});

// Schemes API route
app.get('/api/schemes', async (req, res) => {
  try {
    const schemes = await Scheme.find();
    res.json(schemes);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching schemes', error });
  }
});

// Logging user inputs and outputs (for admin)
app.post('/api/logs', async (req, res) => {
  const { username, input, output } = req.body;

  try {
    const log = new Log({ username, input, output });
    await log.save();
    res.status(201).json({ message: 'Log created successfully!' });
  } catch (error) {
    res.status(400).json({ message: 'Error creating log', error });
  }
});

// Protected route example
app.get('/api/protected', authMiddleware, (req, res) => {
  res.json({ message: 'This is a protected route, and you are authorized!', userId: req.user });
});

// Global error handling middleware (Optional but recommended)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
