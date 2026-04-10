const express = require('express');
const router = express.Router();
const Module = require('../models/Module');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');

// GET /api/modules — Get modules accessible to logged-in user
router.get('/', protect, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const modules = await Module.find().sort({ order: 1 });
      return res.json(modules);
    }

    if (!req.user.isApproved) {
      return res.status(403).json({ message: 'Payment not approved yet' });
    }

    const user = await User.findById(req.user._id).populate('moduleAccess.moduleId');
    const modules = user.moduleAccess
      .map(ma => ma.moduleId)
      .filter(Boolean)
      .sort((a, b) => a.order - b.order);

    res.json(modules);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/modules/all — Admin: get all modules
router.get('/all', protect, adminOnly, async (req, res) => {
  try {
    const modules = await Module.find().sort({ order: 1 });
    res.json(modules);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/modules — Admin: create module
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { title, description, videoUrl, content, order, duration } = req.body;
    const module = await Module.create({ title, description, videoUrl, content, order, duration });
    res.status(201).json(module);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/modules/:id — Admin: update module
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const module = await Module.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(module);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/modules/:id — Admin: delete module
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Module.findByIdAndDelete(req.params.id);
    res.json({ message: 'Module deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;