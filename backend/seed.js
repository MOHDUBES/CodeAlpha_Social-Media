const bcrypt = require('bcryptjs');
const sequelize = require('./config/database');
const { User, Post, Comment, Like, Follower, Story, Notification } = require('./models');

const seedDatabase = async () => {
  try {
    await sequelize.sync({ force: true });
    console.log('Database synced & cleared');

    const passwordHash = await bcrypt.hash('Test@1234', 10);

    const usersData = [
      { username: 'alice', fullName: 'Alice Wonderland', email: 'alice@example.com', password: passwordHash, bio: 'Tech enthusiast & traveler 🌍', profilePic: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice', isVerified: true },
      { username: 'bob', fullName: 'Bob Builder', email: 'bob@example.com', password: passwordHash, bio: 'Coffee lover. Code writer. ☕', profilePic: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob', isVerified: false },
      { username: 'carol', fullName: 'Carol Danvers', email: 'carol@example.com', password: passwordHash, bio: 'Higher, further, faster 🚀', profilePic: 'https://api.dicebear.com/7.x/avataaars/svg?seed=carol', isVerified: true },
      { username: 'dan', fullName: 'Dan Abramov', email: 'dan@example.com', password: passwordHash, bio: 'Just here for the memes', profilePic: 'https://api.dicebear.com/7.x/avataaars/svg?seed=dan', isVerified: false },
      { username: 'eva', fullName: 'Eva Green', email: 'eva@example.com', password: passwordHash, bio: 'Designing things and stuff 🎨', profilePic: 'https://api.dicebear.com/7.x/avataaars/svg?seed=eva', isVerified: true }
    ];

    const users = await User.bulkCreate(usersData);
    console.log('Users created');

    const follows = [
      { followerId: users[0].id, followingId: users[1].id },
      { followerId: users[0].id, followingId: users[2].id },
      { followerId: users[1].id, followingId: users[0].id },
      { followerId: users[2].id, followingId: users[0].id },
      { followerId: users[3].id, followingId: users[0].id },
      { followerId: users[4].id, followingId: users[0].id },
      { followerId: users[4].id, followingId: users[2].id }
    ];
    await Follower.bulkCreate(follows);

    const postsData = [
      { userId: users[0].id, caption: 'Just launched my new portfolio! #dev #coding', mediaUrl: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085', mediaType: 'image', location: 'San Francisco, CA' },
      { userId: users[1].id, caption: 'Coffee makes everything better.', mediaUrl: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf', mediaType: 'image' },
      { userId: users[2].id, caption: 'Sunset in the city tonight was unreal. 🌇', mediaUrl: 'https://images.unsplash.com/photo-1514924013411-ccefac373274', mediaType: 'image', location: 'New York, NY' },
      { userId: users[3].id, caption: 'What is your favorite programming language?', mediaUrl: '', mediaType: 'text' },
      { userId: users[4].id, caption: 'Designing a new mobile app today! Here is a sneak peek.', mediaUrl: 'https://images.unsplash.com/photo-1561070791-2526d30994b5', mediaType: 'image' }
    ];

    const posts = await Post.bulkCreate(postsData);
    console.log('Posts created');

    const likes = [
      { userId: users[1].id, postId: posts[0].id },
      { userId: users[2].id, postId: posts[0].id },
      { userId: users[0].id, postId: posts[1].id },
      { userId: users[0].id, postId: posts[2].id }
    ];
    await Like.bulkCreate(likes);

    const comments = await Comment.bulkCreate([
      { userId: users[1].id, postId: posts[0].id, text: 'Looks amazing!' },
      { userId: users[2].id, postId: posts[0].id, text: 'Great job!' },
      { userId: users[0].id, postId: posts[1].id, text: 'I need a cup right now.' }
    ]);

    // Add a reply
    await Comment.create({
      userId: users[0].id,
      postId: posts[0].id,
      text: 'Thanks so much!',
      parentId: comments[0].id
    });

    const expiresTomorrow = new Date();
    expiresTomorrow.setHours(expiresTomorrow.getHours() + 24);

    const storiesData = [
      { userId: users[0].id, mediaUrl: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f', mediaType: 'image', expiresAt: expiresTomorrow },
      { userId: users[2].id, mediaUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb', mediaType: 'image', expiresAt: expiresTomorrow },
      { userId: users[4].id, mediaUrl: 'https://images.unsplash.com/photo-1528642474498-1af0c17fd8c3', mediaType: 'image', expiresAt: expiresTomorrow }
    ];
    await Story.bulkCreate(storiesData);

    await Notification.bulkCreate([
      { recipientId: users[0].id, senderId: users[1].id, type: 'like', postId: posts[0].id },
      { recipientId: users[0].id, senderId: users[2].id, type: 'comment', postId: posts[0].id },
      { recipientId: users[0].id, senderId: users[3].id, type: 'follow' },
      { recipientId: users[1].id, senderId: users[0].id, type: 'comment_reply', postId: posts[0].id }
    ]);
    console.log('Notifications created');

    console.log('\\n✅ Seed completed successfully!\\n');
    console.log('Test Accounts:');
    usersData.forEach(u => {
      console.log(`Email: ${u.email} | Password: Test@1234`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Failed to seed DB:', error);
    process.exit(1);
  }
};

seedDatabase();
