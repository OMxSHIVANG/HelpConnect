import mongoose from 'mongoose';
import Message from '../models/Message.js';
import User from '../models/User.js';
import NGO from '../models/NGO.js';
import { createNotification } from './ngoProfileController.js';
import { emitChatMessage } from '../socket.js';

// @desc    Send a new message
// @route   POST /api/chat/messages
// @access  Private
export const sendMessage = async (req, res) => {
    try {
        const { receiverId, text, donationId } = req.body;

        if (!receiverId || !mongoose.Types.ObjectId.isValid(receiverId)) {
            return res.status(400).json({ success: false, message: 'Valid receiver ID is required' });
        }

        const trimmedText = text ? text.trim() : '';
        if (!trimmedText) {
            return res.status(400).json({ success: false, message: 'Message text cannot be empty' });
        }

        if (req.user._id.toString() === receiverId.toString()) {
            return res.status(400).json({ success: false, message: 'Cannot send message to yourself' });
        }

        const receiver = await User.findById(receiverId);
        if (!receiver || !receiver.isActive) {
            return res.status(404).json({ success: false, message: 'Receiver user not found or inactive' });
        }

        // Prevent duplicate submissions sent within 2 seconds (e.g. dual keydown/submit or rapid double-click)
        const twoSecondsAgo = new Date(Date.now() - 2000);
        const existingRecentMessage = await Message.findOne({
            sender: req.user._id,
            receiver: receiverId,
            text: trimmedText,
            createdAt: { $gte: twoSecondsAgo }
        }).populate('sender', 'name email avatar role');

        if (existingRecentMessage) {
            return res.status(200).json({ success: true, message: existingRecentMessage });
        }

        const message = await Message.create({
            sender: req.user._id,
            receiver: receiverId,
            donation: donationId && mongoose.Types.ObjectId.isValid(donationId) ? donationId : undefined,
            text: trimmedText,
            read: false
        });

        // Populate sender info for immediate display
        await message.populate('sender', 'name email avatar role');

        // Emit real-time chat message via Socket.IO
        emitChatMessage({
            senderId: req.user._id.toString(),
            receiverId: receiverId.toString(),
            message
        });

        // Create notification for receiver asynchronously
        (async () => {
            try {
                await createNotification({
                    recipient: receiverId,
                    type: 'message',
                    title: `New message from ${req.user.name}`,
                    message: trimmedText.length > 80 ? trimmedText.slice(0, 77) + '...' : trimmedText,
                    link: req.user.role === 'ngo' ? '/donor/messages' : '/ngo/messages'
                });
            } catch (err) {
                console.error('Failed to create chat notification:', err.message);
            }
        })();

        res.status(201).json({ success: true, message });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get message history between current user and another user
// @route   GET /api/chat/messages/:otherUserId
// @access  Private
export const getMessages = async (req, res) => {
    try {
        const { otherUserId } = req.params;

        if (!otherUserId || !mongoose.Types.ObjectId.isValid(otherUserId)) {
            return res.status(400).json({ success: false, message: 'Invalid user ID' });
        }

        const currentUserId = req.user._id;

        // Fetch messages between the two users
        const messages = await Message.find({
            $or: [
                { sender: currentUserId, receiver: otherUserId },
                { sender: otherUserId, receiver: currentUserId }
            ]
        })
            .sort({ createdAt: 1 })
            .populate('sender', 'name email avatar role')
            .populate('receiver', 'name email avatar role');

        // Mark incoming unread messages as read
        await Message.updateMany(
            { sender: otherUserId, receiver: currentUserId, read: false },
            { $set: { read: true } }
        );

        res.json({ success: true, messages });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get active conversations for the current user
// @route   GET /api/chat/conversations
// @access  Private
export const getConversations = async (req, res) => {
    try {
        const currentUserId = req.user._id;

        // Find all messages involving the current user
        const messages = await Message.find({
            $or: [{ sender: currentUserId }, { receiver: currentUserId }]
        })
            .sort({ createdAt: -1 })
            .populate('sender', 'name email avatar role city phone')
            .populate('receiver', 'name email avatar role city phone');

        // Group by conversation partner
        const partnerMap = new Map();

        for (const msg of messages) {
            if (!msg.sender || !msg.receiver) continue;
            const isSender = msg.sender._id.toString() === currentUserId.toString();
            const partner = isSender ? msg.receiver : msg.sender;
            if (!partner || !partner._id) continue;
            const partnerId = partner._id.toString();

            if (!partnerMap.has(partnerId)) {
                partnerMap.set(partnerId, {
                    partner,
                    latestMessage: msg,
                    unreadCount: 0
                });
            }

            // Count unread if current user is the receiver
            if (!isSender && !msg.read) {
                const entry = partnerMap.get(partnerId);
                entry.unreadCount += 1;
            }
        }

        // PERFORMANCE OPTIMIZATION: Batch fetch NGO profiles to eliminate N+1 queries
        const partnerEntries = Array.from(partnerMap.values());
        const ngoUserIds = partnerEntries
            .filter(conv => conv.partner.role === 'ngo')
            .map(conv => conv.partner._id);

        let ngoMap = new Map();
        if (ngoUserIds.length > 0) {
            const ngos = await NGO.find({ user: { $in: ngoUserIds } })
                .select('user ngoName logo verificationStatus')
                .lean();
            for (const n of ngos) {
                ngoMap.set(n.user.toString(), n);
            }
        }

        const conversations = partnerEntries.map((conv) => {
            const ngoDetails = conv.partner.role === 'ngo' ? (ngoMap.get(conv.partner._id.toString()) || null) : null;
            return {
                partner: conv.partner,
                ngo: ngoDetails,
                latestMessage: conv.latestMessage,
                unreadCount: conv.unreadCount
            };
        });

        res.json({ success: true, conversations });
    } catch (error) {
        console.error('Get conversations error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Mark messages from a specific user as read
// @route   PUT /api/chat/read/:otherUserId
// @access  Private
export const markAsRead = async (req, res) => {
    try {
        const { otherUserId } = req.params;

        if (!otherUserId || !mongoose.Types.ObjectId.isValid(otherUserId)) {
            return res.status(400).json({ success: false, message: 'Invalid user ID' });
        }

        await Message.updateMany(
            { sender: otherUserId, receiver: req.user._id, read: false },
            { $set: { read: true } }
        );

        res.json({ success: true, message: 'Messages marked as read' });
    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get total unread messages count for current user
// @route   GET /api/chat/unread-count
// @access  Private
export const getUnreadCount = async (req, res) => {
    try {
        const count = await Message.countDocuments({
            receiver: req.user._id,
            read: false
        });
        res.json({ success: true, count });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
