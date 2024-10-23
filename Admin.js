// routes/Admin.js

const express = require('express');
const router = express.Router();
const Grievance = require('../models/Grievance');
const Log = require('../models/Log');
const adminAuth = require('../middleware/AdminAuth'); // Admin auth middleware

// Get all grievances
router.get('/grievances', adminAuth, async (req, res) => {
  try {
    const grievances = await Grievance.find().populate('user');
    res.json(grievances);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching grievances' });
  }
});

// Update grievance status
router.patch('/grievance/:id/status', adminAuth, async (req, res) => {
  const { status } = req.body;
  
  try {
    const grievance = await Grievance.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.json(grievance);
  } catch (err) {
    res.status(500).json({ message: 'Error updating grievance status' });
  }
});

// Get user activity logs
router.get('/user-activity', adminAuth, async (req, res) => {
  try {
    const logs = await Log.find().populate('user');
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching user activities' });
  }
});

module.exports = router;

