const User = require('./User');
const Post = require('./Post');
const Comment = require('./Comment');
const Like = require('./Like');
const Follower = require('./Follower');
const Token = require('./Token');
const PasswordReset = require('./PasswordReset');
const Story = require('./Story');
const Notification = require('./Notification');
const Conversation = require('./Conversation');
const Message = require('./Message');

User.hasMany(Post, { foreignKey: 'userId', onDelete: 'CASCADE' });
Post.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Comment, { foreignKey: 'userId', onDelete: 'CASCADE' });
Comment.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Post.hasMany(Comment, { foreignKey: 'postId', onDelete: 'CASCADE' });
Comment.belongsTo(Post, { foreignKey: 'postId', as: 'post' });

Comment.hasMany(Comment, { foreignKey: 'parentId', as: 'Replies', onDelete: 'CASCADE' });
Comment.belongsTo(Comment, { foreignKey: 'parentId', as: 'Parent' });

User.hasMany(Like, { foreignKey: 'userId', onDelete: 'CASCADE' });
Like.belongsTo(User, { foreignKey: 'userId' });

Post.hasMany(Like, { foreignKey: 'postId', onDelete: 'CASCADE' });
Like.belongsTo(Post, { foreignKey: 'postId' });

// Follower associations
User.hasMany(Follower, { foreignKey: 'followerId', as: 'Following', onDelete: 'CASCADE' });
User.hasMany(Follower, { foreignKey: 'followingId', as: 'Followers', onDelete: 'CASCADE' });
Follower.belongsTo(User, { foreignKey: 'followerId', as: 'followerUser' });
Follower.belongsTo(User, { foreignKey: 'followingId', as: 'followingUser' });

User.hasMany(Token, { foreignKey: 'userId', onDelete: 'CASCADE' });
Token.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Story, { foreignKey: 'userId', onDelete: 'CASCADE' });
Story.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Notification, { foreignKey: 'recipientId', as: 'ReceivedNotifications', onDelete: 'CASCADE' });
Notification.belongsTo(User, { foreignKey: 'recipientId', as: 'recipient' });

User.hasMany(Notification, { foreignKey: 'senderId', as: 'SentNotifications', onDelete: 'CASCADE' });
Notification.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

// Messaging associations
User.hasMany(Conversation, { foreignKey: 'user1Id', as: 'ConversationsStarted', onDelete: 'CASCADE' });
User.hasMany(Conversation, { foreignKey: 'user2Id', as: 'ConversationsReceived', onDelete: 'CASCADE' });
Conversation.belongsTo(User, { foreignKey: 'user1Id', as: 'user1' });
Conversation.belongsTo(User, { foreignKey: 'user2Id', as: 'user2' });

Conversation.hasMany(Message, { foreignKey: 'conversationId', onDelete: 'CASCADE' });
Message.belongsTo(Conversation, { foreignKey: 'conversationId' });

User.hasMany(Message, { foreignKey: 'senderId', onDelete: 'CASCADE' });
Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

module.exports = { User, Post, Comment, Like, Follower, Token, PasswordReset, Story, Notification, Conversation, Message };
