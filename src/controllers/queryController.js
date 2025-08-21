import Query from '../models/Query.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';

// Create a new query from contact form
export const createContactQuery = async (req, res) => {
  try {
    const { name, email, message, phone, subject } = req.body;

    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, and message are required'
      });
    }

    // Create query from contact form
    const query = await Query.createFromContactForm({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      message: message.trim(),
      phone: phone?.trim(),
      subject: subject?.trim()
    });

    logger.info(`New contact query created: ${query._id} from ${email}`);

    res.status(201).json({
      success: true,
      message: 'Your message has been sent successfully. We will get back to you soon!',
      data: {
        queryId: query._id,
        status: query.status
      }
    });

  } catch (error) {
    logger.error('Error creating contact query:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message. Please try again later.'
    });
  }
};

// Get all queries (admin only)
export const getAllQueries = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      category,
      priority,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = { isActive: true };
    
    if (status && status !== 'all') filter.status = status;
    if (category && category !== 'all') filter.category = category;
    if (priority && priority !== 'all') filter.priority = priority;
    
    if (search) {
      filter.$or = [
        { title: new RegExp(search, 'i') },
        { message: new RegExp(search, 'i') },
        { 'user.name': new RegExp(search, 'i') },
        { 'user.email': new RegExp(search, 'i') },
        { 'contactInfo.name': new RegExp(search, 'i') },
        { 'contactInfo.email': new RegExp(search, 'i') }
      ];
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const queries = await Query.find(filter)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('assignedTo', 'name email')
      .lean();

    const total = await Query.countDocuments(filter);

    res.json({
      success: true,
      data: {
        queries,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching queries:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch queries'
    });
  }
};

// Get query by ID
export const getQueryById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = await Query.findById(id)
      .populate('assignedTo', 'name email')
      .lean();

    if (!query) {
      return res.status(404).json({
        success: false,
        error: 'Query not found'
      });
    }

    res.json({
      success: true,
      data: query
    });

  } catch (error) {
    logger.error('Error fetching query:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch query'
    });
  }
};

// Update query status
export const updateQueryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assignedTo } = req.body;

    const query = await Query.findById(id);
    if (!query) {
      return res.status(404).json({
        success: false,
        error: 'Query not found'
      });
    }

    // Update status
    await query.updateStatus(status, assignedTo);

    logger.info(`Query ${id} status updated to ${status} by ${req.user?.email}`);

    res.json({
      success: true,
      message: 'Query status updated successfully',
      data: query
    });

  } catch (error) {
    logger.error('Error updating query status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update query status'
    });
  }
};

// Add response to query
export const addQueryResponse = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Response message is required'
      });
    }

    const query = await Query.findById(id);
    if (!query) {
      return res.status(404).json({
        success: false,
        error: 'Query not found'
      });
    }

    // Add response
    const author = {
      _id: req.user._id,
      name: req.user.name,
      role: req.user.role === 'admin' ? 'admin' : 'user'
    };

    await query.addResponse(message.trim(), author);

    // Auto-update status to in_progress if it was open
    if (query.status === 'open') {
      query.status = 'in_progress';
      await query.save();
    }

    logger.info(`Response added to query ${id} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Response added successfully',
      data: query
    });

  } catch (error) {
    logger.error('Error adding query response:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add response'
    });
  }
};

// Get query statistics
export const getQueryStats = async (req, res) => {
  try {
    const totalQueries = await Query.countDocuments({ isActive: true });
    const openQueries = await Query.countDocuments({ status: 'open', isActive: true });
    const inProgressQueries = await Query.countDocuments({ status: 'in_progress', isActive: true });
    const resolvedQueries = await Query.countDocuments({ status: 'resolved', isActive: true });
    const closedQueries = await Query.countDocuments({ status: 'closed', isActive: true });

    // Queries by category
    const categoriesStats = await Query.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Queries by priority
    const priorityStats = await Query.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Recent queries (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentQueries = await Query.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
      isActive: true
    });

    // Average response time (mock calculation)
    const avgResponseTime = await Query.aggregate([
      { $match: { isActive: true, responses: { $ne: [] } } },
      { $addFields: { firstResponseTime: { $arrayElemAt: ['$responses.createdAt', 0] } } },
      { $addFields: { responseTime: { $subtract: ['$firstResponseTime', '$createdAt'] } } },
      { $group: { _id: null, avgTime: { $avg: '$responseTime' } } }
    ]);

    res.json({
      success: true,
      data: {
        totals: {
          total: totalQueries,
          open: openQueries,
          inProgress: inProgressQueries,
          resolved: resolvedQueries,
          closed: closedQueries
        },
        categories: categoriesStats,
        priorities: priorityStats,
        recent: recentQueries,
        avgResponseTimeMs: avgResponseTime[0]?.avgTime || 0
      }
    });

  } catch (error) {
    logger.error('Error fetching query stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
};

// Delete query (soft delete)
export const deleteQuery = async (req, res) => {
  try {
    const { id } = req.params;

    const query = await Query.findByIdAndUpdate(
      id,
      { isActive: false, updatedAt: new Date() },
      { new: true }
    );

    if (!query) {
      return res.status(404).json({
        success: false,
        error: 'Query not found'
      });
    }

    logger.info(`Query ${id} deleted by ${req.user?.email}`);

    res.json({
      success: true,
      message: 'Query deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting query:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete query'
    });
  }
};

// Export queries to CSV
export const exportQueries = async (req, res) => {
  try {
    const { status, category, priority } = req.query;
    
    const filter = { isActive: true };
    if (status && status !== 'all') filter.status = status;
    if (category && category !== 'all') filter.category = category;
    if (priority && priority !== 'all') filter.priority = priority;

    const queries = await Query.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    // Generate CSV content
    const headers = ['ID', 'Title', 'Message', 'User/Contact', 'Email', 'Category', 'Priority', 'Status', 'Created Date', 'Responses'];
    const rows = queries.map(query => [
      query._id,
      query.title,
      query.message.replace(/,/g, ';').substring(0, 100),
      query.user?.name || query.contactInfo?.name || 'Unknown',
      query.user?.email || query.contactInfo?.email || 'Unknown',
      query.category,
      query.priority,
      query.status,
      new Date(query.createdAt).toLocaleDateString(),
      query.responses.length
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=queries-export.csv');
    res.send(csvContent);

  } catch (error) {
    logger.error('Error exporting queries:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export queries'
    });
  }
};
