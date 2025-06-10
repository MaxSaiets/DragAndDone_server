// models/index.js
const { Sequelize, DataTypes, Op } = require('sequelize');
const sequelize = require('../db');
const ActivityLog = require('./ActivityLog')(sequelize);
const Chat = require('./Chat')(sequelize);
const ChatUser = require('./ChatUser')(sequelize);
const Message = require('./Message')(sequelize);
const MessageFile = require('./MessageFile')(sequelize);

// --- User Model ---
const User = sequelize.define('User', {
  uid: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  avatar: {
    type: DataTypes.STRING
  },
  role: {
    type: DataTypes.ENUM('user', 'admin'),
    defaultValue: 'user'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'blocked'),
    defaultValue: 'active'
  },
  preferences: {
    type: DataTypes.JSONB,
    defaultValue: { theme: 'light', notifications: true, language: 'en' }
  }
}, {
  timestamps: true,
  tableName: 'users'
});

// --- Team Model ---
const Team = sequelize.define('Team', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  description: { 
    type: DataTypes.TEXT 
  },
  avatar: { 
    type: DataTypes.STRING 
  },
  ownerId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: { model: User, key: 'uid' }
  },
  settings: {
    type: DataTypes.JSONB,
    defaultValue: { allowInvites: true, allowFileSharing: true }
  }
}, {
  timestamps: true,
  tableName: 'teams'
});

// --- Task Model ---
const Task = sequelize.define('Task', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  description: { 
    type: DataTypes.TEXT 
  },
  status: {
    type: DataTypes.ENUM('todo', 'in_progress', 'done'),
    defaultValue: 'todo'
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high'),
    defaultValue: 'medium'
  },
  dueDate: { 
    type: DataTypes.DATE 
  },
  order: { 
    type: DataTypes.INTEGER, 
    defaultValue: 0 
  },
  progress: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: { min: 0, max: 100 }
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: { model: User, key: 'uid' }
  },
  teamId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: Team, key: 'id' }
  }
}, {
  timestamps: true,
  tableName: 'tasks'
});

// --- Comment Model ---
const Comment = sequelize.define('Comment', {
  id: { 
    type: DataTypes.UUID, 
    defaultValue: DataTypes.UUIDV4, 
    primaryKey: true 
  },
  text: { 
    type: DataTypes.TEXT, 
    allowNull: false 
  },
  edited: { 
    type: DataTypes.BOOLEAN, 
    defaultValue: false 
  },
  reactions: { 
    type: DataTypes.JSONB, 
    defaultValue: {} 
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: { model: User, key: 'uid' }
  },
  taskId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: Task, key: 'id' }
  },
  parentId: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  timestamps: true,
  tableName: 'comments'
});

// --- Subtask Model ---
const Subtask = sequelize.define('Subtask', {
  id: { 
    type: DataTypes.UUID, 
    defaultValue: DataTypes.UUIDV4, 
    primaryKey: true 
  },
  title: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  completed: { 
    type: DataTypes.BOOLEAN, 
    defaultValue: false 
  },
  order: { 
    type: DataTypes.INTEGER, 
    defaultValue: 0 
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: { model: User, key: 'uid' }
  },
  taskId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: Task, key: 'id' }
  }
}, {
  timestamps: true,
  tableName: 'subtasks'
});

// --- File Model ---
const File = sequelize.define('File', {
  id: { 
    type: DataTypes.UUID, 
    defaultValue: DataTypes.UUIDV4, 
    primaryKey: true 
  },
  name: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  path: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  size: { 
    type: DataTypes.INTEGER 
  },
  type: { 
    type: DataTypes.STRING 
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: { model: User, key: 'uid' }
  },
  taskId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: Task, key: 'id' }
  }
}, {
  timestamps: true,
  tableName: 'files'
});

// --- TeamMember Model ---
const TeamMember = sequelize.define('TeamMember', {
  id: { 
    type: DataTypes.UUID, 
    defaultValue: DataTypes.UUIDV4, 
    primaryKey: true 
  },
  teamId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: Team, key: 'id' }
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: { model: User, key: 'uid' }
  },
  role: {
    type: DataTypes.ENUM('member', 'admin', 'owner'),
    defaultValue: 'member'
  },
  joinedAt: { 
    type: DataTypes.DATE, 
    defaultValue: DataTypes.NOW 
  }
}, {
  timestamps: true,
  tableName: 'team_members',
  indexes: [
    {
      unique: true,
      fields: ['teamId', 'userId'],
      name: 'unique_team_member'
    }
  ]
});

// --- TaskAssignee Model ---
const TaskAssignee = sequelize.define('TaskAssignee', {
  id: { 
    type: DataTypes.UUID, 
    defaultValue: DataTypes.UUIDV4, 
    primaryKey: true 
  },
  taskId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: Task, key: 'id' }
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: { model: User, key: 'uid' }
  },
  assignedAt: { 
    type: DataTypes.DATE, 
    defaultValue: DataTypes.NOW 
  }
}, {
  timestamps: true,
  tableName: 'task_assignees',
  indexes: [
    {
      unique: true,
      fields: ['taskId', 'userId'],
      name: 'unique_task_assignee'
    }
  ]
});

// --- Асоціації ---
// User associations
User.hasMany(Task, { 
  as: 'createdTasks', 
  foreignKey: 'userId',
  sourceKey: 'uid'
});
User.hasMany(Comment, { 
  foreignKey: 'userId',
  sourceKey: 'uid'
});
User.hasMany(Subtask, { 
  foreignKey: 'userId',
  sourceKey: 'uid'
});
User.hasMany(File, { 
  foreignKey: 'userId',
  sourceKey: 'uid'
});
User.hasMany(TeamMember, { 
  foreignKey: 'userId',
  sourceKey: 'uid',
  as: 'teamMemberships'
});
User.hasMany(TaskAssignee, { 
  foreignKey: 'userId',
  sourceKey: 'uid'
});
User.hasMany(Message, { foreignKey: 'userId', as: 'userMessages' });
User.hasMany(ChatUser, { foreignKey: 'userId', as: 'chatMemberships' });

// Team associations
Team.hasMany(Task, { 
  foreignKey: 'teamId'
});
Team.hasMany(TeamMember, { 
  foreignKey: 'teamId',
  as: 'teamMembers'
});
Team.belongsTo(User, { 
  foreignKey: 'ownerId',
  targetKey: 'uid',
  as: 'teamOwner'
});

// Task associations
Task.belongsTo(User, { 
  as: 'creator', 
  foreignKey: 'userId',
  targetKey: 'uid'
});
Task.belongsTo(Team, { 
  foreignKey: 'teamId'
});
Task.hasMany(Comment, { 
  foreignKey: 'taskId'
});
Task.hasMany(Subtask, { 
  foreignKey: 'taskId'
});
Task.hasMany(File, { 
  foreignKey: 'taskId'
});
Task.belongsToMany(User, { 
  through: TaskAssignee,
  foreignKey: 'taskId',
  otherKey: 'userId',
  as: 'assignees'
});

// Comment associations
Comment.belongsTo(User, { 
  foreignKey: 'userId',
  targetKey: 'uid'
});
Comment.belongsTo(Task, { 
  foreignKey: 'taskId'
});
Comment.belongsTo(Comment, { 
  as: 'parent',
  foreignKey: 'parentId'
});
Comment.hasMany(Comment, { 
  as: 'replies',
  foreignKey: 'parentId'
});

// Subtask associations
Subtask.belongsTo(User, { 
  foreignKey: 'userId',
  targetKey: 'uid'
});
Subtask.belongsTo(Task, { 
  foreignKey: 'taskId'
});

// File associations
File.belongsTo(User, { 
  foreignKey: 'userId',
  targetKey: 'uid'
});
File.belongsTo(Task, { 
  foreignKey: 'taskId'
});

// TeamMember associations
TeamMember.belongsTo(Team, { 
  foreignKey: 'teamId',
  targetKey: 'id',
  as: 'team'
});
TeamMember.belongsTo(User, { 
  foreignKey: 'userId',
  targetKey: 'uid',
  as: 'user'
});

// TaskAssignee associations
TaskAssignee.belongsTo(Task, { 
  foreignKey: 'taskId'
});
TaskAssignee.belongsTo(User, { 
  foreignKey: 'userId',
  targetKey: 'uid'
});

// Many-to-many associations
User.belongsToMany(Team, { 
  through: TeamMember,
  foreignKey: 'userId',
  otherKey: 'teamId',
  as: 'userTeams'
});
Team.belongsToMany(User, { 
  through: TeamMember,
  foreignKey: 'teamId',
  otherKey: 'userId',
  as: 'teamUsers'
});

// Chat associations
Chat.hasMany(ChatUser, { foreignKey: 'chatId', as: 'users' });
ChatUser.belongsTo(Chat, { foreignKey: 'chatId' });

Chat.hasMany(Message, { foreignKey: 'chatId', as: 'chatMessages' });
Message.belongsTo(Chat, { foreignKey: 'chatId', as: 'chat' });

Message.hasMany(MessageFile, { foreignKey: 'messageId', as: 'files' });
MessageFile.belongsTo(Message, { foreignKey: 'messageId' });

Message.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Chat.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

ChatUser.belongsTo(User, { foreignKey: 'userId' });

// Export models
module.exports = {
  sequelize,
  Sequelize,
  Op,
  User,
  Team,
  Task,
  Comment,
  Subtask,
  File,
  ActivityLog,
  TeamMember,
  TaskAssignee,
  Chat,
  ChatUser,
  Message,
  MessageFile
};
