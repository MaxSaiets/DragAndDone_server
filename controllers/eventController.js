const { Event, User, Team, Task } = require('../models');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

exports.createEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      start,
      end,
      allDay,
      recurring,
      location,
      color,
      userId,
      teamId,
      taskId,
      type,
      attendees,
      reminders
    } = req.body;

    // Validate required fields
    if (!title || !start || !end || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate dates
    if (new Date(end) <= new Date(start)) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }

    const event = await Event.create({
      id: uuidv4(),
      title,
      description,
      start,
      end,
      allDay,
      recurring,
      location,
      color,
      userId,
      teamId,
      taskId,
      type,
      attendees,
      reminders
    });

    // If it's a recurring event, create the recurring instances
    if (recurring && recurring.frequency) {
      await createRecurringEvents(event);
    }

    // Отримуємо повну інформацію про подію
    const fullEvent = await Event.findByPk(event.id, {
      include: [
        {
          model: User,
          attributes: ['id', 'displayName', 'email', 'photoURL']
        },
        {
          model: Team,
          attributes: ['id', 'name']
        },
        {
          model: Task,
          attributes: ['id', 'title', 'status']
        }
      ]
    });

    res.status(201).json(fullEvent);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getEvents = async (req, res) => {
  try {
    const { userId, teamId, start, end, type } = req.query;
    
    const where = {};
    if (userId) where.userId = userId;
    if (teamId) where.teamId = teamId;
    if (type) where.type = type;
    
    if (start && end) {
      where[Op.or] = [
        // Events that start within the range
        {
          start: {
            [Op.between]: [new Date(start), new Date(end)]
          }
        },
        // Events that end within the range
        {
          end: {
            [Op.between]: [new Date(start), new Date(end)]
          }
        },
        // Events that span the entire range
        {
          [Op.and]: [
            { start: { [Op.lte]: new Date(start) } },
            { end: { [Op.gte]: new Date(end) } }
          ]
        }
      ];
    }

    const events = await Event.findAll({
      where,
      include: [
        {
          model: User,
          attributes: ['id', 'displayName', 'email', 'photoURL']
        },
        {
          model: Team,
          attributes: ['id', 'name']
        },
        {
          model: Task,
          attributes: ['id', 'title', 'status']
        }
      ],
      order: [['start', 'ASC']]
    });

    res.json(events);
  } catch (error) {
    console.error('Error getting events:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const event = await Event.findByPk(id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Validate dates if they're being updated
    if (updateData.start && updateData.end) {
      if (new Date(updateData.end) <= new Date(updateData.start)) {
        return res.status(400).json({ error: 'End date must be after start date' });
      }
    }

    // If recurring event is being updated, handle recurring instances
    if (event.recurring && updateData.updateRecurring) {
      await updateRecurringEvents(event, updateData);
    }

    await event.update(updateData);

    // Отримуємо оновлену подію з повною інформацією
    const updatedEvent = await Event.findByPk(id, {
      include: [
        {
          model: User,
          attributes: ['id', 'displayName', 'email', 'photoURL']
        },
        {
          model: Team,
          attributes: ['id', 'name']
        },
        {
          model: Task,
          attributes: ['id', 'title', 'status']
        }
      ]
    });

    res.json(updatedEvent);
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { deleteRecurring } = req.query;

    const event = await Event.findByPk(id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // If it's a recurring event, handle recurring instances
    if (event.recurring && deleteRecurring === 'all') {
      await deleteRecurringEvents(event);
    }

    await event.destroy();
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: error.message });
  }
};

// Helper functions for recurring events
async function createRecurringEvents(event) {
  const { recurring } = event;
  const instances = [];
  let currentDate = new Date(event.start);
  const endDate = recurring.endDate ? new Date(recurring.endDate) : null;
  const maxInstances = recurring.maxInstances || 100;

  while (instances.length < maxInstances) {
    if (endDate && currentDate > endDate) break;

    const instance = await Event.create({
      id: uuidv4(),
      ...event.toJSON(),
      start: new Date(currentDate),
      end: new Date(currentDate.getTime() + (event.end - event.start)),
      recurring: null,
      parentEventId: event.id
    });

    instances.push(instance);

    // Calculate next occurrence
    switch (recurring.frequency) {
      case 'daily':
        currentDate.setDate(currentDate.getDate() + (recurring.interval || 1));
        break;
      case 'weekly':
        currentDate.setDate(currentDate.getDate() + (7 * (recurring.interval || 1)));
        break;
      case 'monthly':
        currentDate.setMonth(currentDate.getMonth() + (recurring.interval || 1));
        break;
      case 'yearly':
        currentDate.setFullYear(currentDate.getFullYear() + (recurring.interval || 1));
        break;
      default:
        break;
    }
  }

  return instances;
}

async function updateRecurringEvents(event, updateData) {
  const { updateRecurring } = updateData;
  delete updateData.updateRecurring;

  if (updateRecurring === 'all') {
    // Update all future instances
    await Event.update(updateData, {
      where: {
        parentEventId: event.id,
        start: {
          [Op.gte]: new Date()
        }
      }
    });
  } else if (updateRecurring === 'this') {
    // Create a new exception event
    await Event.create({
      id: uuidv4(),
      ...event.toJSON(),
      ...updateData,
      recurring: null,
      parentEventId: event.id,
      isException: true
    });
  }
}

async function deleteRecurringEvents(event) {
  await Event.destroy({
    where: {
      [Op.or]: [
        { id: event.id },
        { parentEventId: event.id }
      ]
    }
  });
} 